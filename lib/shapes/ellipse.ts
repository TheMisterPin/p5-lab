import type p5 from 'p5'
import { createPointCapture } from './capture'

export type EllipseShape = { type: 'ellipse'; center: p5.Vector; radius: p5.Vector; width: number; height: number }

export function createEllipseCapture(p: p5) {
  return createPointCapture<EllipseShape>(2, ([center, extent]) => {
    const radius = p.createVector(Math.abs(extent.x - center.x), Math.abs(extent.y - center.y))
    return { type: 'ellipse', center, radius, width: radius.x * 2, height: radius.y * 2 }
  }, 'Ellipse')
}

export function drawEllipse(p: p5, shape: EllipseShape) {
  p.push()
  p.ellipseMode(p.CENTER)
  p.ellipse(shape.center.x, shape.center.y, shape.width, shape.height)
  p.pop()
}
