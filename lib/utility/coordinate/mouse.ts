import type p5 from 'p5'

export function getMouseCoordinates(p: p5): p5.Vector | null {
  if (p.mouseX < 0 || p.mouseY < 0 || p.mouseX >= p.width || p.mouseY >= p.height) return null
  return p.createVector(p.mouseX, p.mouseY)
}

export function showMouseCoordinates(p: p5, foreground: string, background: string) {
  const point = getMouseCoordinates(p)
  if (!point) return
  p.push()
  p.resetMatrix()
  p.noStroke()
  p.fill(background)
  p.rectMode(p.CORNER)
  p.rect(12, 12, 230, 40, 6)
  p.fill(foreground)
  p.textFont('monospace')
  p.textSize(20)
  p.textAlign(p.LEFT, p.CENTER)
  p.text(`x: ${point.x.toFixed(0)}  y: ${point.y.toFixed(0)}`, 24, 32)
  p.pop()
}

export function logMouseCoordinates(p: p5): p5.Vector | null {
  const point = getMouseCoordinates(p)
  if (point) console.log('[coordinates] Mouse click', point)
  return point
}
