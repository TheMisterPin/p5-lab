import { after, test } from 'node:test'
import assert from 'node:assert/strict'
import type p5 from 'p5'
import { commit, historyFor, redo, undo } from '../lib/editor/history'
import { contains, emptyScene, fromBounds, fromClicks, fromPoints, hitTest, localPoint, replaceObject, resizeObject, worldPoint, worldVertices, dimensions, editVertex, duplicateObject, reorderObject, setDimension, setScale, shapeKinds, type SceneObject } from '../lib/editor/scene'
import { isScene, migrateShapes, migrateV1, parseProject, projectJSON, validCanvas, type LegacyScene } from '../lib/editor/project'
import { drawScene, sceneToCode } from '../lib/editor/render'
import { CODE_STORAGE_KEY, INTERACTIVE_STORAGE_KEY, createCodeSketch, getActiveSketch, loadCodeStore, loadInteractiveStore, saveCodeStore, saveInteractiveStore, upsertSketch } from '../lib/sketches/storage'
import type { SerializedShape } from '../lib/sketches/types'

const legacy: SerializedShape[] = [
  { type: 'triangle', vertices: [{ x: 17, y: 42 }, { x: 192, y: 72 }, { x: 62, y: 210 }] },
  { type: 'rectangle', topLeft: { x: 200, y: 80 }, bottomRight: { x: 320, y: 180 }, width: 120, height: 100 },
  { type: 'ellipse', center: { x: 400, y: 300 }, radius: { x: 80, y: 40 }, width: 160, height: 80 },
]
const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-8, `${a} ≠ ${b}`)
const nearPoint = (a: { x: number; y: number }, b: { x: number; y: number }) => { near(a.x, b.x); near(a.y, b.y) }

test('original saved shapes migrate losslessly with deterministic IDs and retained canvas gradient', () => {
  const scene = migrateShapes(legacy, 'saved-canvas')
  assert.deepEqual(scene, migrateShapes(legacy, 'saved-canvas'))
  assert.ok(isScene(scene))
  assert.deepEqual(worldVertices(scene.objects[0]), (legacy[0] as Extract<SerializedShape, { type: 'triangle' }>).vertices)
  assert.deepEqual(scene.objects.map(o => o.type), ['triangle', 'rectangle', 'ellipse'])
  assert.equal(scene.objects[1].x, 260)
  assert.equal(dimensions(scene.objects[2]).width, 160)
  assert.deepEqual(scene.objects[0].appearance.fill, { kind: 'gradient', start: { x: 0, y: 0 }, end: { x: 800, y: 640 }, blue: '#365edb', pink: '#d52368', alpha: 55 })
})

test('version-1 transformed scenes preserve vertices, paint, IDs and rotation at 100% scale', () => {
  const old: LegacyScene = { version: 1, width: 1000, height: 500, style: { background: '#abcdef', stroke: '#123456', strokeWidth: 7, blue: '#111111', pink: '#eeeeee', alpha: 70 }, objects: [{ id: 'keep', type: 'triangle', x: 200, y: 100, width: 120, height: 60, rotation: 0.7, vertices: [{ x: -0.5, y: -0.5 }, { x: 0.5, y: -0.1 }, { x: 0, y: 0.5 }] }] }
  const s = migrateV1(old)!
  assert.ok(isScene(s)); assert.equal(s.objects[0].id, 'keep'); assert.equal(s.objects[0].scaleX, 1)
  assert.equal(s.objects[0].rotation, 0.7); assert.equal(s.objects[0].appearance.strokeWidth, 7)
  assert.deepEqual(s.objects[0].geometry, { kind: 'vertices', points: [{ x: -60, y: -30 }, { x: 60, y: -6 }, { x: 0, y: 30 }] })
  const changedCanvas = { ...s, width: 1200 }
  assert.deepEqual(changedCanvas.objects[0].appearance.fill, s.objects[0].appearance.fill)
})

test('all shape constructors produce valid serializable scenes and authored quad order is preserved', () => {
  for (const type of shapeKinds) assert.ok(isScene({ ...emptyScene(), objects: [fromBounds(type, { x: 200, y: 150 }, { x: 80, y: 50 })] }), type)
  const points = [{ x: 10, y: 10 }, { x: 100, y: 70 }, { x: 20, y: 80 }, { x: 80, y: 15 }]
  assert.deepEqual(worldVertices(fromClicks('quad', points)), points)
  assert.deepEqual(dimensions(fromClicks('ellipse', [{ x: 200, y: 200 }, { x: 240, y: 230 }])), { width: 80, height: 60 })
})

test('circles and squares retain uniform dimensions through bounds, numeric scaling and resize', () => {
  for (const type of ['circle', 'square'] as const) {
    let o = fromBounds(type, { x: 30, y: 20 }, { x: -70, y: 65 })
    assert.deepEqual(dimensions(o), { width: 100, height: 100 })
    o = setScale(o, 'y', 2.5); assert.equal(o.scaleX, o.scaleY)
    o = resizeObject(o, { x: 80, y: 20 }, { x: 1, y: 1 }); near(dimensions(o).width, dimensions(o).height)
    o = setDimension(o, 'width', 200); near(dimensions(o).height, 200)
    assert.ok(isScene({ ...emptyScene(), objects: [o] }))
  }
})

test('dimensions and scale apply once; base geometry and stroke width stay unchanged', () => {
  const o = fromBounds('rectangle', { x: 10, y: 20 }, { x: 110, y: 70 })
  const scaled = setScale(o, 'x', 2)
  assert.deepEqual(scaled.geometry, o.geometry)
  assert.deepEqual(dimensions(scaled), { width: 200, height: 50 })
  assert.equal(scaled.appearance.strokeWidth, 2)
  assert.equal(setDimension(scaled, 'height', 100).scaleY, 2)
  assert.equal(setScale(o, 'x', 0), o)
  const proportional = setScale({ ...o, proportional: true }, 'y', 3)
  assert.deepEqual(dimensions(proportional), { width: 300, height: 150 })
})

test('vertex edits after arbitrary transforms preserve other canvas vertices, scale, rotation, and IDs', () => {
  for (const type of ['triangle', 'quad'] as const) for (let i = 0; i < 30; i++) {
    const object = { ...fromBounds(type, { x: 15, y: 30 }, { x: 150, y: 90 }), scaleX: 0.3 + i * 0.17, scaleY: 2.4, rotation: i * 0.32, x: -40 + i, y: 270 }
    const vertices = worldVertices(object), target = { x: 320 + i * 2, y: -45 + i }
    const edited = editVertex(object, 1, target)
    const after = worldVertices(edited)
    after.forEach((p, index) => nearPoint(p, index === 1 ? target : vertices[index]))
    assert.equal(edited.id, object.id); assert.equal(edited.scaleX, object.scaleX); assert.equal(edited.scaleY, object.scaleY); assert.equal(edited.rotation, object.rotation)
    assert.ok(isScene({ ...emptyScene(), objects: [edited] }))
  }
})

test('degenerate vertices remain finite, editable, and safely hit-tested', () => {
  let o = fromPoints('triangle', [{ x: 20, y: 20 }, { x: 20, y: 20 }, { x: 20, y: 20 }])
  assert.ok(isScene({ ...emptyScene(), objects: [o] }))
  assert.equal(contains(o, { x: 500, y: 500 }, 6), false)
  assert.equal(contains(o, { x: 22, y: 20 }, 6), true)
  o = editVertex(o, 2, { x: 80, y: 80 })
  assert.deepEqual(worldVertices(o)[0], { x: 20, y: 20 })
  assert.equal(editVertex(o, 2, { x: NaN, y: 80 }), o)
})

test('hit testing handles rotated shapes, open edges, vertex dots, visibility, locks and screen tolerance', () => {
  const rectangle = { ...fromBounds('rectangle', { x: 50, y: 75 }, { x: 150, y: 125 }), rotation: Math.PI / 2 }
  assert.equal(contains(rectangle, { x: 100, y: 145 }), true)
  assert.equal(contains(rectangle, { x: 145, y: 100 }), false)
  const line = fromPoints('line', [{ x: 10, y: 10 }, { x: 110, y: 10 }])
  assert.equal(contains(line, { x: 50, y: 15 }, 6), true)
  assert.equal(contains(line, { x: 50, y: 15 }, 1), false)
  const dots = fromPoints('polyline', [{ x: 20, y: 20 }, { x: 120, y: 100 }])
  assert.equal(contains(dots, { x: 17, y: 20 }, 1), true)
  const scene = { ...emptyScene(), objects: [rectangle, { ...rectangle, id: 'locked', locked: true }] }
  assert.equal(hitTest(scene, { x: 100, y: 100 })?.id, rectangle.id)
  assert.equal(hitTest({ ...scene, objects: [{ ...rectangle, visible: false }] }, { x: 100, y: 100 }), undefined)
  const hollow = { ...rectangle, appearance: { ...rectangle.appearance, fill: { kind: 'none' as const } } }
  assert.equal(contains(hollow, { x: 100, y: 100 }, 2), false)
})

test('rotated resize anchors the opposite corner and roundtrips transforms', () => {
  const o = { ...fromBounds('rectangle', { x: 20, y: 50 }, { x: 120, y: 130 }), rotation: 0.8, scaleX: 1.7, scaleY: 0.8 }
  const before = o.geometry.kind === 'box' ? o.geometry : { width: 0, height: 0 }
  const anchor = worldPoint(o, { x: -before.width / 2, y: -before.height / 2 })
  const resized = resizeObject(o, { x: 50, y: 20 }, { x: 1, y: 1 })
  nearPoint(worldPoint(resized, { x: -before.width / 2, y: -before.height / 2 }), anchor)
  nearPoint(localPoint(o, worldPoint(o, { x: 32, y: 18 })), { x: 32, y: 18 })
  assert.equal(resized.id, o.id)
  assert.equal(resizeObject({ ...o, locked: true }, { x: 1, y: 1 }, { x: 1, y: 1 }).scaleX, o.scaleX)
})

test('duplicates copy deep geometry and styling; ordering, flags and all edits undo independently', () => {
  const a = fromPoints('quad', [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }])
  const initial = { ...emptyScene(), objects: [{ ...a, name: 'Panel', locked: true }] }
  const duplicated = duplicateObject(initial, a.id)!
  const copy = duplicated.scene.objects[1]
  assert.notEqual(copy.id, a.id); assert.equal(copy.locked, false); assert.equal(copy.name, 'Panel copy'); assert.notEqual(copy.geometry, a.geometry)
  assert.deepEqual(copy.appearance, a.appearance)
  let history = commit(historyFor(initial), duplicated.scene)
  history = commit(history, reorderObject(history.present, copy.id, 'back'))
  assert.equal(history.present.objects[0].id, copy.id)
  const hidden = { ...copy, visible: false, name: 'Renamed' }
  history = commit(history, replaceObject(history.present, hidden))
  assert.equal(undo(history).present.objects[0].visible, true)
  assert.equal(redo(undo(history)).present.objects[0].name, 'Renamed')
  assert.equal(undo(undo(history)).present.objects[1].id, copy.id)
})

test('history commits an entire preview gesture once and caps retained history', () => {
  const initial = emptyScene(), object = fromBounds('rectangle', { x: 10, y: 10 }, { x: 40, y: 50 })
  let history = commit(historyFor(initial), { ...initial, objects: [object] })
  for (let i = 1; i <= 100; i++) replaceObject(history.present, { ...object, x: i })
  history = commit(history, replaceObject(history.present, { ...object, x: 100 }))
  assert.equal(history.past.length, 2)
  assert.equal(undo(history).present.objects[0].x, object.x)
  assert.equal(redo(undo(history)).present.objects[0].x, 100)
  assert.equal(commit(undo(history), initial).future.length, 0)
  for (let i = 0; i < 120; i++) history = commit(history, replaceObject(history.present, { ...object, x: i }))
  assert.equal(history.past.length, 100)
})

function recorder() {
  const calls: unknown[][] = []
  const p: Record<string, unknown> = { CORNER: 'corner', CLOSE: 'close', width: 800, height: 640 }
  for (const name of ['background', 'stroke', 'strokeWeight', 'noStroke', 'noFill', 'fill', 'push', 'pop', 'translate', 'rotate', 'rectMode', 'rect', 'ellipseMode', 'ellipse', 'beginShape', 'vertex', 'endShape']) p[name] = (...args: unknown[]) => calls.push([name, ...args])
  p.createCanvas = (width: number, height: number) => { p.width = width; p.height = height }
  p.noLoop = () => {}
  p.color = (value: string) => { let alpha = 255; return { setAlpha: (a: number) => { alpha = a }, toString: () => `${value}/${alpha}` } }
  p.drawingContext = { set globalAlpha(value: number) { calls.push(['opacity', value]) }, createLinearGradient: (...args: number[]) => {
    calls.push(['gradient', ...args]); return { addColorStop: (...stop: unknown[]) => calls.push(['stop', ...stop]) }
  } }
  return { p: p as unknown as p5, calls }
}

test('standalone instance code exactly matches renderer calls for every shape, paint, scale and visibility', () => {
  const scene = migrateShapes(legacy, 'fixture')
  scene.objects.push(...shapeKinds.map((type, i) => {
    const o = fromBounds(type, { x: 10, y: 20 }, { x: 100, y: 120 })
    return { ...o, rotation: i * 0.37, scaleX: 1.7, scaleY: 1.7, name: `Object ${i}`, appearance: { ...o.appearance, opacity: 0.37, stroke: i % 2 ? null : '#123456' } }
  }))
  scene.objects.push({ ...scene.objects[0], id: 'hidden', name: 'Excluded', visible: false })
  const direct = recorder(), generated = recorder()
  drawScene(direct.p, scene)
  const code = sceneToCode(scene)
  assert.ok(!code.includes('helpers.') && !code.includes('import ') && !code.includes('Excluded'))
  new Function('p', code)(generated.p); generated.p.setup(); generated.p.draw()
  assert.deepEqual(generated.calls, direct.calls)
})

test('user names cannot inject executable JavaScript through generated comments', () => {
  const o = fromBounds('rectangle', { x: 0, y: 0 }, { x: 20, y: 20 })
  o.name = 'Name\nthrow new Error("bad");\u2028throw new Error("bad");'
  const p = recorder().p
  new Function('p', sceneToCode({ ...emptyScene(), objects: [o] }))(p)
  p.setup(); p.draw()
})

test('project roundtrips retain every editing property, hidden objects, IDs, canvas and ordering', () => {
  const scene = migrateShapes(legacy, 'project')
  scene.width = 1100; scene.background = '#102030'
  scene.objects[1] = { ...scene.objects[1], name: 'Hidden locked', visible: false, locked: true, scaleX: 2.4 }
  const imported = parseProject(projectJSON(scene, 'My project'))
  assert.deepEqual(imported, { name: 'My project', scene })
  assert.equal(parseProject(projectJSON(scene, 'n'.repeat(1200))).name.length, 1200)
})

test('project validation rejects malformed, unsupported, duplicate IDs, nonfinite, invalid constraints and bad vertex counts', () => {
  const scene = emptyScene(), o = fromBounds('circle', { x: 0, y: 0 }, { x: 20, y: 20 })
  assert.throws(() => parseProject('{'), /Invalid JSON/)
  assert.throws(() => parseProject('{"format":"p5-lab-project","version":100}'), /Unsupported/)
  assert.equal(isScene({ ...scene, objects: [o, o] }), false)
  assert.equal(isScene({ ...scene, objects: [{ ...o, name: ' ' }] }), false)
  assert.equal(isScene({ ...scene, objects: [{ ...o, scaleY: 2 }] }), false)
  assert.equal(isScene({ ...scene, objects: [{ ...o, rotation: Infinity }] }), false)
  assert.equal(isScene({ ...scene, objects: [{ ...o, appearance: null }] }), false)
  assert.equal(isScene({ ...scene, objects: [{ ...o, type: 'quad', geometry: { kind: 'vertices', points: [{ x: 0, y: 0 }] } }] }), false)
  assert.equal(isScene({ ...scene, objects: [fromPoints('polyline', [{ x: 2, y: 2 }, { x: 2, y: 2 }])] }), false)
  assert.equal(validCanvas(1.2, 600), false); assert.equal(validCanvas(8192, 8192), false)
  assert.throws(() => parseProject(projectJSON({ ...scene, width: -1 }, 'Bad')), /Invalid project/)
})

const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window'), data = new Map<string, string>()
let quota = false
Object.defineProperty(globalThis, 'window', { configurable: true, value: { localStorage: { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => { if (quota) throw new Error('quota'); data.set(k, v) } } } })
after(() => { if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow); else Reflect.deleteProperty(globalThis, 'window') })

test('localStorage retains legacy metadata through migration and v2 autosave', () => {
  data.set(INTERACTIVE_STORAGE_KEY, JSON.stringify({ version: 1, activeId: 'old', sketches: [{ id: 'old', name: 'Keep me', updatedAt: 123, kind: 'interactive', shapes: legacy }] }))
  const store = loadInteractiveStore(), active = getActiveSketch(store)
  assert.equal(active.id, 'old'); assert.equal(active.name, 'Keep me'); assert.equal(active.updatedAt, 123)
  assert.equal(active.scene.version, 2); assert.equal(saveInteractiveStore(store), true)
  assert.deepEqual(loadInteractiveStore(), store)
})

test('exports append independent code sketches and report storage failure without overwriting', () => {
  const previous = createCodeSketch({ name: 'My code', code: 'do not replace' })
  saveCodeStore({ version: 1, activeId: previous.id, sketches: [previous] })
  for (let i = 0; i < 2; i++) saveCodeStore(upsertSketch(loadCodeStore(), createCodeSketch({ code: sceneToCode(emptyScene()) })))
  const result = loadCodeStore(); assert.equal(result.sketches.length, 3); assert.deepEqual(result.sketches[0], previous)
  const before = data.get(CODE_STORAGE_KEY); quota = true
  assert.equal(saveCodeStore(result), false); assert.equal(data.get(CODE_STORAGE_KEY), before); quota = false
})
