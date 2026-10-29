import type p5 from 'p5'

export type GradientStop = { offset: number; color: string | p5.Color }

function addStops(gradient: CanvasGradient, stops: readonly GradientStop[]) {
  if (stops.length < 2) throw new Error('A gradient requires at least two color stops.')
  for (const { offset, color } of stops) {
    if (!Number.isFinite(offset) || offset < 0 || offset > 1) {
      throw new RangeError('Gradient stop offsets must be between 0 and 1.')
    }
    gradient.addColorStop(offset, color.toString())
  }
  return gradient
}

function context2D(p: p5): CanvasRenderingContext2D {
  const context = p.drawingContext as CanvasRenderingContext2D
  if (typeof context.createLinearGradient !== 'function') {
    throw new Error('These gradient helpers require a p5 P2D canvas.')
  }
  return context
}

export function createLinearGradient(p: p5, start: p5.Vector, end: p5.Vector, stops: readonly GradientStop[]) {
  return addStops(context2D(p).createLinearGradient(start.x, start.y, end.x, end.y), stops)
}

export function createRadialGradient(p: p5, center: p5.Vector, radius: number, stops: readonly GradientStop[], innerRadius = 0) {
  if (!Number.isFinite(radius) || !Number.isFinite(innerRadius) || innerRadius < 0 || radius <= innerRadius) {
    throw new RangeError('The outer radius must be finite and greater than the non-negative inner radius.')
  }
  return addStops(context2D(p).createRadialGradient(center.x, center.y, innerRadius, center.x, center.y, radius), stops)
}

export function applyGradientFill(p: p5, gradient: CanvasGradient) {
  p.fill(0)
  context2D(p).fillStyle = gradient
}
