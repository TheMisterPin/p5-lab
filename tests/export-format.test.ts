import { test } from 'node:test'
import assert from 'node:assert/strict'
import { formatNumber } from '../lib/editor/format-number'
import { emptyScene, fromBounds, fromPoints } from '../lib/editor/scene'
import { sceneToCode } from '../lib/editor/render'
import { parseProject, projectJSON } from '../lib/editor/project'

test('JavaScript literals round consistently, remove trailing zeros and never emit negative zero', () => {
  for (const [value, text] of [[123.456789, '123.457'], [-1.23456, '-1.235'], [12.5, '12.5'], [2, '2'], [0, '0'], [-0, '0']] as const) assert.equal(formatNumber(value), text)
  for (const value of [Infinity, -Infinity, NaN]) assert.throws(() => formatNumber(value), /non-finite/)
})

test('tiny nonzero geometry and opacity retain meaningful precision instead of collapsing or doubling', () => {
  for (const value of [0.000000123456789, -0.00001, 0.00049, 0.00051, 0.01234567, Number.MIN_VALUE]) {
    const exported = Number(formatNumber(value))
    assert.notEqual(exported, 0)
    assert.ok(Math.abs(exported - value) <= Math.abs(value) * 0.0000051)
  }
})

test('all emitted geometry, rotation, paint and gradient numbers use the formatter; project data retains full precision', () => {
  const shape = { ...fromBounds('rectangle', { x: 10.123456789, y: 20.987654321 }, { x: 110.987654321, y: 90.123456789 }), rotation: 0.6457718232379019 }
  shape.appearance = { stroke: '#123456', strokeWidth: 2.3456789, opacity: 0.00001234567, fill: { kind: 'gradient', start: { x: 0.123456789, y: 0.234567891 }, end: { x: 800.345678912, y: 640.456789123 }, blue: '#365edb', pink: '#d52368', alpha: 55.56789123 } }
  const dots = fromPoints('polyline', [{ x: 120.123456789, y: 100.987654321 }, { x: 180.345678912, y: 160.123456789 }])
  dots.appearance.strokeWidth = 3.123456789
  const ink = fromPoints('freehand', [{ x: 12.123456789, y: 34.987654321 }, { x: 56.345678912, y: 78.123456789 }, { x: 90.246813579, y: 12.975318642 }])
  ink.appearance.strokeWidth = 4.123456789
  const scene = { ...emptyScene(), objects: [shape, dots, ink] }, before = JSON.stringify(scene), code = sceneToCode(scene)
  for (const value of [shape.x, shape.y, shape.rotation, shape.appearance.strokeWidth, shape.appearance.opacity, 0.123456789, 0.234567891, 800.345678912, 640.456789123, 55.56789123, dots.appearance.strokeWidth * 2.5, ink.appearance.strokeWidth * 2.5]) assert.ok(code.includes(formatNumber(value)), String(value))
  assert.ok(!code.includes('0.6457718232379019'))
  assert.equal(JSON.stringify(scene), before)
  assert.deepEqual(parseProject(projectJSON(scene, 'Precision')).scene, scene)
})
