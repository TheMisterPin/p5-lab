'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import type p5 from 'p5'
import type { Scene, SceneObject } from '@/lib/editor/scene'
import { SceneCanvas } from './scene-canvas'
import { SelectionOverlay } from './selection-overlay'
import type { CanvasTools, Mode, Tool } from './use-canvas-tools'

export function CanvasStage({ scene, selected, tools, mode, tool, onCanvas }: { scene: Scene; selected?: SceneObject; tools: CanvasTools; mode: Mode; tool: Tool; onCanvas: (p: p5 | null) => void }) {
  const stage = useRef<HTMLDivElement>(null)
  const [available, setAvailable] = useState({ width: 800, height: 640 })
  useEffect(() => {
    const element = stage.current
    if (!element) return
    const observer = new ResizeObserver(() => setAvailable({ width: element.clientWidth - 32, height: element.clientHeight - 32 }))
    observer.observe(element); return () => observer.disconnect()
  }, [])
  const scale = Math.max(0.0001, Math.min(available.width / scene.width, available.height / scene.height))
  return <div ref={stage} style={{ '--scene-aspect': `${scene.width} / ${scene.height}` } as CSSProperties} className="editor-stage relative flex min-h-0 min-w-0 flex-1 items-center justify-center overflow-hidden bg-muted/80">
    <div className="relative shrink-0 bg-card shadow-sm" style={{ width: scene.width * scale, height: scene.height * scale }}>
      <SceneCanvas scene={scene} onCanvas={onCanvas} />
      <svg data-canvas-surface viewBox={`0 0 ${scene.width} ${scene.height}`} tabIndex={0} role="group" aria-label="Canvas" className={`absolute inset-0 size-full touch-none outline-none focus-visible:ring-2 focus-visible:ring-ring ${tool !== 'select' ? 'cursor-crosshair' : selected && !selected.locked ? mode === 'rotate' ? 'cursor-grab' : mode === 'vertices' ? 'cursor-crosshair' : mode === 'scale' ? 'cursor-nwse-resize' : 'cursor-move' : 'cursor-default'}`} {...tools.events}>
        {tools.points.length > 0 && <g pointerEvents="none" aria-hidden="true">
          <polyline points={[...tools.points, ...(tools.hover ? [tools.hover] : [])].map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke="#252630" strokeWidth={2} strokeDasharray={`${4 / scale} ${3 / scale}`} />
          {tools.points.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={3 / scale} fill="#252630" />)}
        </g>}
        {selected && tool === 'select' && <SelectionOverlay object={selected} mode={mode} unit={1 / scale} />}
      </svg>
    </div>
  </div>
}
