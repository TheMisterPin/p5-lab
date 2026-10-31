'use client'

import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type p5 from 'p5'
import type { InteractiveSketch } from '@/lib/sketches/types'
import type { History } from '@/lib/editor/history'
import { constrained, duplicateObject, editableVertices, fromBounds, replaceObject, type Scene } from '@/lib/editor/scene'
import { downloadCode } from '@/lib/editor/download'
import { useSceneHistory } from './use-scene-history'
import { useCanvasTools, type Tool, type Mode } from './use-canvas-tools'
import { CanvasStage } from './canvas-stage'
import { Inspector } from './inspector'
import { ObjectList } from './object-list'
import { EditorToolbar, shortcutTools } from './editor-toolbar'

export function EditorSession({ sketch, histories, suspended, onChange, onExport, onProject, onImport }: {
  sketch: InteractiveSketch; histories: Map<string, History>; suspended: boolean; onChange: (scene: Scene) => void
  onExport: (scene: Scene) => boolean; onProject: (scene: Scene) => void; onImport: () => void
}) {
  const state = useSceneHistory(sketch.id, sketch.scene, histories, onChange)
  const [selectedId, select] = useState<string | null>(null)
  const [tool, setTool] = useState<Tool>('select')
  const [mode, setMode] = useState<Mode>('move')
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)
  const canvas = useRef<p5 | null>(null)
  const selected = state.scene.objects.find(o => o.id === selectedId)
  const tools = useCanvasTools(state, tool, mode, selectedId, select, () => { setTool('select'); setMode('move') })
  useEffect(() => { if (suspended) tools.cancel() }, [suspended])
  useEffect(() => { if (selected && mode === 'vertices' && !editableVertices(selected)) setMode('move') }, [selected?.id, mode])
  function changeTool(t: Tool) { state.commit(); tools.cancel(); setTool(t) }
  function changeMode(m: Mode) { changeTool('select'); setMode(m) }
  function travel(action: 'undo' | 'redo') { tools.cancel(); state[action]() }
  function keyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (suspended || event.defaultPrevented || event.nativeEvent.isComposing || (event.target as HTMLElement).closest('input, textarea, select, [contenteditable="true"], [role="dialog"]')) return
    const key = event.key.toLowerCase(), mod = event.ctrlKey || event.metaKey
    if (mod && ['z', 'y', 'd'].includes(key)) {
      event.preventDefault()
      if (key === 'd' && selected) { state.commit(); const copy = duplicateObject(state.current(), selected.id); if (copy) { state.commit(copy.scene); select(copy.id) } }
      else if (key !== 'd') travel(key === 'y' || event.shiftKey ? 'redo' : 'undo')
      return
    }
    if (mod || event.altKey) return
    if (key === 'escape') { tools.cancel(); select(null); return }
    if (key === 'enter' && tool === 'polyline') { event.preventDefault(); tools.finish(); return }
    if (key === 'v') { changeTool('select'); return }
    if (shortcutTools[key]) { changeTool(shortcutTools[key]); return }
    const modes: Record<string, Mode> = { w: 'move', e: 'rotate', r: 'scale', t: 'vertices' }
    if (modes[key] && selected && !selected.locked && (key !== 't' || editableVertices(selected))) { changeMode(modes[key]); return }
    if (!selected || selected.locked) return
    if (key === 'delete' || key === 'backspace') {
      event.preventDefault(); tools.cancel(); state.commit({ ...state.current(), objects: state.current().objects.filter(o => o.id !== selected.id) }); select(null); return
    }
    if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown'].includes(key)) {
      event.preventDefault(); state.commit(); const step = event.shiftKey ? 10 : 1
      state.commit(replaceObject(state.current(), { ...selected, x: selected.x + (key === 'arrowleft' ? -step : key === 'arrowright' ? step : 0), y: selected.y + (key === 'arrowup' ? -step : key === 'arrowdown' ? step : 0) }))
    }
  }
  return <div onKeyDown={keyDown} className="flex min-h-0 flex-1 flex-col">
    <EditorToolbar tool={tool} mode={mode} setTool={changeTool} setMode={changeMode} selected={selected} ready={ready} canUndo={!!state.history.past.length} canRedo={!!state.history.future.length} undo={() => travel('undo')} redo={() => travel('redo')}
      finish={tools.finish} canFinish={tools.points.length >= 2} addCentered={() => {
        const s = state.current(), w = Math.min(120, s.width / 2, s.height / 2), h = tool !== 'select' && constrained(tool) ? w : Math.min(90, s.height / 2)
        tools.add(fromBounds(tool === 'select' ? 'rectangle' : tool, { x: (s.width - w) / 2, y: (s.height - h) / 2 }, { x: (s.width + w) / 2, y: (s.height + h) / 2 }))
      }} png={() => { state.commit(); canvas.current?.saveCanvas('sketch', 'png') }} code={() => { state.commit(); if (!onExport(state.current())) setError('Code sketch could not be saved.') }} js={() => { state.commit(); downloadCode(state.current(), sketch.name) }} project={() => { state.commit(); onProject(state.current()) }} importProject={onImport} />
    {(error || tools.error) && <p role="alert" className="shrink-0 border-b px-3 py-1 text-xs text-destructive">{error || tools.error}</p>}
    <div className="editor-panels flex min-h-0 flex-1 flex-col lg:flex-row">
      <CanvasStage scene={state.scene} selected={selected} tools={tools} tool={tool} mode={mode} onCanvas={p => { canvas.current = p; setReady(!!p) }} />
      <aside aria-label="Properties and objects" className="editor-sidebar flex min-h-0 shrink-0 flex-col border-l bg-background lg:w-72">
        <Inspector key={selectedId ?? 'canvas'} state={state} selected={selected} vertexMode={mode === 'vertices'} />
        <ObjectList state={state} selected={selected} select={id => { state.commit(); tools.cancel(); select(id); setTool('select') }} />
      </aside>
    </div>
  </div>
}
