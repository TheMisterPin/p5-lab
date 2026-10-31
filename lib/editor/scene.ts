import type { Point2D, SerializedShape } from '../sketches/types'

export type ShapeKind = 'triangle' | 'rectangle' | 'ellipse'
export type SceneObject = {
  id: string
  type: ShapeKind
  x: number
  y: number
  width: number
  height: number
  rotation: number
  /** Triangle vertices in local, normalized bounds. Preserves freeform triangles. */
  vertices?: [Point2D, Point2D, Point2D]
}
export type Scene = {
  version: 1
  width: number
  height: number
  style: { background: string; stroke: string; strokeWidth: number; blue: string; pink: string; alpha: number }
  objects: SceneObject[]
}

export function objectId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID() : `object-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function emptyScene(): Scene {
  return {
    version: 1, width: 800, height: 640,
    style: { background: '#fafafa', stroke: '#252630', strokeWidth: 2, blue: '#365edb', pink: '#d52368', alpha: 55 },
    objects: [],
  }
}

export function triangleFromPoints(points: [Point2D, Point2D, Point2D], id = objectId()): SceneObject {
  const left = Math.min(...points.map(p => p.x)), top = Math.min(...points.map(p => p.y))
  const right = Math.max(...points.map(p => p.x)), bottom = Math.max(...points.map(p => p.y))
  const width = Math.max(1, right - left), height = Math.max(1, bottom - top)
  const x = (left + right) / 2, y = (top + bottom) / 2
  return { id, type: 'triangle', x, y, width, height, rotation: 0,
    vertices: points.map(p => ({ x: (p.x - x) / width, y: (p.y - y) / height })) as SceneObject['vertices'] }
}

export function fromBounds(type: ShapeKind, a: Point2D, b: Point2D): SceneObject {
  const x = (a.x + b.x) / 2, y = (a.y + b.y) / 2
  return { id: objectId(), type, x, y, width: Math.max(1, Math.abs(b.x - a.x)), height: Math.max(1, Math.abs(b.y - a.y)), rotation: 0,
    ...(type === 'triangle' ? { vertices: [{ x: 0, y: -0.5 }, { x: 0.5, y: 0.5 }, { x: -0.5, y: 0.5 }] as [Point2D, Point2D, Point2D] } : {}) }
}

export function fromClicks(type: ShapeKind, points: Point2D[]): SceneObject {
  if (type === 'triangle') return triangleFromPoints(points as [Point2D, Point2D, Point2D])
  if (type === 'rectangle') return fromBounds(type, points[0], points[1])
  const [center, extent] = points
  return { id: objectId(), type, x: center.x, y: center.y, width: Math.max(1, Math.abs(extent.x - center.x) * 2), height: Math.max(1, Math.abs(extent.y - center.y) * 2), rotation: 0 }
}

export function migrateShapes(shapes: SerializedShape[], sketchId: string): Scene {
  const scene = emptyScene()
  scene.objects = shapes.map((shape, index) => {
    const id = `${sketchId}-shape-${index}`
    if (shape.type === 'triangle') return triangleFromPoints(shape.vertices, id)
    if (shape.type === 'rectangle') return { id, type: shape.type, x: shape.topLeft.x + shape.width / 2, y: shape.topLeft.y + shape.height / 2, width: shape.width, height: shape.height, rotation: 0 }
    return { id, type: shape.type, x: shape.center.x, y: shape.center.y, width: shape.width, height: shape.height, rotation: 0 }
  })
  return scene
}

const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)
const point = (value: unknown): value is Point2D => !!value && typeof value === 'object'
  && finite((value as Point2D).x) && finite((value as Point2D).y)

export function isScene(value: unknown): value is Scene {
  if (!value || typeof value !== 'object') return false
  const s = value as Scene
  if (s.version !== 1 || !finite(s.width) || s.width <= 0 || !finite(s.height) || s.height <= 0 || !s.style || !Array.isArray(s.objects)) return false
  if (![s.style.background, s.style.stroke, s.style.blue, s.style.pink].every(c => typeof c === 'string' && /^#[\da-f]{6}$/i.test(c))
    || !finite(s.style.strokeWidth) || s.style.strokeWidth < 0 || !finite(s.style.alpha) || s.style.alpha < 0 || s.style.alpha > 255) return false
  const ids = new Set<string>()
  return s.objects.every(o => {
    if (!o || typeof o.id !== 'string' || !o.id || ids.has(o.id)) return false
    ids.add(o.id)
    return ['triangle', 'rectangle', 'ellipse'].includes(o.type)
      && [o.x, o.y, o.width, o.height, o.rotation].every(finite) && o.width >= 0 && o.height >= 0
      && (o.type !== 'triangle' || (Array.isArray(o.vertices) && o.vertices.length === 3 && o.vertices.every(point)))
  })
}

export function localPoint(object: SceneObject, world: Point2D): Point2D {
  const dx = world.x - object.x, dy = world.y - object.y
  const c = Math.cos(object.rotation), s = Math.sin(object.rotation)
  return { x: dx * c + dy * s, y: -dx * s + dy * c }
}

export function worldPoint(object: SceneObject, local: Point2D): Point2D {
  const c = Math.cos(object.rotation), s = Math.sin(object.rotation)
  return { x: object.x + local.x * c - local.y * s, y: object.y + local.x * s + local.y * c }
}

export function contains(object: SceneObject, world: Point2D): boolean {
  const p = localPoint(object, world), w = object.width / 2, h = object.height / 2
  if (object.type === 'ellipse') return w > 0 && h > 0 && (p.x / w) ** 2 + (p.y / h) ** 2 <= 1
  if (object.type === 'rectangle') return Math.abs(p.x) <= w && Math.abs(p.y) <= h
  const [a, b, c] = object.vertices!.map(v => ({ x: v.x * object.width, y: v.y * object.height }))
  const cross = (a: Point2D, b: Point2D, c: Point2D) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)
  if (Math.abs(cross(a, b, c)) < 1e-8) return false
  const sides = [cross(a, b, p), cross(b, c, p), cross(c, a, p)]
  return sides.every(n => n >= 0) || sides.every(n => n <= 0)
}

export function hitTest(scene: Scene, point: Point2D) {
  return [...scene.objects].reverse().find(o => contains(o, point))
}

/** Resize in local axes, anchoring the opposite handle; never flip through zero. */
export function resizeObject(object: SceneObject, delta: Point2D, handle: Point2D, proportional = false): SceneObject {
  let width = handle.x ? Math.max(1, object.width + delta.x * handle.x) : object.width
  let height = handle.y ? Math.max(1, object.height + delta.y * handle.y) : object.height
  if (proportional && handle.x && handle.y) {
    const ratio = Math.max(width / Math.max(1, object.width), height / Math.max(1, object.height))
    width = Math.max(1, object.width * ratio); height = Math.max(1, object.height * ratio)
  }
  const center = worldPoint(object, { x: (width - object.width) * handle.x / 2, y: (height - object.height) * handle.y / 2 })
  return { ...object, ...center, width, height }
}

export function replaceObject(scene: Scene, object: SceneObject): Scene {
  return { ...scene, objects: scene.objects.map(o => o.id === object.id ? object : o) }
}
