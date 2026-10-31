import { dimensions, editableVertices, worldVertices, type SceneObject } from '@/lib/editor/scene'
import { handles, type Mode } from './use-canvas-tools'

export function SelectionOverlay({ object: o, mode, unit }: { object: SceneObject; mode: Mode; unit: number }) {
  if (!o.visible) return null
  const { width: w, height: h } = dimensions(o), u = unit, radius = Math.hypot(w, h) / 2 + 20 * u
  return <g aria-hidden="true">
    <g transform={`translate(${o.x} ${o.y}) rotate(${o.rotation * 180 / Math.PI})`}>
      <rect x={-w / 2} y={-h / 2} width={w} height={h} fill="none" stroke={o.locked ? '#777' : '#d52368'} strokeWidth={1.5 * u} strokeDasharray={`${4 * u} ${3 * u}`} pointerEvents="none" />
      {!o.locked && mode === 'scale' && Object.entries(handles).map(([name, p]) => <g key={name} data-handle={name} className={['nw', 'se'].includes(name) ? 'cursor-nwse-resize' : ['ne', 'sw'].includes(name) ? 'cursor-nesw-resize' : ['n', 's'].includes(name) ? 'cursor-ns-resize' : 'cursor-ew-resize'}>
        <rect x={p.x * w / 2 - 14 * u} y={p.y * h / 2 - 14 * u} width={28 * u} height={28 * u} fill="transparent" />
        <rect x={p.x * w / 2 - 5 * u} y={p.y * h / 2 - 5 * u} width={10 * u} height={10 * u} fill="white" stroke="#d52368" strokeWidth={2 * u} />
      </g>)}
      {!o.locked && mode === 'rotate' && <g data-handle="rotate" className="cursor-grab"><circle r={radius} fill="none" stroke="transparent" strokeWidth={28 * u} /><circle r={radius} fill="none" stroke="#d52368" strokeWidth={2 * u} /><circle cy={-radius} r={6 * u} fill="white" stroke="#d52368" strokeWidth={2 * u} /></g>}
    </g>
    {!o.locked && mode === 'vertices' && editableVertices(o) && worldVertices(o).map((p, i) => <g key={i} data-handle={`vertex:${i}`} className="cursor-crosshair"><circle cx={p.x} cy={p.y} r={14 * u} fill="transparent" /><circle cx={p.x} cy={p.y} r={5 * u} fill="white" stroke="#d52368" strokeWidth={2 * u} /></g>)}
    {!o.locked && mode === 'move' && <g transform={`translate(${o.x} ${o.y})`}>
      <g data-handle="x" className="cursor-ew-resize"><path d={`M0 0H${62 * u}`} stroke="transparent" strokeWidth={28 * u} /><path d={`M0 0H${62 * u}l${-9 * u} ${-5 * u}m${9 * u} ${5 * u}l${-9 * u} ${5 * u}`} fill="none" stroke="#c12850" strokeWidth={2.5 * u} /></g>
      <g data-handle="y" className="cursor-ns-resize"><path d={`M0 0V${-62 * u}`} stroke="transparent" strokeWidth={28 * u} /><path d={`M0 0V${-62 * u}l${-5 * u} ${9 * u}m${5 * u} ${-9 * u}l${5 * u} ${9 * u}`} fill="none" stroke="#365edb" strokeWidth={2.5 * u} /></g>
      <rect x={-5 * u} y={-5 * u} width={10 * u} height={10 * u} fill="white" stroke="#d52368" strokeWidth={2 * u} />
    </g>}
  </g>
}
