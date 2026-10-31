'use client'

import { useEffect, useId, useRef, useState, type PointerEvent as ReactPointerEvent, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import type p5 from 'p5'
import { Circle, Code2, Download, Move, MousePointer2, Redo2, RotateCw, Scaling, Square, Trash2, Triangle, Undo2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { commit, historyFor, redo, undo, type History } from '@/lib/editor/history'
import { fromBounds, fromClicks, hitTest, localPoint, objectId, replaceObject, resizeObject, type Scene, type SceneObject, type ShapeKind } from '@/lib/editor/scene'
import type { InteractiveSketch, Point2D } from '@/lib/sketches/types'
import { SceneCanvas } from './scene-canvas'
import { downloadCode } from '@/lib/editor/download'

type Tool = 'select' | ShapeKind
type Mode = 'move' | 'rotate' | 'scale'
type Gesture = {
  pointerId: number; start: Point2D; client: Point2D; base: Scene; moved: boolean
  kind: 'create' | 'transform'; object?: SceneObject; handle: string; id: string
}
const handles: Record<string, Point2D> = {
  nw: { x: -1, y: -1 }, n: { x: 0, y: -1 }, ne: { x: 1, y: -1 },
  e: { x: 1, y: 0 }, se: { x: 1, y: 1 }, s: { x: 0, y: 1 }, sw: { x: -1, y: 1 }, w: { x: -1, y: 0 },
}
const instruction: Record<Tool, string> = {
  select: 'Click a shape to select it. Drag to move, or use the transform handles.',
  triangle: 'Drag a triangle, or click three vertices.',
  rectangle: 'Drag a rectangle, or click two opposite corners.',
  ellipse: 'Drag an ellipse, or click its center then a corner to set its radii.',
}

export function EditorSession({ sketch, histories, suspended, onChange, onExport }: {
  sketch: InteractiveSketch; histories: Map<string, History>; suspended: boolean
  onChange: (scene: Scene) => void; onExport: (scene: Scene) => boolean
}) {
  const [history, setHistory] = useState(() => histories.get(sketch.id) ?? historyFor(sketch.scene))
  const historyRef = useRef(history)
  const [preview, setPreview] = useState<Scene | null>(null)
  const previewRef = useRef<Scene | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [tool, setTool] = useState<Tool>('select')
  const [mode, setMode] = useState<Mode>('move')
  const [points, setPoints] = useState<Point2D[]>([])
  const [hover, setHover] = useState<Point2D | null>(null)
  const [status, setStatus] = useState('Choose a shape to begin.')
  const [exportError, setExportError] = useState(false)
  const [ready, setReady] = useState(false)
  const [unit, setUnit] = useState(1)
  const canvas = useRef<p5 | null>(null)
  const surface = useRef<SVGSVGElement>(null)
  const gesture = useRef<Gesture | null>(null)
  const scene = preview ?? history.present
  const selected = scene.objects.find(o => o.id === selectedId)

  useEffect(() => {
    const svg = surface.current
    if (!svg) return
    const observer = new ResizeObserver(() => setUnit(scene.width / Math.max(1, svg.getBoundingClientRect().width)))
    observer.observe(svg)
    return () => observer.disconnect()
  }, [scene.width])

  function showPreview(next: Scene | null) { previewRef.current = next; setPreview(next) }
  function cancel() {
    gesture.current = null
    showPreview(null)
    setPoints([])
    setHover(null)
  }
  useEffect(() => { if (suspended) cancel() }, [suspended]) // A sketch picker must not leave an active drag behind.

  function apply(next: History) {
    if (next === historyRef.current) return
    historyRef.current = next
    histories.set(sketch.id, next)
    setHistory(next)
    onChange(next.present)
    if (!next.present.objects.some(o => o.id === selectedId)) setSelectedId(null)
  }
  function saveScene(next: Scene) { apply(commit(historyRef.current, next)) }
  function changeTool(next: Tool) {
    cancel(); setTool(next)
    setStatus(instruction[next])
  }
  function changeMode(next: Mode) {
    changeTool('select'); setMode(next)
    setStatus(`${next[0].toUpperCase() + next.slice(1)} tool. ${next === 'rotate' ? 'Drag the ring; Shift snaps to 15°.' : next === 'scale' ? 'Drag a handle; Shift locks the aspect ratio.' : 'Drag the shape or an axis handle.'}`)
  }
  function add(object: SceneObject) {
    saveScene({ ...historyRef.current.present, objects: [...historyRef.current.present.objects, object] })
    setSelectedId(object.id); setTool('select'); setMode('move'); setPoints([]); setHover(null)
    setStatus(`${object.type} added. Move it with the handles or arrow keys.`)
  }
  function removeSelected() {
    if (!selectedId) return
    cancel()
    saveScene({ ...historyRef.current.present, objects: historyRef.current.present.objects.filter(o => o.id !== selectedId) })
    setSelectedId(null); setStatus('Shape deleted. Undo to restore it.')
  }
  function travel(direction: 'undo' | 'redo') {
    cancel(); apply((direction === 'undo' ? undo : redo)(historyRef.current)); setStatus(direction === 'undo' ? 'Undid last edit.' : 'Redid edit.')
  }
  function pointFor(event: ReactPointerEvent<SVGSVGElement>): Point2D {
    const bounds = event.currentTarget.getBoundingClientRect()
    return { x: (event.clientX - bounds.left) * scene.width / bounds.width, y: (event.clientY - bounds.top) * scene.height / bounds.height }
  }
  function pointerDown(event: ReactPointerEvent<SVGSVGElement>) {
    if (!ready || suspended || gesture.current || event.button !== 0) return
    event.preventDefault()
    event.currentTarget.focus()
    const point = pointFor(event), base = historyRef.current.present
    const handle = (event.target as Element).closest('[data-handle]')?.getAttribute('data-handle') ?? 'body'
    let object: SceneObject | undefined
    if (tool === 'select') {
      object = handle !== 'body' ? base.objects.find(o => o.id === selectedId) : hitTest(base, point)
      setSelectedId(object?.id ?? null)
      if (!object) return
    }
    gesture.current = { pointerId: event.pointerId, start: point, client: { x: event.clientX, y: event.clientY }, base, moved: false,
      kind: tool === 'select' ? 'transform' : 'create', object, handle, id: objectId() }
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  function pointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    const point = pointFor(event)
    setHover(point)
    const g = gesture.current
    if (!g || g.pointerId !== event.pointerId) return
    if (!g.moved && Math.hypot(event.clientX - g.client.x, event.clientY - g.client.y) < 4) return
    g.moved = true
    if (g.kind === 'create') {
      setPoints([])
      const object = { ...fromBounds(tool as ShapeKind, g.start, point), id: g.id }
      showPreview({ ...g.base, objects: [...g.base.objects, object] })
      return
    }
    const object = g.object!
    let next = object
    if (mode === 'move') {
      next = { ...object, x: object.x + (g.handle === 'y' ? 0 : point.x - g.start.x), y: object.y + (g.handle === 'x' ? 0 : point.y - g.start.y) }
    } else if (mode === 'rotate') {
      const initial = Math.atan2(g.start.y - object.y, g.start.x - object.x)
      const current = Math.atan2(point.y - object.y, point.x - object.x)
      const delta = Math.atan2(Math.sin(current - initial), Math.cos(current - initial))
      let rotation = object.rotation + delta
      if (event.shiftKey) rotation = Math.round(rotation / (Math.PI / 12)) * (Math.PI / 12)
      next = { ...object, rotation }
    } else {
      const a = localPoint(object, g.start), b = localPoint(object, point)
      next = resizeObject(object, { x: b.x - a.x, y: b.y - a.y }, handles[g.handle] ?? handles.se, event.shiftKey)
    }
    showPreview(replaceObject(g.base, next))
  }
  function pointerUp(event: ReactPointerEvent<SVGSVGElement>) {
    const g = gesture.current
    if (!g || g.pointerId !== event.pointerId) return
    gesture.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    const next = previewRef.current
    showPreview(null)
    if (g.moved && next) {
      if (g.kind === 'create') add(next.objects.at(-1)!)
      else { saveScene(next); setStatus('Transform applied.') }
    } else if (g.kind === 'create') {
      const nextPoints = [...points, g.start]
      if (nextPoints.length === (tool === 'triangle' ? 3 : 2)) add(fromClicks(tool as ShapeKind, nextPoints))
      else { setPoints(nextPoints); setStatus(`${nextPoints.length} / ${tool === 'triangle' ? 3 : 2} points placed.`) }
    }
  }

  function keyDown(event: ReactKeyboardEvent<HTMLElement>) {
    if (suspended || event.defaultPrevented || event.nativeEvent.isComposing || (event.target as HTMLElement).closest('input, textarea, select, [contenteditable="true"], [role="dialog"]')) return
    const key = event.key.toLowerCase(), modifier = event.ctrlKey || event.metaKey
    if (modifier && (key === 'z' || key === 'y')) {
      event.preventDefault(); travel(key === 'y' || event.shiftKey ? 'redo' : 'undo'); return
    }
    if (modifier || event.altKey) return
    if (key === 'escape') { event.preventDefault(); cancel(); setSelectedId(null); setStatus('Selection and pending action cleared.'); return }
    if (key === 'delete' || key === 'backspace') { if (selectedId) { event.preventDefault(); removeSelected() }; return }
    const modes: Record<string, Mode> = { w: 'move', e: 'rotate', r: 'scale' }
    const tools: Record<string, Tool> = { v: 'select', '1': 'triangle', '2': 'rectangle', '3': 'ellipse' }
    if (modes[key]) { event.preventDefault(); changeMode(modes[key]); return }
    if (tools[key]) { event.preventDefault(); changeTool(tools[key]); return }
    if (selected && ['arrowleft', 'arrowright', 'arrowup', 'arrowdown'].includes(key)) {
      event.preventDefault(); cancel()
      const step = event.shiftKey ? 10 : 1
      saveScene(replaceObject(historyRef.current.present, { ...selected, x: selected.x + (key === 'arrowleft' ? -step : key === 'arrowright' ? step : 0), y: selected.y + (key === 'arrowup' ? -step : key === 'arrowdown' ? step : 0) }))
    }
  }

  const transform = selected ? `translate(${selected.x} ${selected.y}) rotate(${selected.rotation * 180 / Math.PI})` : ''
  const radius = selected ? Math.hypot(selected.width, selected.height) / 2 + 20 * unit : 0
  return <div onKeyDown={keyDown} className="flex min-w-0 flex-col gap-3">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <ToggleGroup aria-label="Creation tools" variant="outline" value={[tool]} disabled={!ready} onValueChange={values => { if (values[0]) changeTool(values[0] as Tool) }} className="flex-wrap">
        <ToggleGroupItem value="select" title="Select (V)"><MousePointer2 className="size-4" />Select <kbd>V</kbd></ToggleGroupItem>
        <ToggleGroupItem value="triangle" title="Triangle (1)"><Triangle className="size-4" />Triangle <kbd>1</kbd></ToggleGroupItem>
        <ToggleGroupItem value="rectangle" title="Rectangle (2)"><Square className="size-4" />Rectangle <kbd>2</kbd></ToggleGroupItem>
        <ToggleGroupItem value="ellipse" title="Ellipse (3)"><Circle className="size-4" />Ellipse <kbd>3</kbd></ToggleGroupItem>
      </ToggleGroup>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" disabled={!history.past.length} onClick={() => travel('undo')} aria-label="Undo (Ctrl or Command Z)" title="Undo (Ctrl/⌘ Z)"><Undo2 />Undo</Button>
        <Button variant="outline" disabled={!history.future.length} onClick={() => travel('redo')} aria-label="Redo (Ctrl or Command Shift Z)" title="Redo (Ctrl/⌘ Shift Z)"><Redo2 />Redo</Button>
        <Button disabled={!ready || !!preview} onClick={() => { cancel(); setExportError(!onExport(historyRef.current.present)) }}><Code2 />Open in code editor</Button>
      </div>
    </div>
    {exportError && <p role="alert" className="rounded-lg border border-destructive/30 p-3 text-sm text-destructive">The new code sketch could not be saved. Your existing code is unchanged. Use Download JS below to keep this export.</p>}
    <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_15rem]">
      <div className="min-w-0 overflow-hidden rounded-xl border bg-card">
        <div className="flex min-h-14 flex-wrap items-center justify-between gap-2 border-b px-3 py-2">
          {selected ? <ToggleGroup aria-label="Transform tools" variant="outline" value={[mode]} onValueChange={values => { if (values[0]) changeMode(values[0] as Mode) }}>
            <ToggleGroupItem value="move" title="Move (W)"><Move className="size-4" />Move <kbd>W</kbd></ToggleGroupItem>
            <ToggleGroupItem value="rotate" title="Rotate (E)"><RotateCw className="size-4" />Rotate <kbd>E</kbd></ToggleGroupItem>
            <ToggleGroupItem value="scale" title="Scale (R)"><Scaling className="size-4" />Scale <kbd>R</kbd></ToggleGroupItem>
          </ToggleGroup> : <span className="text-sm text-muted-foreground">{tool === 'select' ? 'Select a shape to transform it' : `Create ${tool}`}</span>}
          <span className="font-mono text-xs text-muted-foreground">{scene.width} × {scene.height}</span>
        </div>
        <div className="relative w-full" style={{ aspectRatio: `${scene.width}/${scene.height}` }}>
          <SceneCanvas scene={scene} onCanvas={p => { canvas.current = p; setReady(!!p) }} />
          <svg ref={surface} viewBox={`0 0 ${scene.width} ${scene.height}`} tabIndex={0} role="group" aria-label="Canvas editing surface" aria-describedby="canvas-instructions"
            className={`absolute inset-0 size-full touch-none outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary ${tool !== 'select' ? 'cursor-crosshair' : selected ? 'cursor-move' : 'cursor-default'}`}
            onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={cancel}
            onLostPointerCapture={() => { if (gesture.current) cancel() }} onPointerLeave={() => { if (!gesture.current) setHover(null) }}>
            {points.length > 0 && <g pointerEvents="none" aria-hidden="true">
              <polyline points={[...points, ...(hover ? [hover] : [])].map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke="#d52368" strokeWidth={unit} strokeDasharray={`${4 * unit} ${4 * unit}`} />
              {points.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={4 * unit} fill="#d52368" />)}
            </g>}
            {selected && tool === 'select' && <g transform={transform} aria-hidden="true">
              <rect x={-selected.width / 2} y={-selected.height / 2} width={selected.width} height={selected.height} fill="none" stroke="#d52368" strokeWidth={1.5 * unit} strokeDasharray={`${5 * unit} ${3 * unit}`} pointerEvents="none" />
              {mode === 'scale' && Object.entries(handles).map(([name, h]) => <g key={name} data-handle={name} className="cursor-crosshair">
                <rect x={h.x * selected.width / 2 - 14 * unit} y={h.y * selected.height / 2 - 14 * unit} width={28 * unit} height={28 * unit} fill="transparent" />
                <rect x={h.x * selected.width / 2 - 6 * unit} y={h.y * selected.height / 2 - 6 * unit} width={12 * unit} height={12 * unit} fill="white" stroke="#d52368" strokeWidth={2 * unit} />
              </g>)}
              {mode === 'rotate' && <>
                <circle data-handle="rotate" r={radius} fill="none" stroke="transparent" strokeWidth={28 * unit} className="cursor-grab" />
                <circle r={radius} fill="none" stroke="#d52368" strokeWidth={2 * unit} pointerEvents="none" />
                <circle data-handle="rotate" cy={-radius} r={7 * unit} fill="white" stroke="#d52368" strokeWidth={2 * unit} className="cursor-grab" />
              </>}
            </g>}
            {selected && tool === 'select' && mode === 'move' && <g transform={`translate(${selected.x} ${selected.y})`} aria-hidden="true">
              <g data-handle="x" className="cursor-ew-resize"><path d={`M 0 0 H ${62 * unit}`} stroke="transparent" strokeWidth={28 * unit} /><path d={`M 0 0 H ${62 * unit} l ${-9 * unit} ${-5 * unit} m ${9 * unit} ${5 * unit} l ${-9 * unit} ${5 * unit}`} fill="none" stroke="#c12850" strokeWidth={2.5 * unit} /></g>
              <g data-handle="y" className="cursor-ns-resize"><path d={`M 0 0 V ${-62 * unit}`} stroke="transparent" strokeWidth={28 * unit} /><path d={`M 0 0 V ${-62 * unit} l ${-5 * unit} ${9 * unit} m ${5 * unit} ${-9 * unit} l ${5 * unit} ${9 * unit}`} fill="none" stroke="#365edb" strokeWidth={2.5 * unit} /></g>
              <rect x={-5 * unit} y={-5 * unit} width={10 * unit} height={10 * unit} fill="white" stroke="#d52368" strokeWidth={2 * unit} />
            </g>}
          </svg>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t px-3 py-2">
          <p id="canvas-instructions" className="max-w-xl text-xs leading-5 text-muted-foreground">{instruction[tool]}{tool !== 'select' && points.length > 0 ? ` ${points.length} / ${tool === 'triangle' ? 3 : 2} points.` : ''}</p>
          <Button variant="ghost" disabled={!ready} onClick={() => canvas.current?.saveCanvas('my-sketch', 'png')}><Download />Save PNG</Button>
        </div>
      </div>
      <aside aria-label="Shape inspector" className="flex min-w-0 flex-col gap-4">
        <section className="rounded-xl border p-4">
          <h3 className="mb-3 text-sm font-medium">{selected ? `${selected.type[0].toUpperCase() + selected.type.slice(1)} properties` : 'Inspector'}</h3>
          {selected ? <>
            <p className="mb-3 text-xs text-muted-foreground">Position uses the shape’s center.</p>
            <div className="grid grid-cols-2 gap-3">
              {(['x', 'y', 'width', 'height', 'rotation'] as const).map(field => <NumericField key={`${selected.id}-${field}`} label={{ x: 'X', y: 'Y', width: 'Width', height: 'Height', rotation: 'Rotation (°)' }[field]}
                value={field === 'rotation' ? selected.rotation * 180 / Math.PI : selected[field]} minimum={field === 'width' || field === 'height' ? 1 : undefined}
                onCommit={value => {
                  cancel()
                  const current = historyRef.current.present.objects.find(o => o.id === selected.id)
                  if (current) saveScene(replaceObject(historyRef.current.present, { ...current, [field]: field === 'rotation' ? value * Math.PI / 180 : value }))
                }} />)}
            </div>
            <Button variant="destructive" className="mt-4 w-full" onClick={removeSelected}><Trash2 />Delete shape <kbd>Del</kbd></Button>
          </> : <p className="text-sm leading-6 text-muted-foreground">Select a shape on the canvas or in the objects list to edit its properties.</p>}
          {tool !== 'select' && <Button variant="outline" className="mt-4 w-full" disabled={!ready} onClick={() => add(fromBounds(tool, { x: 340, y: 275 }, { x: 460, y: 365 }))}>Add centered {tool}</Button>}
        </section>
        <section className="overflow-hidden rounded-xl border">
          <h3 className="border-b px-4 py-3 text-sm font-medium">Objects <span className="font-mono text-muted-foreground">{scene.objects.length}</span></h3>
          <ul aria-label="Scene objects" className="max-h-60 overflow-auto p-2">
            {scene.objects.length === 0 ? <li className="p-2 text-xs leading-5 text-muted-foreground">Your canvas is empty. Choose a shape and drag to draw.</li> : scene.objects.map((o, i) => <li key={o.id}><button type="button" aria-pressed={o.id === selectedId} className={`flex min-h-9 w-full items-center justify-between rounded-md px-2 text-left text-sm capitalize focus-visible:outline-2 focus-visible:outline-ring ${o.id === selectedId ? 'bg-primary/10 text-primary' : 'hover:bg-muted'}`} onClick={() => { cancel(); setTool('select'); setSelectedId(o.id); setStatus(`${o.type} ${i + 1} selected.`) }}><span>{o.type} {i + 1}</span><span className="text-xs">{o.id === selectedId ? 'Selected' : ''}</span></button></li>)}
          </ul>
        </section>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => downloadCode(historyRef.current.present, sketch.name)}><Download />Download JS</Button>
          <Button variant="ghost" disabled={!scene.objects.length} onClick={() => { cancel(); saveScene({ ...historyRef.current.present, objects: [] }); setStatus('Canvas cleared. Undo to restore shapes.') }}>Clear canvas</Button>
        </div>
      </aside>
    </div>
    <p role="status" className="min-h-5 text-sm text-muted-foreground">{status}</p>
    <details className="rounded-lg border px-4 py-3 text-xs leading-6 text-muted-foreground">
      <summary className="cursor-pointer text-sm font-medium text-foreground">Keyboard shortcuts &amp; tips</summary>
      <p className="mt-2">V Select · W Move · E Rotate · R Scale · 1 Triangle · 2 Rectangle · 3 Ellipse</p>
      <p>Arrow keys: move 1 px · Shift + arrows: 10 px · Delete / Backspace: delete · Escape: cancel</p>
      <p>Ctrl / ⌘ + Z: undo · Ctrl / ⌘ + Shift + Z or Ctrl + Y: redo · Shift: snap rotation / preserve resize ratio</p>
      <p>Use Add centered to create without dragging, then select objects in the list and edit their numeric properties. Opening in code creates a separate sketch; later code edits do not change this canvas.</p>
    </details>
  </div>
}

function NumericField({ label, value, minimum, onCommit }: { label: string; value: number; minimum?: number; onCommit: (value: number) => void }) {
  const errorId = useId()
  const [draft, setDraft] = useState(String(Number(value.toFixed(2))))
  const [invalid, setInvalid] = useState(false)
  const dirty = useRef(false)
  useEffect(() => { setDraft(String(Number(value.toFixed(2)))); setInvalid(false); dirty.current = false }, [value])
  function finish() {
    if (!dirty.current) return
    const next = Number(draft)
    if (!draft.trim() || !Number.isFinite(next) || (minimum !== undefined && next < minimum)) { setInvalid(true); return }
    setInvalid(false)
    dirty.current = false
    if (next !== value) onCommit(next)
  }
  return <label className="flex min-w-0 flex-col gap-1 text-xs text-muted-foreground">{label}
    <input type="number" step="any" min={minimum} value={draft} aria-label={label} aria-invalid={invalid} aria-describedby={invalid ? errorId : undefined} title={invalid ? `Enter a finite number${minimum !== undefined ? ` of at least ${minimum}` : ''}.` : undefined}
      className="h-9 min-w-0 rounded-md border bg-background px-2 font-mono text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 aria-invalid:border-destructive"
      onChange={e => { dirty.current = true; setDraft(e.target.value); setInvalid(false) }} onBlur={finish} onKeyDown={e => {
        if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur() }
        if (e.key === 'Escape') { e.stopPropagation(); dirty.current = false; setDraft(String(Number(value.toFixed(2)))); setInvalid(false) }
      }} />
    {invalid && <span id={errorId} role="alert" className="text-destructive">Enter a valid number{minimum ? ` ≥ ${minimum}` : ''}.</span>}
  </label>
}
