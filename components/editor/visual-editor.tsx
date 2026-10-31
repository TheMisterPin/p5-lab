'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Code2 } from 'lucide-react'
import { parseProject, projectJSON } from '@/lib/editor/project'
import { ChangeSketchButton, SketchPicker, promptSketchName } from '@/components/sketch-picker'
import { createCodeSketch, createInteractiveSketch, deleteSketch, getActiveSketch, loadCodeStore, loadInteractiveStore, renameSketch, saveCodeStore, saveInteractiveStore, setActiveSketch, updateInteractiveScene, upsertSketch } from '@/lib/sketches/storage'
import type { InteractiveSketch, SketchStore } from '@/lib/sketches/types'
import type { Scene } from '@/lib/editor/scene'
import type { History } from '@/lib/editor/history'
import { sceneToCode } from '@/lib/editor/render'
import { EditorSession } from './editor-session'

export function VisualEditor() {
  const router = useRouter()
  const file = useRef<HTMLInputElement>(null)
  const [importError, setImportError] = useState('')
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

  if (!store) return <p role="status" className="p-6 text-muted-foreground">Loading…</p>
  const active = getActiveSketch(store)

  return <section aria-label="Visual sketch editor" className="flex min-h-0 min-w-0 flex-1 flex-col">
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b px-3 py-1.5">
      <div className="flex min-w-0 items-center gap-3">
        <Code2 className="size-4 shrink-0 text-primary" />
        <div className="min-w-0">
          <h2 className="truncate text-sm font-medium">{active.name}</h2>
          <p role="status" className={`text-xs ${saved ? 'text-muted-foreground' : 'text-destructive'}`}>{saved ? 'Saved' : 'Not saved: storage unavailable'}</p>
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
    <input ref={file} type="file" accept=".json,application/json" className="hidden" aria-label="Import Project file" onChange={async e => {
      const chosen = e.currentTarget.files?.[0]
      e.currentTarget.value = ''
      if (!chosen) return
      try {
        if (chosen.size > 10 * 1024 * 1024) throw new Error('Project exceeds 10 MB.')
        const imported = parseProject(await chosen.text())
        const current = storeRef.current
        if (current) persist(upsertSketch(current, createInteractiveSketch({ name: `${imported.name} (imported)`, scene: imported.scene })))
        setImportError('')
      } catch (error) { setImportError(error instanceof Error ? error.message : 'Project import failed.') }
    }} />
    {importError && <p role="alert" className="border-b px-3 py-1 text-xs text-destructive">{importError}</p>}
    <EditorSession key={active.id} sketch={active} histories={histories.current} suspended={pickerOpen}
      onChange={scene => {
        const current = storeRef.current
        if (current) persist(updateInteractiveScene(current, active.id, scene))
      }}
      onImport={() => file.current?.click()}
      onProject={scene => {
        const url = URL.createObjectURL(new Blob([projectJSON(scene, active.name)], { type: 'application/json' }))
        const link = document.createElement('a')
        link.href = url; link.download = `${active.name.replace(/[^\w-]+/g, '-').toLowerCase() || 'sketch'}.p5lab.json`; link.click()
        window.setTimeout(() => URL.revokeObjectURL(url), 1000)
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
