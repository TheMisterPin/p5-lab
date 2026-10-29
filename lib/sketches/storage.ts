import { ribbonExample } from '@/lib/ide/examples'
import { isSerializedShape } from './serialize'
import type { CodeSketch, InteractiveSketch, SketchStore, StoredSketch } from './types'

export const CODE_STORAGE_KEY = 'sketchbook.ide.v1'
export const INTERACTIVE_STORAGE_KEY = 'sketchbook.interactive.v1'

function createId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `sketch-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function now() {
  return Date.now()
}

export function createCodeSketch(partial?: Partial<Pick<CodeSketch, 'name' | 'code'>>): CodeSketch {
  return {
    kind: 'code',
    id: createId(),
    name: partial?.name?.trim() || 'Untitled sketch',
    code: partial?.code ?? ribbonExample,
    updatedAt: now(),
  }
}

export function createInteractiveSketch(partial?: Partial<Pick<InteractiveSketch, 'name' | 'shapes'>>): InteractiveSketch {
  return {
    kind: 'interactive',
    id: createId(),
    name: partial?.name?.trim() || 'Untitled canvas',
    shapes: partial?.shapes ?? [],
    updatedAt: now(),
  }
}

export function defaultCodeStore(): SketchStore<CodeSketch> {
  const sketch = createCodeSketch({ name: 'Ribbon study', code: ribbonExample })
  return { version: 1, activeId: sketch.id, sketches: [sketch] }
}

export function defaultInteractiveStore(): SketchStore<InteractiveSketch> {
  const sketch = createInteractiveSketch({ name: 'Untitled canvas' })
  return { version: 1, activeId: sketch.id, sketches: [sketch] }
}

function readRaw(key: string): unknown {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw) as unknown
  } catch {
    return null
  }
}

function writeRaw(key: string, value: unknown) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Quota or private mode — ignore; the session still works in memory.
  }
}

function isMeta(value: unknown): value is { id: string; name: string; updatedAt: number } {
  if (!value || typeof value !== 'object') return false
  const item = value as Record<string, unknown>
  return typeof item.id === 'string' && item.id.length > 0
    && typeof item.name === 'string'
    && typeof item.updatedAt === 'number'
}

function parseCodeSketch(value: unknown): CodeSketch | null {
  if (!isMeta(value)) return null
  const item = value as { id: string; name: string; updatedAt: number; code?: unknown }
  if (typeof item.code !== 'string') return null
  return { kind: 'code', id: item.id, name: item.name || 'Untitled sketch', code: item.code, updatedAt: item.updatedAt }
}

function parseInteractiveSketch(value: unknown): InteractiveSketch | null {
  if (!isMeta(value)) return null
  const item = value as { id: string; name: string; updatedAt: number; shapes?: unknown }
  if (!Array.isArray(item.shapes) || !item.shapes.every(isSerializedShape)) return null
  return {
    kind: 'interactive',
    id: item.id,
    name: item.name || 'Untitled canvas',
    shapes: item.shapes,
    updatedAt: item.updatedAt,
  }
}

function parseStore<T extends StoredSketch>(
  value: unknown,
  parseSketch: (entry: unknown) => T | null,
  fallback: () => SketchStore<T>,
): SketchStore<T> {
  if (!value || typeof value !== 'object') return fallback()
  const store = value as Record<string, unknown>
  if (store.version !== 1 || !Array.isArray(store.sketches) || typeof store.activeId !== 'string') {
    return fallback()
  }
  const sketches = store.sketches.map(parseSketch).filter((sketch): sketch is T => sketch !== null)
  if (sketches.length === 0) return fallback()
  const activeId = sketches.some(sketch => sketch.id === store.activeId) ? store.activeId : sketches[0].id
  return { version: 1, activeId, sketches }
}

export function loadCodeStore(): SketchStore<CodeSketch> {
  return parseStore(readRaw(CODE_STORAGE_KEY), parseCodeSketch, defaultCodeStore)
}

export function loadInteractiveStore(): SketchStore<InteractiveSketch> {
  return parseStore(readRaw(INTERACTIVE_STORAGE_KEY), parseInteractiveSketch, defaultInteractiveStore)
}

export function saveCodeStore(store: SketchStore<CodeSketch>) {
  writeRaw(CODE_STORAGE_KEY, store)
}

export function saveInteractiveStore(store: SketchStore<InteractiveSketch>) {
  writeRaw(INTERACTIVE_STORAGE_KEY, store)
}

export function getActiveSketch<T extends StoredSketch>(store: SketchStore<T>): T {
  return store.sketches.find(sketch => sketch.id === store.activeId) ?? store.sketches[0]
}

export function upsertSketch<T extends StoredSketch>(store: SketchStore<T>, sketch: T): SketchStore<T> {
  const index = store.sketches.findIndex(entry => entry.id === sketch.id)
  const sketches = [...store.sketches]
  if (index === -1) sketches.push(sketch)
  else sketches[index] = sketch
  return { ...store, sketches, activeId: sketch.id }
}

export function setActiveSketch<T extends StoredSketch>(store: SketchStore<T>, id: string): SketchStore<T> {
  if (!store.sketches.some(sketch => sketch.id === id)) return store
  return { ...store, activeId: id }
}

export function renameSketch<T extends StoredSketch>(store: SketchStore<T>, id: string, name: string): SketchStore<T> {
  const trimmed = name.trim() || 'Untitled sketch'
  return {
    ...store,
    sketches: store.sketches.map(sketch => (
      sketch.id === id ? { ...sketch, name: trimmed, updatedAt: now() } : sketch
    )),
  }
}

export function deleteSketch<T extends StoredSketch>(store: SketchStore<T>, id: string, createReplacement: () => T): SketchStore<T> {
  const sketches = store.sketches.filter(sketch => sketch.id !== id)
  if (sketches.length === 0) {
    const replacement = createReplacement()
    return { version: 1, activeId: replacement.id, sketches: [replacement] }
  }
  const activeId = store.activeId === id ? sketches[0].id : store.activeId
  return { ...store, sketches, activeId }
}

export function updateCodeContent(store: SketchStore<CodeSketch>, id: string, code: string): SketchStore<CodeSketch> {
  return {
    ...store,
    sketches: store.sketches.map(sketch => (
      sketch.id === id ? { ...sketch, code, updatedAt: now() } : sketch
    )),
  }
}

export function updateInteractiveShapes(
  store: SketchStore<InteractiveSketch>,
  id: string,
  shapes: InteractiveSketch['shapes'],
): SketchStore<InteractiveSketch> {
  return {
    ...store,
    sketches: store.sketches.map(sketch => (
      sketch.id === id ? { ...sketch, shapes, updatedAt: now() } : sketch
    )),
  }
}
