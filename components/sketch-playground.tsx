'use client'

import { useEffect, useRef, useState } from 'react'
import type p5 from 'p5'
import { Code2, Download, Pause, Play, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { VisualEditor } from '@/components/editor/visual-editor'
import { createSketch, type SketchControls } from '@/lib/sketch'

export function SketchPlayground({ drawingEnabled = true }: { drawingEnabled?: boolean }) {
  return drawingEnabled ? <VisualEditor /> : <RibbonPlayground />
}

function RibbonPlayground() {
  const host = useRef<HTMLDivElement>(null)
  const instance = useRef<p5 | null>(null)
  const controls = useRef<SketchControls>({ paused: false, reset: false, tool: 'pointer', drawingEnabled: false })
  const [paused, setPaused] = useState(false)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    let disposed = false
    let sketch: p5 | undefined
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    controls.current.paused = reducedMotion
    setPaused(reducedMotion)
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
    return () => { disposed = true; sketch?.remove(); instance.current = null }
  }, [])

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

  return (
    <section aria-label="Sketch playground" className="flex min-h-0 flex-col">
      <div className="overflow-hidden rounded-xl border bg-card text-card-foreground">
        <div className="flex items-center justify-between border-b px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2 text-sm font-medium"><Code2 className="size-4 text-muted-foreground" /> sketch.ts</div>
          <div className="flex items-center gap-2 font-mono text-sm text-muted-foreground" aria-live="polite">
            <span className="size-1.5 rounded-full bg-primary" />
            {error ? 'Load failed' : !ready ? 'Loading' : paused ? 'Paused' : 'Running'}
          </div>
        </div>
        <div className="relative aspect-[5/4] w-full">
          <div ref={host} className="sketch-canvas size-full" />
          {!ready && <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground" role="status">{error ? 'Canvas load failed.' : 'Loading…'}</div>}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-y-3 border-t px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2">
            <Button onClick={togglePlayback} disabled={!ready} size="lg">{paused ? <Play data-icon="inline-start" /> : <Pause data-icon="inline-start" />}{paused ? 'Play' : 'Pause'}</Button>
            <Button variant="ghost" size="lg" onClick={reset} disabled={!ready}><RotateCcw data-icon="inline-start" />Reset</Button>
          </div>
          <Button variant="outline" size="lg" disabled={!ready} onClick={() => instance.current?.saveCanvas('ribbon-study', 'png')}><Download data-icon="inline-start" />Save PNG</Button>
        </div>
      </div>
    </section>
  )
}
