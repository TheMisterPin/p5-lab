'use client'

import { useEffect, useRef, useState } from 'react'
import type p5 from 'p5'
import { ArrowUpRight, Code2, Download, Pause, Play, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ChangeSketchButton, SketchPicker, promptSketchName } from '@/components/sketch-picker'
import { createSketch, type SketchControls, type ShapeTool } from '@/lib/sketch'
import {
  createInteractiveSketch,
  deleteSketch,
  getActiveSketch,
  loadInteractiveStore,
  renameSketch,
  saveInteractiveStore,
  setActiveSketch,
  updateInteractiveShapes,
  upsertSketch,
} from '@/lib/sketches/storage'
import type { InteractiveSketch, SketchStore } from '@/lib/sketches/types'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

const toolInstructions: Record<ShapeTool, string> = {
  pointer: 'Move to see coordinates. Click to log a p5.Vector.',
  triangle: 'Click three vertices to create a triangle.',
  rectangle: 'Click the top-left, then the bottom-right corner.',
  ellipse: 'Click the center, then a corner of its bounding box to set the x/y radii.',
}

export function SketchPlayground({ drawingEnabled = true }: { drawingEnabled?: boolean }) {
  const host = useRef<HTMLDivElement>(null)
  const instance = useRef<p5 | null>(null)
  const controls = useRef<SketchControls>({ paused: false, reset: false, tool: 'pointer', drawingEnabled })
  const storeRef = useRef<SketchStore<InteractiveSketch> | null>(null)
  const [tool, setTool] = useState<ShapeTool>('pointer')
  const [progress, setProgress] = useState({ count: 0, completed: false })
  const [paused, setPaused] = useState(false)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState(false)
  const [showSource, setShowSource] = useState(false)
  const [store, setStore] = useState<SketchStore<InteractiveSketch> | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [canvasKey, setCanvasKey] = useState(0)

  useEffect(() => {
    if (!drawingEnabled) return
    const loaded = loadInteractiveStore()
    storeRef.current = loaded
    setStore(loaded)
  }, [drawingEnabled])

  const active = store ? getActiveSketch(store) : null
  const activeId = active?.id

  useEffect(() => {
    if (drawingEnabled && !activeId) return
    const initialShapes = drawingEnabled
      ? (storeRef.current ? getActiveSketch(storeRef.current).shapes : [])
      : []
    let disposed = false
    let sketch: p5 | undefined
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    controls.current.paused = drawingEnabled || reducedMotion
    controls.current.onCaptureProgress = (count, completed) => {
      if (!disposed) setProgress({ count, completed })
    }
    controls.current.initialShapes = initialShapes
    controls.current.onShapesChange = drawingEnabled
      ? shapes => {
        const current = storeRef.current
        if (!current) return
        const next = updateInteractiveShapes(current, current.activeId, shapes)
        storeRef.current = next
        saveInteractiveStore(next)
        setStore(next)
      }
      : undefined
    setPaused(drawingEnabled || reducedMotion)
    controls.current.drawingEnabled = drawingEnabled
    setReady(false)

    async function mount() {
      try {
        const { default: P5 } = await import('p5')
        if (disposed || !host.current) return
        sketch = new P5(createSketch(controls.current, () => {
          if (!disposed) setReady(true)
        }), host.current)
        instance.current = sketch
      } catch {
        if (!disposed) setError(true)
      }
    }
    void mount()
    return () => {
      disposed = true
      sketch?.remove()
      instance.current = null
    }
  }, [drawingEnabled, canvasKey, activeId])

  function persist(next: SketchStore<InteractiveSketch>, remount = false) {
    storeRef.current = next
    saveInteractiveStore(next)
    setStore(next)
    if (remount) {
      setProgress({ count: 0, completed: false })
      setTool('pointer')
      controls.current.tool = 'pointer'
      setCanvasKey(key => key + 1)
    }
  }

  function togglePlayback() {
    const next = !controls.current.paused
    controls.current.paused = next
    setPaused(next)
    if (next) instance.current?.noLoop()
    else instance.current?.loop()
  }

  function reset() {
    controls.current.reset = true
    if (controls.current.paused) instance.current?.redraw()
  }

  function handleSelect(id: string) {
    if (!store || id === store.activeId) return
    persist(setActiveSketch(store, id), true)
  }

  function handleCreate() {
    if (!store) return
    const name = promptSketchName('Untitled canvas', 'create')
    if (name === null) return
    const sketch = createInteractiveSketch({ name })
    persist(upsertSketch(store, sketch), true)
  }

  function handleRename(id: string) {
    if (!store) return
    const current = store.sketches.find(entry => entry.id === id)
    if (!current) return
    const name = promptSketchName(current.name, 'rename')
    if (name === null) return
    persist(renameSketch(store, id, name))
  }

  function handleDelete(id: string) {
    if (!store) return
    const current = store.sketches.find(entry => entry.id === id)
    if (!current) return
    if (!window.confirm(`Delete “${current.name}”? This cannot be undone.`)) return
    const remount = store.activeId === id
    persist(deleteSketch(store, id, () => createInteractiveSketch()), remount)
  }

  return (
    <section aria-label="Sketch playground" className="flex flex-col gap-5">
      {drawingEnabled && store && active && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{active.name}</p>
            <p className="text-sm text-muted-foreground">Saved in this browser</p>
          </div>
          <ChangeSketchButton onClick={() => setPickerOpen(true)} />
          <SketchPicker
            open={pickerOpen}
            onOpenChange={setPickerOpen}
            sketches={store.sketches}
            activeId={store.activeId}
            onSelect={handleSelect}
            onCreate={handleCreate}
            onRename={handleRename}
            onDelete={handleDelete}
          />
        </div>
      )}
      <div className="overflow-hidden rounded-xl border bg-card text-card-foreground">
        <div className="flex items-center justify-between border-b px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2 text-sm font-medium"><Code2 className="size-4 text-muted-foreground" /> {drawingEnabled ? (active?.name ?? 'Untitled canvas') : 'sketch.ts'}</div>
          <div className="flex items-center gap-2 font-mono text-sm text-muted-foreground" aria-live="polite">
            <span className="size-1.5 rounded-full bg-primary" />
            {error ? 'Load failed' : !ready ? 'Loading' : drawingEnabled ? 'Ready' : paused ? 'Paused' : 'Running'}
          </div>
        </div>
        {drawingEnabled && <div className="flex flex-col gap-3 border-b p-4">
          <p id="insert-shape-label" className="text-sm font-medium">Insert shape</p>
          <ToggleGroup aria-labelledby="insert-shape-label" className="flex-wrap" variant="outline" value={[tool]} disabled={!ready} onValueChange={(values) => {
            const next = values[0] as ShapeTool | undefined
            if (!next) return
            controls.current.tool = next
            setTool(next)
            setProgress({ count: 0, completed: false })
            if (controls.current.paused) void instance.current?.redraw()
          }}>
            <ToggleGroupItem value="pointer">Pointer</ToggleGroupItem>
            <ToggleGroupItem value="triangle">Triangle</ToggleGroupItem>
            <ToggleGroupItem value="rectangle">Rectangle</ToggleGroupItem>
            <ToggleGroupItem value="ellipse">Ellipse</ToggleGroupItem>
          </ToggleGroup>
          <p className="text-sm leading-6 text-muted-foreground">{toolInstructions[tool]}</p>
          {tool !== 'pointer' && <p role="status" className="font-mono text-sm">{progress.completed ? 'Shape added. Click to start another.' : `${progress.count} / ${tool === 'triangle' ? 3 : 2} points captured`}</p>}
        </div>}
        <div className="relative aspect-[5/4] w-full">
          <div ref={host} className="sketch-canvas size-full" />
          {!ready && <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground" role="status">{error ? 'Unable to load p5.js. Please refresh to retry.' : 'Preparing your canvas…'}</div>}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-y-3 border-t px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2">
            {!drawingEnabled && <Button onClick={togglePlayback} disabled={!ready} size="lg">{paused ? <Play data-icon="inline-start" /> : <Pause data-icon="inline-start" />}{paused ? 'Play' : 'Pause'}</Button>}
            <Button variant="ghost" size="lg" onClick={reset} disabled={!ready}><RotateCcw data-icon="inline-start" />Reset</Button>
          </div>
          <Button variant="outline" size="lg" disabled={!ready} onClick={() => instance.current?.saveCanvas(drawingEnabled ? 'my-sketch' : 'ribbon-study', 'png')}><Download data-icon="inline-start" />Save PNG</Button>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
        <p>{drawingEnabled ? 'Canvas coordinates: 800 × 640. Reset clears shapes.' : 'Move your cursor. See what happens.'}</p>
        <span className="font-mono">2D canvas · p5.js</span>
      </div>
      {!drawingEnabled && <div className="mt-5 flex flex-col gap-4 rounded-xl bg-secondary p-5 text-secondary-foreground sm:mt-7 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="font-medium">A little code. A lot of possibility.</h2>
            <p className="text-sm leading-6 text-muted-foreground">Your canvas is ready. Make this sketch your own.</p>
          </div>
          <Code2 className="size-5 shrink-0 text-muted-foreground" />
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Button variant="outline" onClick={() => setShowSource(!showSource)} aria-expanded={showSource} aria-controls="starter-guide">{showSource ? 'Hide starter guide' : 'Where to start'}</Button>
          <a href="https://p5js.org/reference/" target="_blank" rel="noreferrer" className="flex items-center gap-1 text-sm underline-offset-4 hover:underline">p5.js reference<ArrowUpRight className="size-4" /><span className="sr-only"> (opens in a new tab)</span></a>
        </div>
        {showSource && <div id="starter-guide" className="flex flex-col gap-3 border-t pt-4 text-sm leading-6">
          <p>Edit <code className="font-mono text-primary">lib/sketch.ts</code> to change the artwork. The sketch uses p5 instance mode, with <code className="font-mono">setup()</code> for initialization and <code className="font-mono">draw()</code> for each frame.</p>
          <p><code className="font-mono">components/sketch-playground.tsx</code> handles browser-only loading, controls, and cleanup. No global variables or server-side canvas rendering.</p>
          <p>Coordinate helpers live in <code className="font-mono">lib/utility/coordinate/mouse.ts</code>, gradient helpers in <code className="font-mono">lib/styles/gradients.ts</code>, and click collectors in <code className="font-mono">lib/shapes/</code>. Each completed shape is logged as a typed object containing real p5.Vector coordinates. Ellipses use a radius vector: x and y are the horizontal and vertical radii.</p>
        </div>}
      </div>}
      {drawingEnabled && <p className="text-sm leading-6 text-muted-foreground">Shapes autosave to this browser. Use Change sketch to switch, create, rename, or delete canvases.</p>}
    </section>
  )
}
