import type { Point2D, SerializedShape } from '../sketches/types'
import { isSerializedShape } from '../sketches/serialize'
import { emptyScene, fromPoints, shapeKinds, constrained, openShape, type Fill, type Scene, type SceneObject, type Appearance } from './scene'

export const finite = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n)
const color = (c: unknown): c is string => typeof c === 'string' && /^#[\da-f]{6}$/i.test(c)
const record = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x)
const point = (p: unknown): p is Point2D => record(p) && finite(p.x) && finite(p.y)
export function validCanvas(width: unknown, height: unknown) {
  return finite(width) && finite(height) && Number.isInteger(width) && Number.isInteger(height) && width >= 1 && height >= 1 && width <= 8192 && height <= 8192 && width * height <= 16777216
}
function isFill(f: unknown): f is Fill {
  if (!record(f)) return false
  return f.kind === 'none' || (f.kind === 'solid' && color(f.color)) || (f.kind === 'gradient' && point(f.start) && point(f.end) && color(f.blue) && color(f.pink) && finite(f.alpha) && f.alpha >= 0 && f.alpha <= 255)
}
function isAppearance(a: unknown): a is Appearance {
  return record(a) && isFill(a.fill) && (a.stroke === null || color(a.stroke)) && finite(a.strokeWidth) && a.strokeWidth >= 0 && a.strokeWidth <= 1024 && finite(a.opacity) && a.opacity >= 0 && a.opacity <= 1
}
export function isScene(value: unknown): value is Scene {
  if (!record(value) || value.version !== 2 || !validCanvas(value.width, value.height) || !color(value.background) || !Array.isArray(value.objects) || value.objects.length > 5000) return false
  const ids = new Set<string>()
  let vertices = 0
  return value.objects.every(o => {
    if (!record(o) || typeof o.id !== 'string' || !o.id || ids.has(o.id) || typeof o.name !== 'string' || !o.name.trim() || o.name.length > 1000 || !shapeKinds.includes(o.type as SceneObject['type'])) return false
    ids.add(o.id)
    if (![o.x, o.y, o.rotation, o.scaleX, o.scaleY].every(finite) || (o.scaleX as number) <= 0 || (o.scaleY as number) <= 0
      || typeof o.visible !== 'boolean' || typeof o.locked !== 'boolean' || typeof o.proportional !== 'boolean' || !isAppearance(o.appearance) || !record(o.geometry)) return false
    const g = o.geometry, type = o.type as SceneObject['type']
    if (constrained(type) && (o.scaleX !== o.scaleY || !o.proportional)) return false
    if (['rectangle', 'ellipse', 'circle', 'square'].includes(type)) {
      return g.kind === 'box' && finite(g.width) && finite(g.height) && g.width >= 0 && g.height >= 0
        && finite(g.width * (o.scaleX as number)) && finite(g.height * (o.scaleY as number))
        && finite(Math.abs(o.x as number) + g.width * (o.scaleX as number) + g.height * (o.scaleY as number))
        && finite(Math.abs(o.y as number) + g.width * (o.scaleX as number) + g.height * (o.scaleY as number))
        && (!constrained(type) || (g.width > 0 && g.width === g.height))
    }
    if (g.kind !== 'vertices' || !Array.isArray(g.points) || !g.points.every(point)) return false
    vertices += g.points.length
    if (vertices > 100000) return false
    const count = type === 'triangle' ? 3 : type === 'quad' ? 4 : type === 'line' ? 2 : null
    if (count !== null ? g.points.length !== count : g.points.length < 2) return false
    const points = g.points as Point2D[]
    if (!points.every(p => finite(p.x * (o.scaleX as number)) && finite(p.y * (o.scaleY as number)) && finite(Math.abs(o.x as number) + Math.abs(p.x * (o.scaleX as number)) + Math.abs(p.y * (o.scaleY as number))) && finite(Math.abs(o.y as number) + Math.abs(p.x * (o.scaleX as number)) + Math.abs(p.y * (o.scaleY as number))))) return false
    if (openShape(type) && !points.some(p => p.x !== points[0].x || p.y !== points[0].y)) return false
    // Canonical local vertices are centered on their bounds, making pivot semantics unambiguous.
    const xs = g.points.map(p => p.x), ys = g.points.map(p => p.y)
    return Math.abs(Math.min(...xs) + Math.max(...xs)) < 1e-6 && Math.abs(Math.min(...ys) + Math.max(...ys)) < 1e-6
  })
}

type LegacyStyle = { background: string; stroke: string; strokeWidth: number; blue: string; pink: string; alpha: number }
type LegacyObject = { id: string; type: 'triangle' | 'rectangle' | 'ellipse'; x: number; y: number; width: number; height: number; rotation: number; vertices?: Point2D[] }
export type LegacyScene = { version: 1; width: number; height: number; style: LegacyStyle; objects: LegacyObject[] }
const legacyStyle: LegacyStyle = { background: '#fafafa', stroke: '#252630', strokeWidth: 2, blue: '#365edb', pink: '#d52368', alpha: 55 }
export function migrateV1(value: unknown): Scene | null {
  if (!record(value) || value.version !== 1 || !validCanvas(value.width, value.height) || !record(value.style) || !Array.isArray(value.objects)) return null
  const style = value.style
  if (![style.background, style.stroke, style.blue, style.pink].every(color) || !finite(style.strokeWidth) || style.strokeWidth < 0 || !finite(style.alpha) || style.alpha < 0 || style.alpha > 255) return null
  const objects: SceneObject[] = []
  for (const v of value.objects) {
    if (!record(v) || typeof v.id !== 'string' || !['triangle', 'rectangle', 'ellipse'].includes(String(v.type)) || ![v.x, v.y, v.width, v.height, v.rotation].every(finite) || (v.width as number) < 0 || (v.height as number) < 0) return null
    const o = v as unknown as LegacyObject
    if (o.type === 'triangle' && (!Array.isArray(o.vertices) || o.vertices.length !== 3 || !o.vertices.every(point))) return null
    const name = `${o.type[0].toUpperCase() + o.type.slice(1)} ${objects.length + 1}`
    objects.push({ id: o.id, name, type: o.type, x: o.x, y: o.y, rotation: o.rotation, scaleX: 1, scaleY: 1, proportional: false, visible: true, locked: false,
      geometry: o.type === 'triangle' ? { kind: 'vertices', points: o.vertices!.map(p => ({ x: p.x * o.width, y: p.y * o.height })) } : { kind: 'box', width: o.width, height: o.height },
      appearance: { fill: { kind: 'gradient', start: { x: 0, y: 0 }, end: { x: value.width as number, y: value.height as number }, blue: style.blue as string, pink: style.pink as string, alpha: style.alpha }, stroke: style.stroke as string, strokeWidth: style.strokeWidth, opacity: 1 } })
  }
  const scene: Scene = { version: 2, width: value.width as number, height: value.height as number, background: style.background as string, objects }
  return isScene(scene) ? scene : null
}
export function migrateShapes(shapes: SerializedShape[], sketchId: string): Scene {
  const legacy: LegacyScene = { version: 1, width: 800, height: 640, style: legacyStyle, objects: shapes.map((s, i) => {
    const id = `${sketchId}-shape-${i}`
    if (s.type === 'triangle') {
      const object = fromPoints(s.type, s.vertices, id), points = object.geometry.kind === 'vertices' ? object.geometry.points : []
      const xs = points.map(p => p.x), ys = points.map(p => p.y), width = Math.max(1, Math.max(...xs) - Math.min(...xs)), height = Math.max(1, Math.max(...ys) - Math.min(...ys))
      return { id, type: s.type, x: object.x, y: object.y, width, height, rotation: 0, vertices: points.map(p => ({ x: p.x / width, y: p.y / height })) }
    }
    return { id, type: s.type, x: s.type === 'rectangle' ? s.topLeft.x + s.width / 2 : s.center.x, y: s.type === 'rectangle' ? s.topLeft.y + s.height / 2 : s.center.y, width: s.width, height: s.height, rotation: 0 }
  }) }
  return migrateV1(legacy) ?? emptyScene()
}
export function parseSavedScene(scene: unknown, shapes: unknown, id: string): Scene | null {
  if (isScene(scene)) return scene
  if (record(scene) && scene.version === 1) return migrateV1(scene)
  return Array.isArray(shapes) && shapes.every(isSerializedShape) ? migrateShapes(shapes, id) : null
}
export function projectJSON(scene: Scene, name: string) {
  return JSON.stringify({ format: 'p5-lab-project', version: 1, name, scene }, null, 2)
}
export function parseProject(text: string): { name: string; scene: Scene } {
  if (new TextEncoder().encode(text).length > 10 * 1024 * 1024) throw new Error('Project exceeds 10 MB.')
  let value: unknown
  try { value = JSON.parse(text) } catch { throw new Error('Invalid JSON file.') }
  if (!record(value) || value.format !== 'p5-lab-project' || value.version !== 1) throw new Error('Unsupported project format or version.')
  if (typeof value.name !== 'string' || !value.name.trim() || !isScene(value.scene)) throw new Error('Invalid project scene.')
  return { name: value.name.trim(), scene: value.scene }
}
