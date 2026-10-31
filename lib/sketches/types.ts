import type { Scene } from '../editor/scene'

export type Point2D = { x: number; y: number }

export type SerializedShape =
  | { type: 'triangle'; vertices: [Point2D, Point2D, Point2D] }
  | { type: 'rectangle'; topLeft: Point2D; bottomRight: Point2D; width: number; height: number }
  | { type: 'ellipse'; center: Point2D; radius: Point2D; width: number; height: number }

export type SketchMeta = {
  id: string
  name: string
  updatedAt: number
}

export type CodeSketch = SketchMeta & { kind: 'code'; code: string }
export type InteractiveSketch = SketchMeta & { kind: 'interactive'; scene: Scene }
export type StoredSketch = CodeSketch | InteractiveSketch

export type SketchStore<T extends StoredSketch> = {
  version: 1
  activeId: string
  sketches: T[]
}
