import type { Scene } from './scene'

export type History = { past: Scene[]; present: Scene; future: Scene[] }
export const historyFor = (scene: Scene): History => ({ past: [], present: scene, future: [] })
export function commit(history: History, scene: Scene): History {
  if (JSON.stringify(scene) === JSON.stringify(history.present)) return history
  return { past: [...history.past, history.present].slice(-100), present: scene, future: [] }
}
export function undo(history: History): History {
  if (!history.past.length) return history
  return { past: history.past.slice(0, -1), present: history.past.at(-1)!, future: [history.present, ...history.future] }
}
export function redo(history: History): History {
  if (!history.future.length) return history
  return { past: [...history.past, history.present], present: history.future[0], future: history.future.slice(1) }
}
