'use client'

import { useRef, useState, type PointerEvent as PE, type MouseEvent as ME } from 'react'
import { editVertex, fromBounds, fromClicks, fromPoints, hitTest, objectId, replaceObject, resizeObject, unrotate, type Scene, type SceneObject, type ShapeKind } from '@/lib/editor/scene'
import type { Point2D } from '@/lib/sketches/types'
import type { SceneController } from './use-scene-history'
export type Tool = 'select' | ShapeKind
export type Mode = 'move' | 'rotate' | 'scale' | 'vertices'
export const handles: Record<string, Point2D> = { nw: { x: -1, y: -1 }, n: { x: 0, y: -1 }, ne: { x: 1, y: -1 }, e: { x: 1, y: 0 }, se: { x: 1, y: 1 }, s: { x: 0, y: 1 }, sw: { x: -1, y: 1 }, w: { x: -1, y: 0 } }
export function useCanvasTools(state: SceneController, tool: Tool, mode: Mode, selectedId: string | null, select: (id: string | null) => void, afterCreate: () => void) {
  const [points, setPoints] = useState<Point2D[]>([])
  const pointsRef = useRef<Point2D[]>([])
  const [hover, setHover] = useState<Point2D | null>(null)
  const [error, setError] = useState('')
  const suppressClick = useRef(false)
  const clickPoint = useRef<Point2D | null>(null)
  const gesture = useRef<{ pointerId: number; start: Point2D; client: Point2D; base: Scene; object?: SceneObject; handle: string; moved: boolean; id: string } | null>(null)
  function updatePoints(next: Point2D[]) { pointsRef.current = next; setPoints(next) }
  function cancel() {
    if (gesture.current) suppressClick.current = true
    gesture.current = null; clickPoint.current = null; state.cancel(); updatePoints([]); setHover(null); setError('')
  }
  function add(object: SceneObject) {
    const scene = state.current()
    state.commit({ ...scene, objects: [...scene.objects, object] })
    select(object.id); updatePoints([]); setHover(null); setError(''); afterCreate()
  }
  function finish() {
    const p = pointsRef.current
    if (p.length < 2 || !p.some(v => Math.hypot(v.x - p[0].x, v.y - p[0].y) > 1e-6)) { setError('Two distinct points required.'); return }
    add(fromPoints('polyline', p))
  }
  function pointFor(event: { clientX: number; clientY: number; currentTarget: SVGSVGElement }) {
    const b = event.currentTarget.getBoundingClientRect(), s = state.current()
    return { x: (event.clientX - b.left) * s.width / b.width, y: (event.clientY - b.top) * s.height / b.height }
  }
  function append(point: Point2D) {
    const current = pointsRef.current
    if (current.length && Math.hypot(point.x - current.at(-1)!.x, point.y - current.at(-1)!.y) < 1e-6) return
    const next = [...current, point]
    if (tool === 'polyline') updatePoints(next)
    else if (next.length === (tool === 'triangle' ? 3 : tool === 'quad' ? 4 : 2)) {
      if (tool === 'line' && Math.hypot(next[0].x - next[1].x, next[0].y - next[1].y) < 1e-6) return
      add(fromClicks(tool as ShapeKind, next))
    } else updatePoints(next)
  }
  function pointerDown(event: PE<SVGSVGElement>) {
    if (gesture.current || event.button !== 0) return
    event.preventDefault(); event.currentTarget.focus(); state.commit(); suppressClick.current = false; setError('')
    const start = pointFor(event), base = state.current()
    const handle = (event.target as Element).closest('[data-handle]')?.getAttribute('data-handle') ?? 'body'
    const unit = base.width / event.currentTarget.getBoundingClientRect().width
    const object = tool === 'select' ? handle !== 'body' ? base.objects.find(o => o.id === selectedId && !o.locked) : hitTest(base, start, 6 * unit) : undefined
    if (tool === 'select') { select(object?.id ?? null); if (!object) return }
    gesture.current = { pointerId: event.pointerId, start, client: { x: event.clientX, y: event.clientY }, base, object, handle, moved: false, id: objectId() }
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  function pointerMove(event: PE<SVGSVGElement>) {
    const point = pointFor(event); setHover(point)
    const g = gesture.current
    if (!g || g.pointerId !== event.pointerId) return
    if (!g.moved && Math.hypot(event.clientX - g.client.x, event.clientY - g.client.y) < 4) return
    g.moved = true
    if (tool !== 'select') {
      if (tool === 'quad') return
      if (tool === 'polyline') { if (!pointsRef.current.length) updatePoints([g.start]); return }
      const object = { ...fromBounds(tool, g.start, point), id: g.id }
      state.preview({ ...g.base, objects: [...g.base.objects, object] }); return
    }
    const o = g.object!
    let next = o
    if (g.handle.startsWith('vertex:')) next = editVertex(o, Number(g.handle.slice(7)), point)
    else if (mode === 'move') next = { ...o, x: o.x + (g.handle === 'y' ? 0 : point.x - g.start.x), y: o.y + (g.handle === 'x' ? 0 : point.y - g.start.y) }
    else if (mode === 'rotate') {
      const a = Math.atan2(g.start.y - o.y, g.start.x - o.x), b = Math.atan2(point.y - o.y, point.x - o.x)
      let rotation = o.rotation + Math.atan2(Math.sin(b - a), Math.cos(b - a))
      if (event.shiftKey) rotation = Math.round(rotation / (Math.PI / 12)) * Math.PI / 12
      next = { ...o, rotation }
    } else if (mode === 'scale') {
      const a = unrotate(o, g.start), b = unrotate(o, point)
      next = resizeObject(o, { x: b.x - a.x, y: b.y - a.y }, handles[g.handle] ?? handles.se, event.shiftKey)
    }
    state.preview(replaceObject(g.base, next))
  }
  function pointerUp(event: PE<SVGSVGElement>) {
    const g = gesture.current
    if (!g || g.pointerId !== event.pointerId) return
    clickPoint.current = pointFor(event)
    gesture.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    if (!g.moved) return
    suppressClick.current = true
    if (tool === 'polyline') append(pointFor(event))
    else if (tool === 'quad') append(pointFor(event))
    else if (tool !== 'select') {
      const object = state.current().objects.at(-1)!
      state.commit(); select(object.id); updatePoints([]); afterCreate()
    } else state.commit()
  }
  function click(event: ME<SVGSVGElement>) {
    const point = clickPoint.current ?? pointFor(event)
    clickPoint.current = null
    if (suppressClick.current) { suppressClick.current = false; return }
    if (tool !== 'select' && event.detail < 2) append(point)
  }
  return { points, hover, error, add, cancel, finish,
    events: { onPointerDown: pointerDown, onPointerMove: pointerMove, onPointerUp: pointerUp, onPointerCancel: cancel,
      onLostPointerCapture: () => { if (gesture.current) cancel() }, onClick: click,
      onDoubleClick: (event: ME<SVGSVGElement>) => { if (tool === 'polyline') { event.preventDefault(); finish() } },
      onPointerLeave: () => { if (!gesture.current) setHover(null) } } }
}
export type CanvasTools = ReturnType<typeof useCanvasTools>
