'use client'

import { useEffect, useRef, useState, type PointerEvent as PE, type MouseEvent as ME } from 'react'
import { editVertex, fromBounds, fromClicks, fromPoints, hitTest, objectId, replaceObject, resizeObject, sampleStroke, unrotate, type Scene, type SceneObject, type ShapeKind } from '@/lib/editor/scene'
import type { Point2D } from '@/lib/sketches/types'
import type { SceneController } from './use-scene-history'
import { canvasClientPoint, screenTolerance, snapPixel, snapPoint } from '@/lib/editor/viewport'
export type Tool = 'select' | 'eraser' | ShapeKind
export type Mode = 'move' | 'rotate' | 'scale' | 'vertices'
export const handles: Record<string, Point2D> = { nw: { x: -1, y: -1 }, n: { x: 0, y: -1 }, ne: { x: 1, y: -1 }, e: { x: 1, y: 0 }, se: { x: 1, y: 1 }, s: { x: 0, y: 1 }, sw: { x: -1, y: 1 }, w: { x: -1, y: 0 } }
const FREEHAND_SAMPLE = 3
type Gesture = {
  pointerId: number; start: Point2D; client: Point2D; base: Scene; object?: SceneObject; handle: string
  moved: boolean; id: string; erased: Set<string>; samples: Point2D[]; svg: SVGSVGElement
}
export function useCanvasTools(state: SceneController, tool: Tool, mode: Mode, selectedId: string | null, select: (id: string | null) => void, afterCreate: () => void) {
  const [points, setPoints] = useState<Point2D[]>([])
  const pointsRef = useRef<Point2D[]>([])
  const [hover, setHover] = useState<Point2D | null>(null)
  const [error, setError] = useState('')
  const suppressClick = useRef(false)
  const clickPoint = useRef<Point2D | null>(null)
  const gesture = useRef<Gesture | null>(null)
  const toolRef = useRef(tool), modeRef = useRef(mode), selectedRef = useRef(selectedId), afterRef = useRef(afterCreate), stateRef = useRef(state), selectRef = useRef(select)
  toolRef.current = tool; modeRef.current = mode; selectedRef.current = selectedId; afterRef.current = afterCreate; stateRef.current = state; selectRef.current = select
  function updatePoints(next: Point2D[]) { pointsRef.current = next; setPoints(next) }
  function cancel() {
    if (gesture.current) suppressClick.current = true
    gesture.current = null; clickPoint.current = null; stateRef.current.cancel(); updatePoints([]); setHover(null); setError('')
  }
  function add(object: SceneObject) {
    const scene = stateRef.current.current()
    stateRef.current.commit({ ...scene, objects: [...scene.objects, object] })
    selectRef.current(object.id); updatePoints([]); setHover(null); setError(''); afterRef.current()
  }
  function finish() {
    const p = pointsRef.current
    if (p.length < 2 || !p.some(v => Math.hypot(v.x - p[0].x, v.y - p[0].y) > 1e-6)) { setError('Two distinct points required.'); return }
    add(fromPoints('polyline', p))
  }
  function pointFor(event: { clientX: number; clientY: number }, svg: SVGSVGElement) {
    const b = svg.getBoundingClientRect(), s = stateRef.current.current()
    return snapPoint(canvasClientPoint({ x: event.clientX, y: event.clientY }, b, s))
  }
  function append(point: Point2D) {
    const current = pointsRef.current, active = toolRef.current
    if (current.length && Math.hypot(point.x - current.at(-1)!.x, point.y - current.at(-1)!.y) < 1e-6) return
    const next = [...current, point]
    if (active === 'polyline') updatePoints(next)
    else if (next.length === (active === 'triangle' ? 3 : active === 'quad' ? 4 : 2)) {
      if (active === 'line' && Math.hypot(next[0].x - next[1].x, next[0].y - next[1].y) < 1e-6) return
      add(fromClicks(active as ShapeKind, next))
    } else updatePoints(next)
  }
  function previewFreehand(g: Gesture, sampled: Point2D[]) {
    g.samples = sampled
    updatePoints(sampled)
    stateRef.current.preview({ ...g.base, objects: [...g.base.objects, { ...fromPoints('freehand', sampled, g.id) }] })
  }
  function eraseAt(g: Gesture, point: Point2D, unit: number) {
    const tolerance = screenTolerance(10, 1 / unit)
    let changed = false
    for (const object of [...g.base.objects].reverse()) {
      if (object.type !== 'freehand' || object.locked || g.erased.has(object.id)) continue
      if (!hitTest({ ...g.base, objects: [object] }, point, tolerance)) continue
      g.erased.add(object.id)
      changed = true
    }
    if (changed) {
      stateRef.current.preview({ ...g.base, objects: g.base.objects.filter(o => !g.erased.has(o.id)) })
      if (selectedRef.current && g.erased.has(selectedRef.current)) selectRef.current(null)
    }
  }
  useEffect(() => {
    function endWindowGesture(event: PointerEvent, canceled = false) {
      const g = gesture.current
      if (!g || g.pointerId !== event.pointerId) return
      const active = toolRef.current
      clickPoint.current = pointFor(event, g.svg)
      gesture.current = null
      if (canceled) { stateRef.current.cancel(); updatePoints([]); suppressClick.current = true; return }
      if (active === 'eraser') {
        suppressClick.current = true
        if (g.erased.size) stateRef.current.commit()
        else stateRef.current.cancel()
        updatePoints([])
        return
      }
      if (active === 'freehand') {
        suppressClick.current = true
        const sampled = sampleStroke(g.samples.length ? g.samples : [g.start], clickPoint.current, FREEHAND_SAMPLE)
        const object = fromPoints('freehand', sampled, g.id)
        stateRef.current.commit({ ...g.base, objects: [...g.base.objects, object] })
        selectRef.current(object.id); updatePoints([]); setHover(null); setError(''); afterRef.current()
      }
    }
    function move(event: PointerEvent) {
      const g = gesture.current, active = toolRef.current
      if (!g || g.pointerId !== event.pointerId || (active !== 'freehand' && active !== 'eraser')) return
      const point = pointFor(event, g.svg)
      setHover(point)
      if (!g.moved && Math.hypot(event.clientX - g.client.x, event.clientY - g.client.y) < 4) return
      g.moved = true
      const unit = g.base.width / g.svg.getBoundingClientRect().width
      if (active === 'eraser') { eraseAt(g, point, unit); return }
      const sampled = sampleStroke(g.samples, point, FREEHAND_SAMPLE)
      if (sampled === g.samples) return
      previewFreehand(g, sampled)
    }
    function up(event: PointerEvent) { endWindowGesture(event) }
    function cancelEvent(event: PointerEvent) { endWindowGesture(event, true) }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', cancelEvent)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', cancelEvent)
    }
  }, [])
  function pointerDown(event: PE<SVGSVGElement>) {
    if (gesture.current || event.button !== 0) return
    event.preventDefault(); event.currentTarget.focus(); stateRef.current.commit(); suppressClick.current = false; setError('')
    const start = pointFor(event, event.currentTarget), base = stateRef.current.current(), active = toolRef.current
    const handle = (event.target as Element).closest('[data-handle]')?.getAttribute('data-handle') ?? 'body'
    const unit = base.width / event.currentTarget.getBoundingClientRect().width
    if (active === 'eraser') {
      gesture.current = { pointerId: event.pointerId, start, client: { x: event.clientX, y: event.clientY }, base, handle: 'body', moved: false, id: objectId(), erased: new Set(), samples: [], svg: event.currentTarget }
      eraseAt(gesture.current, start, unit)
      return
    }
    if (active === 'freehand') {
      gesture.current = { pointerId: event.pointerId, start, client: { x: event.clientX, y: event.clientY }, base, handle: 'body', moved: false, id: objectId(), erased: new Set(), samples: [start], svg: event.currentTarget }
      previewFreehand(gesture.current, [start])
      return
    }
    const object = active === 'select' ? handle !== 'body' ? base.objects.find(o => o.id === selectedRef.current && !o.locked) : hitTest(base, start, screenTolerance(6, 1 / unit)) : undefined
    if (active === 'select') { selectRef.current(object?.id ?? null); if (!object) return }
    gesture.current = { pointerId: event.pointerId, start, client: { x: event.clientX, y: event.clientY }, base, object, handle, moved: false, id: objectId(), erased: new Set(), samples: [], svg: event.currentTarget }
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  function pointerMove(event: PE<SVGSVGElement>) {
    const active = toolRef.current
    if (active === 'freehand' || active === 'eraser') return
    const point = pointFor(event, event.currentTarget); setHover(point)
    const g = gesture.current
    if (!g || g.pointerId !== event.pointerId) return
    if (!g.moved && Math.hypot(event.clientX - g.client.x, event.clientY - g.client.y) < 4) return
    g.moved = true
    if (active !== 'select') {
      if (active === 'quad') return
      if (active === 'polyline') { if (!pointsRef.current.length) updatePoints([g.start]); return }
      const object = { ...fromBounds(active, g.start, point), id: g.id }
      stateRef.current.preview({ ...g.base, objects: [...g.base.objects, object] }); return
    }
    const o = g.object!
    let next = o
    if (g.handle.startsWith('vertex:')) next = editVertex(o, Number(g.handle.slice(7)), point)
    else if (modeRef.current === 'move') next = {
      ...o,
      x: g.handle === 'y' ? o.x : snapPixel(o.x + point.x - g.start.x),
      y: g.handle === 'x' ? o.y : snapPixel(o.y + point.y - g.start.y),
    }
    else if (modeRef.current === 'rotate') {
      const a = Math.atan2(g.start.y - o.y, g.start.x - o.x), b = Math.atan2(point.y - o.y, point.x - o.x)
      let rotation = o.rotation + Math.atan2(Math.sin(b - a), Math.cos(b - a))
      if (event.shiftKey) rotation = Math.round(rotation / (Math.PI / 12)) * Math.PI / 12
      next = { ...o, rotation }
    } else if (modeRef.current === 'scale') {
      const a = unrotate(o, g.start), b = unrotate(o, point)
      next = resizeObject(o, { x: b.x - a.x, y: b.y - a.y }, handles[g.handle] ?? handles.se, event.shiftKey)
    }
    stateRef.current.preview(replaceObject(g.base, next))
  }
  function pointerUp(event: PE<SVGSVGElement>) {
    const active = toolRef.current
    if (active === 'freehand' || active === 'eraser') return
    const g = gesture.current
    if (!g || g.pointerId !== event.pointerId) return
    clickPoint.current = pointFor(event, event.currentTarget)
    gesture.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    if (!g.moved) return
    suppressClick.current = true
    if (active === 'polyline') append(clickPoint.current)
    else if (active === 'quad') append(clickPoint.current)
    else if (active !== 'select') {
      const object = stateRef.current.current().objects.at(-1)!
      stateRef.current.commit(); selectRef.current(object.id); updatePoints([]); afterRef.current()
    } else stateRef.current.commit()
  }
  function click(event: ME<SVGSVGElement>) {
    const point = clickPoint.current ?? pointFor(event, event.currentTarget)
    clickPoint.current = null
    if (suppressClick.current) { suppressClick.current = false; return }
    if (toolRef.current === 'eraser' || toolRef.current === 'freehand') return
    if (toolRef.current !== 'select' && event.detail < 2) append(point)
  }
  return { points, hover, error, add, cancel, finish,
    events: { onPointerDown: pointerDown, onPointerMove: pointerMove, onPointerUp: pointerUp, onPointerCancel: () => { if (toolRef.current !== 'freehand' && toolRef.current !== 'eraser') cancel() },
      onLostPointerCapture: () => { if (gesture.current && toolRef.current !== 'freehand' && toolRef.current !== 'eraser') cancel() }, onClick: click,
      onDoubleClick: (event: ME<SVGSVGElement>) => { if (toolRef.current === 'polyline') { event.preventDefault(); finish() } },
      onPointerLeave: () => { if (!gesture.current) setHover(null) } } }
}
export type CanvasTools = ReturnType<typeof useCanvasTools>
