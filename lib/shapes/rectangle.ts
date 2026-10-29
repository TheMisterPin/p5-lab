import type p5 from 'p5'
import { createPointCapture } from './capture'

export type RectangleShape = { type: 'rectangle'; topLeft: p5.Vector; bottomRight: p5.Vector; width: number; height: number }

export function createRectangleCapture(p: p5) {
  return createPointCapture<RectangleShape>(2, ([a, b]) => {
    const topLeft = p.createVector(Math.min(a.x, b.x), Math.min(a.y, b.y))
    const bottomRight = p.createVector(Math.max(a.x, b.x), Math.max(a.y, b.y))
    return { type: 'rectangle', topLeft, bottomRight, width: bottomRight.x - topLeft.x, height: bottomRight.y - topLeft.y }
  }, 'Rectangle')
}

export function drawRectangle(p: p5, shape: RectangleShape) {
  p.push()
  p.rectMode(p.CORNER)
  p.rect(shape.topLeft.x, shape.topLeft.y, shape.width, shape.height)
  p.pop()
}
