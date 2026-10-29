import type p5 from 'p5'
import { createPointCapture } from './capture'

export type TriangleShape = { type: 'triangle'; vertices: [p5.Vector, p5.Vector, p5.Vector] }

export function createTriangleCapture() {
  return createPointCapture<TriangleShape>(3, ([a, b, c]) => ({ type: 'triangle', vertices: [a, b, c] }), 'Triangle')
}

export function drawTriangle(p: p5, shape: TriangleShape) {
  const [a, b, c] = shape.vertices
  p.triangle(a.x, a.y, b.x, b.y, c.x, c.y)
}
