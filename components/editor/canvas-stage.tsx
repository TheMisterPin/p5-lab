'use client'

import { useRef } from 'react'
import { Hand, Maximize, Minus, Plus } from 'lucide-react'
import type p5 from 'p5'
import type { Scene, SceneObject } from '@/lib/editor/scene'
import { SceneCanvas } from './scene-canvas'
import { SelectionOverlay } from './selection-overlay'
import { IconButton } from './icon-button'
import { useViewport } from './use-viewport'
import type { CanvasTools, Mode, Tool } from './use-canvas-tools'

export function CanvasStage({ scene, selected, tools, mode, tool, onCanvas }: { scene: Scene; selected?: SceneObject; tools: CanvasTools; mode: Mode; tool: Tool; onCanvas: (p: p5 | null) => void }) {
  const stage = useRef<HTMLDivElement>(null)
  const viewport = useViewport(stage, scene)
  const { x, y, scale } = viewport.view
  const pan = viewport.space || viewport.panTool || viewport.panning
  return <section id="editor-canvas" role="tabpanel" aria-label="Canvas workspace" className="editor-canvas-panel flex min-h-0 min-w-0 flex-1 flex-col">
    <div className="editor-canvas-bar flex shrink-0 items-center justify-between gap-1 border-b px-2 py-0.5">
      <span className="text-xs font-medium">Canvas <span className="ml-2 font-mono text-muted-foreground">{scene.width} × {scene.height}</span></span>
      <div className="flex items-center gap-0.5" role="toolbar" aria-label="Canvas viewport">
        <IconButton label="Pan" shortcut="Space" active={viewport.panTool} onClick={viewport.togglePan}><Hand /></IconButton>
        <IconButton label="Zoom out" onClick={() => viewport.zoom(scale / 1.25)}><Minus /></IconButton>
        <output aria-label="Zoom" className="min-w-14 text-center font-mono text-xs">{Number((scale * 100).toFixed(1))}%</output>
        <IconButton label="Zoom in" onClick={() => viewport.zoom(scale * 1.25)}><Plus /></IconButton>
        <IconButton label="Fit to view" onClick={viewport.fit}><Maximize /></IconButton>
        <button type="button" title="100%" className="editor-zoom-reset rounded px-1.5 py-1 text-xs focus-visible:outline-2 focus-visible:outline-ring" onClick={() => viewport.zoom(1)}>100%</button>
      </div>
    </div>
    <div ref={stage} tabIndex={-1} data-pan={pan ? viewport.panning ? 'dragging' : 'ready' : undefined} data-zoom={scale} className="editor-stage relative min-h-0 min-w-0 flex-1 touch-none overflow-hidden outline-none" {...viewport.events}>
      <div className="editor-paper absolute left-0 top-0 origin-top-left shadow-md" style={{ width: scene.width, height: scene.height, transform: `translate(${x}px, ${y}px) scale(${scale})` }}>
        <SceneCanvas scene={scene} onCanvas={onCanvas} />
        <svg data-canvas-surface viewBox={`0 0 ${scene.width} ${scene.height}`} tabIndex={0} role="group" aria-label="Canvas" className={`absolute inset-0 size-full overflow-visible touch-none outline-none focus-visible:ring-2 focus-visible:ring-ring ${tool === 'eraser' ? 'cursor-cell' : tool !== 'select' ? 'cursor-crosshair' : selected && !selected.locked ? mode === 'rotate' ? 'cursor-grab' : mode === 'vertices' ? 'cursor-crosshair' : mode === 'scale' ? 'cursor-nwse-resize' : 'cursor-move' : 'cursor-default'}`} {...tools.events}>
          {tools.points.length > 0 && tool !== 'freehand' && <g pointerEvents="none" aria-hidden="true">
            <polyline points={[...tools.points, ...(!pan && tools.hover ? [tools.hover] : [])].map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke="#252630" strokeWidth={2} strokeDasharray={`${4 / scale} ${3 / scale}`} />
            {tools.points.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={3 / scale} fill="#252630" />)}
          </g>}
          {selected && tool === 'select' && <SelectionOverlay object={selected} mode={mode} unit={1 / scale} />}
        </svg>
      </div>
    </div>
  </section>
}
