import { test } from 'node:test'
import assert from 'node:assert/strict'
import { canvasClientPoint, fitViewport, panViewport, sceneToScreen, screenToScene, screenTolerance, zoomAt } from '../lib/editor/viewport'
import { editableVertices, editVertex, emptyScene, fromPoints, hitTest, worldVertices } from '../lib/editor/scene'
import { commit, historyFor, redo, undo } from '../lib/editor/history'
import { parseProject, projectJSON } from '../lib/editor/project'
const close = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-8, `${a} ≠ ${b}`)
const point = (a: { x: number; y: number }, b: { x: number; y: number }) => { close(a.x, b.x); close(a.y, b.y) }

test('fit centers the artwork with padding in wide and tall stages', () => {
  for (const stage of [{ width: 1100, height: 600 }, { width: 300, height: 900 }]) {
    const art = { width: 800, height: 640 }, view = fitViewport(stage, art)
    point(sceneToScreen(view, { x: 400, y: 320 }), { x: stage.width / 2, y: stage.height / 2 })
    assert.ok(view.x >= 15.999999 && view.y >= 15.999999)
    assert.ok(art.width * view.scale <= stage.width - 31.999999)
    assert.ok(art.height * view.scale <= stage.height - 31.999999)
  }
})

test('pointer-anchored zoom preserves the exact artwork point through pan and repeated zoom', () => {
  let view = fitViewport({ width: 800, height: 500 }, { width: 800, height: 640 })
  for (const scale of [0.125, 1, 4, 0.3, 12]) {
    const anchor = { x: 239.125, y: 131.75 }, before = screenToScene(view, anchor)
    view = zoomAt(view, scale, anchor)
    point(screenToScene(view, anchor), before)
    view = panViewport(view, { x: -137.33, y: 84.25 })
    point(screenToScene(view, sceneToScreen(view, before)), before)
  }
})

test('client mapping matches viewport coordinates at multiple zooms, offsets and off-canvas points', () => {
  const art = { width: 800, height: 640 }, stage = { x: 250, y: 140 }
  for (const scale of [0.1, 0.75, 1, 3.25, 8]) for (const offset of [{ x: -430, y: 210 }, { x: 15, y: -90 }]) {
    const view = { scale, ...offset }, rect = { left: stage.x + offset.x, top: stage.y + offset.y, width: art.width * scale, height: art.height * scale }
    for (const world of [{ x: 100.123456, y: 85.314159 }, { x: -20, y: 820 }]) {
      const screen = sceneToScreen(view, world)
      point(canvasClientPoint({ x: screen.x + stage.x, y: screen.y + stage.y }, rect, art), world)
    }
  }
})

test('line selection tolerance is constant in screen pixels at every zoom', () => {
  const line = fromPoints('line', [{ x: 10, y: 40 }, { x: 110, y: 40 }])
  const scene = { ...emptyScene(), objects: [line] }
  for (const scale of [0.1, 0.5, 1, 4, 8]) {
    const radius = 6 + line.appearance.strokeWidth * scale / 2
    assert.equal(hitTest(scene, { x: 60, y: 40 + (radius - 1) / scale }, screenTolerance(6, scale))?.id, line.id)
    assert.equal(hitTest(scene, { x: 60, y: 40 + (radius + 1) / scale }, screenTolerance(6, scale)), undefined)
  }
})

test('transformed line endpoints and every polyline vertex edit without moving their neighbors', () => {
  for (const type of ['line', 'polyline'] as const) {
    const points = type === 'line' ? [{ x: 20, y: 40 }, { x: 120, y: 80 }] : [{ x: 20, y: 40 }, { x: 70, y: 130 }, { x: 120, y: 80 }, { x: 160, y: 170 }]
    for (let i = 0; i < points.length; i++) {
      const object = { ...fromPoints(type, points), rotation: 0.72819, scaleX: 2.37, scaleY: 0.43, x: 231.42, y: -15.67 }
      assert.equal(editableVertices(object), true)
      const original = worldVertices(object), target = { x: original[i].x + 37.1234, y: original[i].y - 28.5678 }
      const next = editVertex(object, i, target)
      worldVertices(next).forEach((p, index) => point(p, index === i ? target : original[index]))
      assert.equal(next.id, object.id); assert.equal(next.scaleX, object.scaleX); assert.equal(next.scaleY, object.scaleY); assert.equal(next.rotation, object.rotation)
      const scene = { ...emptyScene(), objects: [next] }
      assert.deepEqual(parseProject(projectJSON(scene, 'Vertices')).scene, scene)
      const history = commit(historyFor({ ...scene, objects: [object] }), scene)
      assert.deepEqual(undo(history).present.objects[0], object)
      assert.deepEqual(redo(undo(history)).present.objects[0], next)
      const locked = { ...object, locked: true }
      assert.equal(editVertex(locked, i, target), locked)
    }
  }
})

test('endpoint editing cannot invalidate a line by collapsing both vertices', () => {
  const line = { ...fromPoints('line', [{ x: 20, y: 40 }, { x: 120, y: 80 }]), rotation: 0.91, scaleX: 1.7, scaleY: 0.8 }
  assert.equal(editVertex(line, 0, worldVertices(line)[1]), line)
})

test('axis-aligned lines and collinear polylines can expand a zero base extent through vertex editing', () => {
  for (const type of ['line', 'polyline'] as const) {
    const points = type === 'line' ? [{ x: 10, y: 20 }, { x: 100, y: 20 }] : [{ x: 10, y: 20 }, { x: 60, y: 20 }, { x: 100, y: 20 }]
    const object = { ...fromPoints(type, points), scaleX: 2.1, scaleY: 0.6, rotation: 0.8 }
    const before = worldVertices(object), target = { x: before[0].x, y: before[0].y + 50 }
    const edited = editVertex(object, 0, target)
    worldVertices(edited).forEach((p, i) => point(p, i === 0 ? target : before[i]))
    assert.equal(edited.scaleX, 2.1); assert.equal(edited.scaleY, 0.6)
    assert.deepEqual(parseProject(projectJSON({ ...emptyScene(), objects: [edited] }, 'Axis aligned')).scene.objects[0], edited)
  }
})
