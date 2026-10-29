'use client'

import { useEffect, useRef, useState } from 'react'
import type p5 from 'p5'
import { ArrowUpRight, Code2, Download, Pause, Play, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createSketch, type SketchControls } from '@/lib/sketch'

export function SketchPlayground() {
  const host = useRef<HTMLDivElement>(null)
  const instance = useRef<p5 | null>(null)
  const controls = useRef<SketchControls>({ paused: false, reset: false })
  const [paused, setPaused] = useState(false)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState(false)
  const [showSource, setShowSource] = useState(false)

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
    return () => {
      disposed = true
      sketch?.remove()
      instance.current = null
    }
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
    <section aria-label="Sketch playground" className="flex flex-col gap-5">
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
          {!ready && <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground" role="status">{error ? 'Unable to load p5.js. Please refresh to retry.' : 'Preparing your canvas…'}</div>}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-y-3 border-t px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2">
            <Button onClick={togglePlayback} disabled={!ready} size="lg">{paused ? <Play data-icon="inline-start" /> : <Pause data-icon="inline-start" />}{paused ? 'Play' : 'Pause'}</Button>
            <Button variant="ghost" size="lg" onClick={reset} disabled={!ready}><RotateCcw data-icon="inline-start" />Reset</Button>
          </div>
          <Button variant="outline" size="lg" disabled={!ready} onClick={() => instance.current?.saveCanvas('ribbon-study', 'png')}><Download data-icon="inline-start" />Save PNG</Button>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
        <p>Move your cursor. See what happens.</p>
        <span className="font-mono">2D canvas · p5.js</span>
      </div>
      <div className="mt-5 flex flex-col gap-4 rounded-xl bg-secondary p-5 text-secondary-foreground sm:mt-7 sm:p-6">
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
        </div>}
      </div>
    </section>
  )
}
