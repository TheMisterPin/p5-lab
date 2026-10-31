import { after, test } from 'node:test'
import assert from 'node:assert/strict'
import type p5 from 'p5'
import { commit, historyFor, redo, undo } from '../lib/editor/history'
import { contains, emptyScene, fromBounds, fromClicks, hitTest, isScene, localPoint, migrateShapes, replaceObject, resizeObject, triangleFromPoints, worldPoint } from '../lib/editor/scene'
import { drawScene, sceneToCode } from '../lib/editor/render'
import { CODE_STORAGE_KEY, INTERACTIVE_STORAGE_KEY, createCodeSketch, getActiveSketch, loadCodeStore, loadInteractiveStore, saveCodeStore, saveInteractiveStore, upsertSketch } from '../lib/sketches/storage'
import type { SerializedShape } from '../lib/sketches/types'

const legacy: SerializedShape[] = [
  { type: 'triangle', vertices: [{ x: 17, y: 42 }, { x: 192, y: 72 }, { x: 62, y: 210 }] },
  { type: 'rectangle', topLeft: { x: 200, y: 80 }, bottomRight: { x: 320, y: 180 }, width: 120, height: 100 },
  { type: 'ellipse', center: { x: 400, y: 300 }, radius: { x: 80, y: 40 }, width: 160, height: 80 },
]

test('migration preserves exact freeform geometry, order, and deterministic IDs', () => {
  const scene = migrateShapes(legacy, 'saved-canvas')
  assert.deepEqual(scene, migrateShapes(legacy, 'saved-canvas'))
  assert.ok(isScene(scene))
  const triangle = scene.objects[0]
  const points = triangle.vertices!.map(v => worldPoint(triangle, { x: v.x * triangle.width, y: v.y * triangle.height }))
  assert.deepEqual(points, (legacy[0] as Extract<SerializedShape, { type: 'triangle' }>).vertices)
  assert.deepEqual(scene.objects.map(o => o.type), ['triangle', 'rectangle', 'ellipse'])
  assert.equal(scene.objects[1].x, 260)
  assert.equal(scene.objects[2].width, 160)
})

test('drag creation normalizes all drag directions; clicks retain ellipse radius semantics', () => {
  const a = fromBounds('triangle', { x: 200, y: 150 }, { x: 80, y: 50 })
  assert.deepEqual([a.x, a.y, a.width, a.height], [140, 100, 120, 100])
  assert.equal(a.vertices!.length, 3)
  const ellipse = fromClicks('ellipse', [{ x: 200, y: 200 }, { x: 240, y: 230 }])
  assert.deepEqual([ellipse.x, ellipse.y, ellipse.width, ellipse.height], [200, 200, 80, 60])
  assert.notEqual(a.id, ellipse.id)
})

test('shape-aware hit testing respects rotation, triangle winding, ellipse edges and layer order', () => {
  const rectangle = { ...fromBounds('rectangle', { x: 50, y: 75 }, { x: 150, y: 125 }), rotation: Math.PI / 2 }
  assert.equal(contains(rectangle, { x: 100, y: 145 }), true)
  assert.equal(contains(rectangle, { x: 145, y: 100 }), false)
  const ellipse = fromBounds('ellipse', { x: 50, y: 50 }, { x: 150, y: 150 })
  assert.equal(contains(ellipse, { x: 148, y: 148 }), false)
  const triangle = fromBounds('triangle', { x: 50, y: 50 }, { x: 150, y: 150 })
  assert.equal(contains(triangle, { x: 52, y: 52 }), false)
  assert.equal(contains(triangle, { x: 100, y: 100 }), true)
  const scene = { ...emptyScene(), objects: [rectangle, ellipse, triangle] }
  assert.equal(hitTest(scene, { x: 100, y: 100 })?.id, triangle.id)
})

test('rotated resize anchors the opposite corner, clamps dimensions and preserves ID', () => {
  const object = { ...fromBounds('rectangle', { x: 20, y: 50 }, { x: 120, y: 130 }), rotation: 0.8 }
  const anchor = worldPoint(object, { x: -object.width / 2, y: -object.height / 2 })
  const next = resizeObject(object, { x: 50, y: 20 }, { x: 1, y: 1 })
  const nextAnchor = worldPoint(next, { x: -next.width / 2, y: -next.height / 2 })
  assert.ok(Math.hypot(anchor.x - nextAnchor.x, anchor.y - nextAnchor.y) < 1e-10)
  assert.equal(next.id, object.id)
  const proportional = resizeObject(object, { x: 50, y: 20 }, { x: 1, y: 1 }, true)
  assert.equal(proportional.width / proportional.height, object.width / object.height)
  assert.equal(resizeObject(object, { x: -500, y: -500 }, { x: 1, y: 1 }).width, 1)
  const local = { x: 32, y: 18 }, roundtrip = localPoint(object, worldPoint(object, local))
  assert.ok(Math.hypot(local.x - roundtrip.x, local.y - roundtrip.y) < 1e-10)
})

test('degenerate legacy triangles stay finite and do not hit-test the whole canvas', () => {
  const object = triangleFromPoints([{ x: 12, y: 12 }, { x: 12, y: 12 }, { x: 12, y: 12 }])
  assert.ok(isScene({ ...emptyScene(), objects: [object] }))
  assert.equal(contains(object, { x: 500, y: 500 }), false)
  assert.equal(isScene({ ...emptyScene(), objects: [{ ...object, rotation: Infinity }] }), false)
  assert.equal(isScene({ ...emptyScene(), objects: [object, object] }), false)
})

test('history groups committed gestures, restores deletes and clears redo on a branch', () => {
  const initial = emptyScene(), object = fromBounds('rectangle', { x: 10, y: 10 }, { x: 40, y: 50 })
  let history = historyFor(initial)
  history = commit(history, { ...initial, objects: [object] })
  // Many previews can be derived without touching history; commit only the final scene.
  for (let i = 1; i <= 100; i++) replaceObject(history.present, { ...object, x: i })
  history = commit(history, replaceObject(history.present, { ...object, x: 100 }))
  assert.equal(history.past.length, 2)
  assert.equal(undo(history).present.objects[0].x, object.x)
  assert.equal(redo(undo(history)).present.objects[0].x, 100)
  const deleted = commit(history, { ...history.present, objects: [] })
  assert.equal(undo(deleted).present.objects[0].id, object.id)
  assert.equal(commit(undo(deleted), initial).future.length, 0)
  assert.equal(commit(history, history.present), history)
  for (let i = 0; i < 120; i++) history = commit(history, replaceObject(history.present, { ...object, x: i }))
  assert.equal(history.past.length, 100)
})

// Record the drawing calls of both paths, without a browser or p5 import.
function recorder() {
  const calls: unknown[][] = []
  const p: Record<string, unknown> = { CENTER: 'center', width: 800, height: 640 }
  for (const name of ['background', 'stroke', 'strokeWeight', 'fill', 'push', 'pop', 'translate', 'rotate', 'rectMode', 'rect', 'ellipseMode', 'ellipse', 'triangle']) {
    p[name] = (...args: unknown[]) => calls.push([name, ...args])
  }
  p.createCanvas = (width: number, height: number) => { p.width = width; p.height = height }
  p.noLoop = () => {}
  p.color = (value: string) => { let alpha = 255; return { setAlpha: (a: number) => { alpha = a }, toString: () => `${value}/${alpha}` } }
  p.drawingContext = { createLinearGradient: (...args: number[]) => {
    calls.push(['gradient', ...args])
    return { addColorStop: (...stop: unknown[]) => calls.push(['stop', ...stop]) }
  } }
  return { p: p as unknown as p5, calls }
}

test('generated standalone instance-mode code draws exactly the same commands as the renderer', () => {
  const scene = migrateShapes(legacy, 'fixture')
  scene.objects = scene.objects.map((o, i) => ({ ...o, rotation: i * 0.37, x: o.x + i * 7 }))
  const direct = recorder(), generated = recorder()
  drawScene(direct.p, scene)
  const code = sceneToCode(scene)
  assert.ok(!code.includes('helpers.') && !code.includes('import '))
  new Function('p', code)(generated.p)
  generated.p.setup()
  generated.p.draw()
  assert.deepEqual(generated.calls, direct.calls)
})

const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')
const data = new Map<string, string>()
let quota = false
Object.defineProperty(globalThis, 'window', { configurable: true, value: { localStorage: {
  getItem: (key: string) => data.get(key) ?? null,
  setItem: (key: string, value: string) => { if (quota) throw new Error('quota'); data.set(key, value) },
} } })
after(() => { if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow); else Reflect.deleteProperty(globalThis, 'window') })

test('legacy stores retain metadata and active canvas through migration and roundtrip autosave', () => {
  data.set(INTERACTIVE_STORAGE_KEY, JSON.stringify({ version: 1, activeId: 'old', sketches: [{ id: 'old', kind: 'interactive', name: 'Keep me', updatedAt: 123, shapes: legacy }] }))
  const loaded = loadInteractiveStore(), active = getActiveSketch(loaded)
  assert.equal(active.id, 'old'); assert.equal(active.name, 'Keep me'); assert.equal(active.updatedAt, 123)
  assert.equal(active.scene.objects.length, 3)
  assert.equal(saveInteractiveStore(loaded), true)
  assert.deepEqual(loadInteractiveStore(), loaded)
})

test('code exports append independent sketches and report storage failure', () => {
  const previous = createCodeSketch({ name: 'My existing code', code: 'do not replace' })
  const existing = { version: 1 as const, activeId: previous.id, sketches: [previous] }
  assert.equal(saveCodeStore(existing), true)
  for (let i = 0; i < 2; i++) {
    const exported = createCodeSketch({ name: 'Canvas — code', code: sceneToCode(emptyScene()) })
    assert.equal(saveCodeStore(upsertSketch(loadCodeStore(), exported)), true)
  }
  const result = loadCodeStore()
  assert.equal(result.sketches.length, 3)
  assert.deepEqual(result.sketches[0], previous)
  const before = data.get(CODE_STORAGE_KEY)
  quota = true
  assert.equal(saveCodeStore(existing), false)
  assert.equal(data.get(CODE_STORAGE_KEY), before)
  quota = false
})
