import type { Point2D } from '../sketches/types'

export const shapeKinds = ['triangle', 'rectangle', 'ellipse', 'circle', 'square', 'quad', 'line', 'polyline'] as const
export type ShapeKind = typeof shapeKinds[number]
export type Fill = { kind: 'none' } | { kind: 'solid'; color: string } | {
  kind: 'gradient'; start: Point2D; end: Point2D; blue: string; pink: string; alpha: number
}
export type Appearance = { fill: Fill; stroke: string | null; strokeWidth: number; opacity: number }
export type Geometry = { kind: 'box'; width: number; height: number } | { kind: 'vertices'; points: Point2D[] }
export type SceneObject = {
  id: string; name: string; type: ShapeKind; geometry: Geometry
  x: number; y: number; rotation: number; scaleX: number; scaleY: number
  proportional: boolean; visible: boolean; locked: boolean; appearance: Appearance
}
export type Scene = { version: 2; width: number; height: number; background: string; objects: SceneObject[] }
export const openShape = (type: ShapeKind) => type === 'line' || type === 'polyline'
export const constrained = (type: ShapeKind) => type === 'circle' || type === 'square'
export const editableVertices = (object: SceneObject) => object.type === 'triangle' || object.type === 'quad'
export function objectId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `object-${Date.now()}-${Math.random().toString(16).slice(2)}`
}
export const emptyScene = (): Scene => ({ version: 2, width: 800, height: 640, background: '#fafafa', objects: [] })
export const defaultAppearance = (type: ShapeKind): Appearance => ({ fill: openShape(type) ? { kind: 'none' } : { kind: 'solid', color: '#dce3fa' }, stroke: '#252630', strokeWidth: 2, opacity: 1 })
export function bounds(points: Point2D[]) {
  const xs = points.map(p => p.x), ys = points.map(p => p.y)
  const left = Math.min(...xs), right = Math.max(...xs), top = Math.min(...ys), bottom = Math.max(...ys)
  return { x: (left + right) / 2, y: (top + bottom) / 2, width: right - left, height: bottom - top }
}
export function baseSize(object: SceneObject) {
  return object.geometry.kind === 'box' ? object.geometry : bounds(object.geometry.points)
}
export function dimensions(object: SceneObject) {
  const b = baseSize(object)
  return { width: b.width * object.scaleX, height: b.height * object.scaleY }
}
function common(type: ShapeKind): Omit<SceneObject, 'geometry'> {
  return { id: objectId(), type, name: type === 'polyline' ? 'Connected dots' : type[0].toUpperCase() + type.slice(1),
    x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, proportional: constrained(type), visible: true, locked: false, appearance: defaultAppearance(type) }
}
export function fromPoints(type: ShapeKind, points: Point2D[], id = objectId()): SceneObject {
  const b = bounds(points)
  return { ...common(type), id, x: b.x, y: b.y, geometry: { kind: 'vertices', points: points.map(p => ({ x: p.x - b.x, y: p.y - b.y })) } }
}
export const triangleFromPoints = (points: [Point2D, Point2D, Point2D], id?: string) => fromPoints('triangle', points, id)
export function fromBounds(type: ShapeKind, a: Point2D, target: Point2D): SceneObject {
  let b = target
  if (constrained(type)) {
    const size = Math.max(1, Math.abs(b.x - a.x), Math.abs(b.y - a.y))
    b = { x: a.x + (b.x < a.x ? -size : size), y: a.y + (b.y < a.y ? -size : size) }
  }
  const left = Math.min(a.x, b.x), top = Math.min(a.y, b.y), width = Math.max(1, Math.abs(b.x - a.x)), height = Math.max(1, Math.abs(b.y - a.y))
  if (type === 'line' || type === 'polyline') return fromPoints(type, [a, b])
  if (type === 'triangle') return fromPoints(type, [{ x: left + width / 2, y: top }, { x: left + width, y: top + height }, { x: left, y: top + height }])
  if (type === 'quad') return fromPoints(type, [{ x: left, y: top }, { x: left + width, y: top }, { x: left + width, y: top + height }, { x: left, y: top + height }])
  return { ...common(type), x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, geometry: { kind: 'box', width, height } }
}
export function fromClicks(type: ShapeKind, points: Point2D[]) {
  if (['triangle', 'quad', 'line', 'polyline'].includes(type)) return fromPoints(type, points)
  if (type === 'ellipse' || type === 'circle') {
    const [a, b] = points
    const r = Math.hypot(b.x - a.x, b.y - a.y)
    return { ...common(type), x: a.x, y: a.y, geometry: { kind: 'box' as const,
      width: Math.max(1, type === 'circle' ? r * 2 : Math.abs(b.x - a.x) * 2), height: Math.max(1, type === 'circle' ? r * 2 : Math.abs(b.y - a.y) * 2) } }
  }
  return fromBounds(type, points[0], points[1])
}
/** Rotation only: coordinates in the object's displayed local axes. */
export function unrotate(object: SceneObject, world: Point2D): Point2D {
  const dx = world.x - object.x, dy = world.y - object.y, c = Math.cos(object.rotation), s = Math.sin(object.rotation)
  return { x: dx * c + dy * s, y: -dx * s + dy * c }
}
export function localPoint(object: SceneObject, world: Point2D): Point2D {
  const p = unrotate(object, world)
  return { x: p.x / object.scaleX, y: p.y / object.scaleY }
}
export function worldPoint(object: SceneObject, local: Point2D): Point2D {
  const x = local.x * object.scaleX, y = local.y * object.scaleY, c = Math.cos(object.rotation), s = Math.sin(object.rotation)
  return { x: object.x + x * c - y * s, y: object.y + x * s + y * c }
}
export function worldVertices(object: SceneObject): Point2D[] {
  return object.geometry.kind === 'vertices' ? object.geometry.points.map(p => worldPoint(object, p)) : []
}
export function editVertex(object: SceneObject, index: number, target: Point2D): SceneObject {
  if (object.locked || object.geometry.kind !== 'vertices' || !Number.isFinite(target.x) || !Number.isFinite(target.y)) return object
  const points = object.geometry.points.map((p, i) => i === index ? localPoint(object, target) : p)
  const center = bounds(points), position = worldPoint(object, center)
  return { ...object, ...position, geometry: { kind: 'vertices', points: points.map(p => ({ x: p.x - center.x, y: p.y - center.y })) } }
}
export function setScale(object: SceneObject, axis: 'x' | 'y', scale: number): SceneObject {
  if (object.locked || !Number.isFinite(scale) || scale <= 0) return object
  const current = axis === 'x' ? object.scaleX : object.scaleY
  const ratio = scale / current
  const next = { ...object, scaleX: axis === 'x' || object.proportional || constrained(object.type) ? object.scaleX * ratio : object.scaleX,
    scaleY: axis === 'y' || object.proportional || constrained(object.type) ? object.scaleY * ratio : object.scaleY }
  const d = dimensions(next)
  return Number.isFinite(d.width) && Number.isFinite(d.height) && Number.isFinite(next.scaleX) && Number.isFinite(next.scaleY) ? next : object
}
export function setDimension(object: SceneObject, axis: 'width' | 'height', value: number) {
  const b = baseSize(object), extent = b[axis]
  return extent > 0 && value > 0 ? setScale(object, axis === 'width' ? 'x' : 'y', value / extent) : object
}
export function resizeObject(object: SceneObject, delta: Point2D, handle: Point2D, proportional = false): SceneObject {
  if (object.locked) return object
  const before = dimensions(object)
  let rx = handle.x && before.width > 0 ? Math.max(0.01, before.width + delta.x * handle.x) / before.width : 1
  let ry = handle.y && before.height > 0 ? Math.max(0.01, before.height + delta.y * handle.y) / before.height : 1
  if (proportional || object.proportional || constrained(object.type)) {
    const ratio = !handle.x ? ry : !handle.y ? rx : Math.abs(rx - 1) >= Math.abs(ry - 1) ? rx : ry
    rx = ratio; ry = ratio
  }
  const x = (before.width * rx - before.width) * handle.x / 2, y = (before.height * ry - before.height) * handle.y / 2
  const c = Math.cos(object.rotation), s = Math.sin(object.rotation)
  return { ...object, x: object.x + x * c - y * s, y: object.y + x * s + y * c, scaleX: object.scaleX * rx, scaleY: object.scaleY * ry }
}
export function replaceObject(scene: Scene, object: SceneObject): Scene {
  return { ...scene, objects: scene.objects.map(o => o.id === object.id ? object : o) }
}
export function duplicateObject(scene: Scene, id: string): { scene: Scene; id: string } | null {
  const object = scene.objects.find(o => o.id === id)
  if (!object) return null
  const copy: SceneObject = { ...JSON.parse(JSON.stringify(object)), id: objectId(), name: `${object.name} copy`, x: object.x + 16, y: object.y + 16, locked: false }
  const objects = [...scene.objects], index = objects.indexOf(object)
  objects.splice(index + 1, 0, copy)
  return { scene: { ...scene, objects }, id: copy.id }
}
export function reorderObject(scene: Scene, id: string, action: 'forward' | 'backward' | 'front' | 'back'): Scene {
  const index = scene.objects.findIndex(o => o.id === id)
  if (index < 0) return scene
  const objects = [...scene.objects], [object] = objects.splice(index, 1)
  const target = action === 'front' ? objects.length : action === 'back' ? 0 : Math.max(0, Math.min(objects.length, index + (action === 'forward' ? 1 : -1)))
  objects.splice(target, 0, object)
  return { ...scene, objects }
}
export const dotDiameter = (object: SceneObject) => Math.max(6, object.appearance.strokeWidth * 2.5)
export function segmentDistance(p: Point2D, a: Point2D, b: Point2D) {
  const dx = b.x - a.x, dy = b.y - a.y, length = dx * dx + dy * dy
  const t = length ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / length)) : 0
  return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy)
}
export function contains(object: SceneObject, world: Point2D, tolerance = 0): boolean {
  const { appearance: a } = object
  if (!object.visible || a.opacity === 0) return false
  const local = unrotate(object, world), { width, height } = dimensions(object)
  const strokeTolerance = a.stroke ? tolerance + a.strokeWidth / 2 : 0
  if (object.geometry.kind === 'box') {
    if (object.type === 'ellipse' || object.type === 'circle') {
      const w = width / 2, h = height / 2
      if (!w || !h) return a.stroke !== null && Math.hypot(local.x, local.y) <= strokeTolerance + Math.max(w, h)
      const radius = Math.sqrt((local.x / w) ** 2 + (local.y / h) ** 2)
      return (a.fill.kind !== 'none' && radius <= 1) || (a.stroke !== null && Math.abs(radius - 1) * Math.min(w, h) <= strokeTolerance)
    }
    const inside = Math.abs(local.x) <= width / 2 && Math.abs(local.y) <= height / 2
    if (inside && a.fill.kind !== 'none') return true
    const corners = [{ x: -width / 2, y: -height / 2 }, { x: width / 2, y: -height / 2 }, { x: width / 2, y: height / 2 }, { x: -width / 2, y: height / 2 }]
    return a.stroke !== null && corners.some((p, i) => segmentDistance(local, p, corners[(i + 1) % 4]) <= strokeTolerance)
  }
  const points = worldVertices(object), open = openShape(object.type)
  if (a.stroke && points.some((p, i) => i > 0 && segmentDistance(world, points[i - 1], p) <= strokeTolerance)) return true
  if (!open && a.stroke && segmentDistance(world, points.at(-1)!, points[0]) <= strokeTolerance) return true
  if (object.type === 'polyline' && a.stroke && points.some(p => Math.hypot(world.x - p.x, world.y - p.y) <= dotDiameter(object) / 2 + tolerance)) return true
  if (open || a.fill.kind === 'none') return false
  let winding = 0
  for (let i = 0; i < points.length; i++) {
    const p = points[i], q = points[(i + 1) % points.length]
    const side = (q.x - p.x) * (world.y - p.y) - (world.x - p.x) * (q.y - p.y)
    if (p.y <= world.y && q.y > world.y && side > 0) winding++
    if (p.y > world.y && q.y <= world.y && side < 0) winding--
  }
  return winding !== 0
}
export const hitTest = (scene: Scene, point: Point2D, tolerance = 0) => [...scene.objects].reverse().find(o => !o.locked && contains(o, point, tolerance))
