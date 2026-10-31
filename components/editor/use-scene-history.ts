'use client'

import { useRef, useState } from 'react'
import { commit, historyFor, redo, undo, type History } from '@/lib/editor/history'
import type { Scene } from '@/lib/editor/scene'

export function useSceneHistory(id: string, initial: Scene, histories: Map<string, History>, onChange: (scene: Scene) => void) {
  const [history, setHistory] = useState(() => histories.get(id) ?? historyFor(initial))
  const historyRef = useRef(history)
  const [previewScene, setPreview] = useState<Scene | null>(null)
  const previewRef = useRef<Scene | null>(null)
  function apply(next: History) {
    if (next === historyRef.current) return
    historyRef.current = next; histories.set(id, next); setHistory(next); onChange(next.present)
  }
  function cancel() { previewRef.current = null; setPreview(null) }
  function finish(scene = previewRef.current ?? historyRef.current.present) {
    cancel(); apply(commit(historyRef.current, scene))
  }
  return {
    scene: previewScene ?? history.present, history, current: () => previewRef.current ?? historyRef.current.present,
    preview: (scene: Scene) => { previewRef.current = scene; setPreview(scene) }, cancel, commit: finish,
    undo: () => { cancel(); apply(undo(historyRef.current)) }, redo: () => { cancel(); apply(redo(historyRef.current)) },
  }
}
export type SceneController = ReturnType<typeof useSceneHistory>
