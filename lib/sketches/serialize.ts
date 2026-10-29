import type p5 from 'p5'
import type { TriangleShape } from '@/lib/shapes/triangle'
import type { RectangleShape } from '@/lib/shapes/rectangle'
import type { EllipseShape } from '@/lib/shapes/ellipse'
import type { Point2D, SerializedShape } from './types'

type LiveShape = TriangleShape | RectangleShape | EllipseShape

function point(vector: { x: number; y: number }): Point2D {
  return { x: vector.x, y: vector.y }
}

export function serializeShapes(shapes: LiveShape[]): SerializedShape[] {
  return shapes.map(shape => {
    if (shape.type === 'triangle') {
      return { type: 'triangle', vertices: [point(shape.vertices[0]), point(shape.vertices[1]), point(shape.vertices[2])] }
    }
    if (shape.type === 'rectangle') {
      return {
        type: 'rectangle',
        topLeft: point(shape.topLeft),
        bottomRight: point(shape.bottomRight),
        width: shape.width,
        height: shape.height,
      }
    }
    return {
      type: 'ellipse',
      center: point(shape.center),
      radius: point(shape.radius),
      width: shape.width,
      height: shape.height,
    }
  })
}

export function hydrateShapes(p: p5, shapes: SerializedShape[]): LiveShape[] {
  return shapes.map(shape => {
    if (shape.type === 'triangle') {
      return {
        type: 'triangle' as const,
        vertices: [
          p.createVector(shape.vertices[0].x, shape.vertices[0].y),
          p.createVector(shape.vertices[1].x, shape.vertices[1].y),
          p.createVector(shape.vertices[2].x, shape.vertices[2].y),
        ] as [p5.Vector, p5.Vector, p5.Vector],
      }
    }
    if (shape.type === 'rectangle') {
      return {
        type: 'rectangle' as const,
        topLeft: p.createVector(shape.topLeft.x, shape.topLeft.y),
        bottomRight: p.createVector(shape.bottomRight.x, shape.bottomRight.y),
        width: shape.width,
        height: shape.height,
      }
    }
    return {
      type: 'ellipse' as const,
      center: p.createVector(shape.center.x, shape.center.y),
      radius: p.createVector(shape.radius.x, shape.radius.y),
      width: shape.width,
      height: shape.height,
    }
  })
}

export function isSerializedShape(value: unknown): value is SerializedShape {
  if (!value || typeof value !== 'object') return false
  const shape = value as Record<string, unknown>
  if (shape.type === 'triangle' && Array.isArray(shape.vertices) && shape.vertices.length === 3) {
    return shape.vertices.every(isPoint2D)
  }
  if (shape.type === 'rectangle') {
    return isPoint2D(shape.topLeft) && isPoint2D(shape.bottomRight)
      && typeof shape.width === 'number' && typeof shape.height === 'number'
  }
  if (shape.type === 'ellipse') {
    return isPoint2D(shape.center) && isPoint2D(shape.radius)
      && typeof shape.width === 'number' && typeof shape.height === 'number'
  }
  return false
}

function isPoint2D(value: unknown): value is Point2D {
  if (!value || typeof value !== 'object') return false
  const pointValue = value as Record<string, unknown>
  return typeof pointValue.x === 'number' && typeof pointValue.y === 'number'
    && Number.isFinite(pointValue.x) && Number.isFinite(pointValue.y)
}
