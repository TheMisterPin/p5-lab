'use client'

import { constrained, defaultName, dimensions, editVertex, editableVertices, openShape, replaceObject, setDimension, setScale, worldVertices, type SceneObject } from '@/lib/editor/scene'
import { validCanvas } from '@/lib/editor/project'
import type { SceneController } from './use-scene-history'
import { NumberField, ColorField, inputClass } from './fields'

export function Inspector({ state, selected, vertexMode }: { state: SceneController; selected?: SceneObject; vertexMode: boolean }) {
  const transaction = { end: () => state.commit(), cancel: state.cancel }
  function update(change: (object: SceneObject) => SceneObject) {
    const scene = state.current(), current = scene.objects.find(o => o.id === selected?.id)
    if (current) state.preview(replaceObject(scene, change(current)))
  }
  const scene = state.scene
  const d = selected ? dimensions(selected) : null
  return <section aria-label="Inspector" className="editor-inspector min-h-0 flex-1 overflow-y-auto p-3">
    <h2 className="editor-section-title">Inspector</h2>
    {selected ? <>
      <label className="editor-field mb-3">Name<input aria-label="Object name" className={inputClass} maxLength={1000} value={selected.name} onChange={e => update(o => ({ ...o, name: e.target.value }))} onBlur={() => { update(o => ({ ...o, name: o.name.trim() || defaultName(o.type) })); state.commit() }} onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') { e.stopPropagation(); state.cancel() } }} /></label>
      <h3 className="editor-section-title">Geometry</h3>
      <div className="grid grid-cols-2 gap-2">
        {(['x', 'y', 'width', 'height', 'rotation', 'scaleX', 'scaleY'] as const).map(field => {
          const label = { x: 'X', y: 'Y', width: 'Width', height: 'Height', rotation: 'Rotation °', scaleX: 'Scale X %', scaleY: 'Scale Y %' }[field]
          const value = field === 'rotation' ? selected.rotation * 180 / Math.PI : field === 'scaleX' || field === 'scaleY' ? selected[field] * 100 : field === 'width' || field === 'height' ? d![field] : selected[field]
          return <NumberField key={`${selected.id}-${field}`} label={label} value={value} disabled={selected.locked || ((field === 'width' || field === 'height') && d![field] === 0)} min={field === 'scaleX' || field === 'scaleY' || field === 'width' || field === 'height' ? 0.001 : undefined} {...transaction}
            onChange={v => update(o => {
              if (field === 'width' || field === 'height') return setDimension(o, field, Math.round(v))
              if (field === 'scaleX' || field === 'scaleY') return setScale(o, field === 'scaleX' ? 'x' : 'y', v / 100)
              if (field === 'rotation') return { ...o, rotation: v * Math.PI / 180 }
              return { ...o, [field]: Math.round(v) }
            })} />
        })}
      </div>
      <label className="mt-2 flex items-center gap-2 text-xs"><input type="checkbox" aria-label="Proportional scale" checked={selected.proportional} disabled={selected.locked || constrained(selected.type)} onChange={e => { update(o => ({ ...o, proportional: e.target.checked })); state.commit() }} />Proportional</label>
      {editableVertices(selected) && vertexMode && <div className="mt-3 border-t pt-3">
        <h3 className="editor-section-title">Vertices</h3>
        {worldVertices(selected).map((p, index) => <div key={`${selected.id}-${index}`} className="mb-2 grid grid-cols-2 gap-2">
          {(['x', 'y'] as const).map(axis => <NumberField key={axis} label={`V${index + 1} ${axis.toUpperCase()}`} value={p[axis]} disabled={selected.locked} validate={v => {
            if (!openShape(selected.type)) return true
            const points = worldVertices(selected).map((p, i) => i === index ? { ...p, [axis]: Math.round(v) } : p)
            if (selected.type === 'freehand' && points.length === 1) return true
            return points.some(p => Math.hypot(p.x - points[0].x, p.y - points[0].y) >= 1e-8)
          }} {...transaction} onChange={v => update(o => editVertex(o, index, { ...worldVertices(o)[index], [axis]: Math.round(v) }))} />)}
        </div>)}
      </div>}
      <div className="mt-3 border-t pt-3">
        <h3 className="editor-section-title">Appearance</h3>
        <div className="grid grid-cols-2 gap-2">
          {!openShape(selected.type) && <>
            <label className="editor-field">Fill<select aria-label="Fill" className={inputClass} value={selected.appearance.fill.kind} onChange={e => {
              update(o => ({ ...o, appearance: { ...o.appearance, fill: e.target.value === 'none' ? { kind: 'none' } : e.target.value === 'solid' ? { kind: 'solid', color: '#dce3fa' } : o.appearance.fill } })); state.commit()
            }}><option value="solid">Solid</option><option value="none">None</option>{selected.appearance.fill.kind === 'gradient' && <option value="gradient">Legacy gradient</option>}</select></label>
            {selected.appearance.fill.kind === 'solid' && <ColorField label="Fill colour" value={selected.appearance.fill.color} end={transaction.end} onChange={color => update(o => ({ ...o, appearance: { ...o.appearance, fill: { kind: 'solid', color } } }))} />}
          </>}
          <label className="editor-field">Stroke<select aria-label="Stroke" className={inputClass} value={selected.appearance.stroke ? 'solid' : 'none'} onChange={e => { update(o => ({ ...o, appearance: { ...o.appearance, stroke: e.target.value === 'none' ? null : '#252630' } })); state.commit() }}><option value="solid">Solid</option><option value="none">None</option></select></label>
          {selected.appearance.stroke && <ColorField label="Stroke colour" value={selected.appearance.stroke} end={transaction.end} onChange={color => update(o => ({ ...o, appearance: { ...o.appearance, stroke: color } }))} />}
          <NumberField label="Stroke weight" value={selected.appearance.strokeWidth} min={0} max={1024} disabled={!selected.appearance.stroke} {...transaction} onChange={v => update(o => ({ ...o, appearance: { ...o.appearance, strokeWidth: v } }))} />
          <NumberField label="Opacity %" value={selected.appearance.opacity * 100} min={0} max={100} {...transaction} onChange={v => update(o => ({ ...o, appearance: { ...o.appearance, opacity: v / 100 } }))} />
        </div>
        <input type="range" aria-label="Opacity" className="mt-2 w-full accent-primary" min={0} max={100} value={selected.appearance.opacity * 100} onChange={e => update(o => ({ ...o, appearance: { ...o.appearance, opacity: Number(e.target.value) / 100 } }))} onPointerUp={transaction.end} onKeyUp={transaction.end} onBlur={transaction.end} onPointerCancel={state.cancel} />
      </div>
    </> : null}
    <div className={selected ? 'mt-3 border-t pt-3' : ''}>
      <h3 className="editor-section-title">Canvas</h3>
      <div className="grid grid-cols-2 gap-2">
        <NumberField label="Canvas width" value={scene.width} min={1} max={8192} validate={width => validCanvas(width, state.current().height)} {...transaction} onChange={width => { const s = state.current(); if (validCanvas(width, s.height)) state.preview({ ...s, width }) }} />
        <NumberField label="Canvas height" value={scene.height} min={1} max={8192} validate={height => validCanvas(state.current().width, height)} {...transaction} onChange={height => { const s = state.current(); if (validCanvas(s.width, height)) state.preview({ ...s, height }) }} />
        <ColorField label="Background" value={scene.background} end={transaction.end} onChange={background => state.preview({ ...state.current(), background })} />
      </div>
    </div>
  </section>
}
