import type { Point2D } from '../sketches/types'

/** Display pixels only. Never serialize this state with a scene. */
export type Viewport = { x: number; y: number; scale: number }
export type Size = { width: number; height: number }
export const MIN_ZOOM = 0.001
export const MAX_ZOOM = 10000
export const clampZoom = (scale: number) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, scale))
export function fitViewport(stage: Size, artwork: Size, padding = 32): Viewport {
  const scale = clampZoom(Math.min(Math.max(1, stage.width - padding) / artwork.width, Math.max(1, stage.height - padding) / artwork.height))
  return { scale, x: (stage.width - artwork.width * scale) / 2, y: (stage.height - artwork.height * scale) / 2 }
}
export function sceneToScreen(view: Viewport, point: Point2D): Point2D {
  return { x: view.x + point.x * view.scale, y: view.y + point.y * view.scale }
}
export function screenToScene(view: Viewport, point: Point2D): Point2D {
  return { x: (point.x - view.x) / view.scale, y: (point.y - view.y) / view.scale }
}
export function zoomAt(view: Viewport, scale: number, anchor: Point2D): Viewport {
  const point = screenToScene(view, anchor), nextScale = clampZoom(scale)
  return { scale: nextScale, x: anchor.x - point.x * nextScale, y: anchor.y - point.y * nextScale }
}
export function panViewport(view: Viewport, delta: Point2D): Viewport {
  return { ...view, x: view.x + delta.x, y: view.y + delta.y }
}
/** SVG client bounds already include the CSS viewport transform. */
export function canvasClientPoint(client: Point2D, rect: { left: number; top: number; width: number; height: number }, artwork: Size): Point2D {
  return screenToScene({ x: rect.left, y: rect.top, scale: rect.width / artwork.width }, client)
}
/** Artwork edits use whole canvas pixels; zoom/pan mapping otherwise yields fractions. */
export const snapPixel = (value: number) => Math.round(value)
export const snapPoint = (point: Point2D): Point2D => ({ x: snapPixel(point.x), y: snapPixel(point.y) })
export const screenTolerance = (pixels: number, scale: number) => pixels / scale
