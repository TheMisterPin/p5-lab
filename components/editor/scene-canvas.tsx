'use client'

import { useEffect, useRef, useState } from 'react'
import type p5 from 'p5'
import type { Scene } from '@/lib/editor/scene'
import { drawScene } from '@/lib/editor/render'

export function SceneCanvas({ scene, onCanvas }: { scene: Scene; onCanvas: (p: p5 | null) => void }) {
  const host = useRef<HTMLDivElement>(null)
  const instance = useRef<p5 | null>(null)
  const latest = useRef(scene)
  const callback = useRef(onCanvas)
  const [error, setError] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    latest.current = scene
    const p = instance.current
    if (p && (p.width !== scene.width || p.height !== scene.height)) p.resizeCanvas(scene.width, scene.height, true)
    void p?.redraw()
  }, [scene])
  useEffect(() => { callback.current = onCanvas }, [onCanvas])
  useEffect(() => {
    let disposed = false
    let sketch: p5 | undefined
    async function mount() {
      try {
        const { default: P5 } = await import('p5')
        if (disposed || !host.current) return
        sketch = new P5(p => {
          p.setup = () => {
            const canvas = p.createCanvas(latest.current.width, latest.current.height)
            canvas.attribute('role', 'img')
            canvas.attribute('aria-label', 'Sketch artwork')
            p.pixelDensity(Math.min(window.devicePixelRatio || 1, 2))
            p.noLoop()
            setReady(true)
          }
          p.draw = () => drawScene(p, latest.current)
        }, host.current)
        instance.current = sketch
        callback.current(sketch)
      } catch { if (!disposed) setError(true) }
    }
    void mount()
    return () => { disposed = true; sketch?.remove(); instance.current = null; callback.current(null) }
  }, [])

  return <>
    <div ref={host} className="sketch-canvas pointer-events-none absolute inset-0" />
    {!ready && <p role="status" className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">{error ? 'Canvas load failed.' : 'Loading…'}</p>}
  </>
}
