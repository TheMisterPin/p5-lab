'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Code2 } from 'lucide-react'
import { ChangeSketchButton, SketchPicker, promptSketchName } from '@/components/sketch-picker'
import { createCodeSketch, createInteractiveSketch, deleteSketch, getActiveSketch, loadCodeStore, loadInteractiveStore, renameSketch, saveCodeStore, saveInteractiveStore, setActiveSketch, updateInteractiveScene, upsertSketch } from '@/lib/sketches/storage'
import type { InteractiveSketch, SketchStore } from '@/lib/sketches/types'
import type { Scene } from '@/lib/editor/scene'
import type { History } from '@/lib/editor/history'
import { sceneToCode } from '@/lib/editor/render'
import { EditorSession } from './editor-session'

export function VisualEditor() {
  const router = useRouter()
  const [store, setStore] = useState<SketchStore<InteractiveSketch> | null>(null)
  const storeRef = useRef<SketchStore<InteractiveSketch> | null>(null)
  const histories = useRef(new Map<string, History>())
  const [saved, setSaved] = useState(true)
  const [pickerOpen, setPickerOpen] = useState(false)

  useEffect(() => {
    const loaded = loadInteractiveStore()
    storeRef.current = loaded
    setStore(loaded)
  }, [])

  function persist(next: SketchStore<InteractiveSketch>) {
    storeRef.current = next
    setStore(next)
    setSaved(saveInteractiveStore(next))
  }

  if (!store) return <p role="status" className="p-6 text-muted-foreground">Loading your canvases…</p>
  const active = getActiveSketch(store)

  return <section aria-label="Visual sketch editor" className="flex min-w-0 flex-col gap-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <Code2 className="size-5 shrink-0 text-primary" />
        <div className="min-w-0">
          <h2 className="truncate font-medium">{active.name}</h2>
          <p role="status" className={`text-xs ${saved ? 'text-muted-foreground' : 'text-destructive'}`}>{saved ? 'Autosaves in this browser' : 'Not saved — browser storage is unavailable. Download your code to keep it.'}</p>
        </div>
      </div>
      <ChangeSketchButton onClick={() => setPickerOpen(true)} />
    </div>
    <SketchPicker open={pickerOpen} onOpenChange={setPickerOpen} sketches={store.sketches} activeId={store.activeId}
      onSelect={id => { if (storeRef.current) persist(setActiveSketch(storeRef.current, id)) }}
      onCreate={() => {
        const name = promptSketchName('Untitled canvas', 'create')
        if (name !== null && storeRef.current) persist(upsertSketch(storeRef.current, createInteractiveSketch({ name })))
      }}
      onRename={id => {
        const current = storeRef.current
        const sketch = current?.sketches.find(s => s.id === id)
        if (!current || !sketch) return
        const name = promptSketchName(sketch.name, 'rename')
        if (name !== null) persist(renameSketch(current, id, name))
      }}
      onDelete={id => {
        const current = storeRef.current
        const sketch = current?.sketches.find(s => s.id === id)
        if (!current || !sketch || !window.confirm(`Delete “${sketch.name}”? This cannot be undone.`)) return
        histories.current.delete(id)
        persist(deleteSketch(current, id, () => createInteractiveSketch()))
      }} />
    <EditorSession key={active.id} sketch={active} histories={histories.current} suspended={pickerOpen}
      onChange={scene => {
        const current = storeRef.current
        if (current) persist(updateInteractiveScene(current, active.id, scene))
      }}
      onExport={scene => {
        const codeSketch = createCodeSketch({ name: `${active.name} — code`, code: sceneToCode(scene) })
        const next = upsertSketch(loadCodeStore(), codeSketch)
        if (!saveCodeStore(next)) return false
        router.push('/ide')
        return true
      }} />
  </section>
}
