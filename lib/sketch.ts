import type p5 from 'p5'
import { logMouseCoordinates, showMouseCoordinates } from './utility/coordinate/mouse'
import { createTriangleCapture, drawTriangle, type TriangleShape } from './shapes/triangle'
import { createRectangleCapture, drawRectangle, type RectangleShape } from './shapes/rectangle'
import { createEllipseCapture, drawEllipse, type EllipseShape } from './shapes/ellipse'
import { applyGradientFill, createLinearGradient } from './styles/gradients'

export type ShapeTool = 'pointer' | 'triangle' | 'rectangle' | 'ellipse'
export type SketchControls = {
  paused: boolean
  reset: boolean
  tool: ShapeTool
  drawingEnabled?: boolean
  onCaptureProgress?: (count: number, completed: boolean) => void
}

export function createSketch(controls: SketchControls, onReady: () => void) {
  return (p: p5) => {
    let time = 0
    let paper = '#fafafa'
    let pink = '#d52368'
    let blue = '#365edb'
    let foreground = '#252630'
    let activeTool = controls.tool
    const captures = {
      triangle: createTriangleCapture(),
      rectangle: createRectangleCapture(p),
      ellipse: createEllipseCapture(p),
    }
    let shapes: (TriangleShape | RectangleShape | EllipseShape)[] = []

    function syncTool() {
      if (activeTool === controls.tool) return
      Object.values(captures).forEach(capture => capture.reset())
      activeTool = controls.tool
    }

    p.mouseMoved = () => { if (controls.paused) void p.redraw() }

    p.setup = () => {
      const styles = getComputedStyle(document.documentElement)
      paper = styles.getPropertyValue('--card').trim() || paper
      pink = styles.getPropertyValue('--primary').trim() || pink
      blue = styles.getPropertyValue('--ink-blue').trim() || blue
      foreground = styles.getPropertyValue('--foreground').trim() || foreground
      const canvas = p.createCanvas(800, 640)
      canvas.mouseClicked(() => {
        if (controls.drawingEnabled === false) return
        syncTool()
        const point = logMouseCoordinates(p)
        if (!point || activeTool === 'pointer') return
        const capture = captures[activeTool]
        const shape = capture.addPoint(point)
        if (shape) shapes.push(shape)
        controls.onCaptureProgress?.(capture.points.length, !!shape)
        if (controls.paused) void p.redraw()
      })
      canvas.attribute('role', 'img')
      canvas.attribute('aria-label', controls.drawingEnabled === false ? 'Animated pink and blue ribbons. Move your pointer to bend the pattern.' : 'Interactive sketch canvas. Select a shape tool, then click to register its coordinates. Mouse coordinates appear at the top left.')
      p.pixelDensity(Math.min(window.devicePixelRatio || 1, 2))
      p.frameRate(30)
      p.noFill()
      onReady()
    }

    p.draw = () => {
      syncTool()
      if (controls.reset) {
        time = 0
        shapes = []
        Object.values(captures).forEach(capture => capture.reset())
        controls.onCaptureProgress?.(0, false)
        controls.reset = false
      }
      p.background(paper)
      p.push()
      p.translate(p.width / 2, p.height / 2)
      const inside = p.mouseX > 0 && p.mouseX < p.width && p.mouseY > 0 && p.mouseY < p.height
      const bend = inside ? (p.mouseX / p.width - 0.5) * 0.3 : 0
      p.rotate(-0.35)
      p.strokeWeight(1.15)
      for (let ribbon = 0; ribbon < 70; ribbon++) {
        const fraction = ribbon / 69
        p.stroke(p.lerpColor(p.color(blue), p.color(pink), fraction))
        p.beginShape()
        for (let step = 0; step <= 240; step++) {
          const angle = (step / 240) * p.TWO_PI
          const wave = Math.sin(angle * 3 + fraction * 3.8 + time) * 30
          const radius = 170 + fraction * 50 + wave
          const x = Math.cos(angle) * radius
          const y = Math.sin(angle) * radius * (0.72 + 0.24 * Math.cos(fraction * 4 + time * 0.3))
          const twist = fraction * 2.5 + Math.sin(time * 0.2) * 0.25 + bend
          p.vertex(x * Math.cos(twist) - y * Math.sin(twist), x * Math.sin(twist) + y * Math.cos(twist))
        }
        p.endShape(p.CLOSE)
      }
      p.pop()
      if (controls.drawingEnabled !== false) {
      p.push()
      p.stroke(foreground)
      p.strokeWeight(2)
      const startColor = p.color(blue)
      const endColor = p.color(pink)
      startColor.setAlpha(55)
      endColor.setAlpha(55)
      applyGradientFill(p, createLinearGradient(p, p.createVector(0, 0), p.createVector(p.width, p.height), [
        { offset: 0, color: startColor }, { offset: 1, color: endColor },
      ]))
      for (const shape of shapes) {
        if (shape.type === 'triangle') drawTriangle(p, shape)
        else if (shape.type === 'rectangle') drawRectangle(p, shape)
        else drawEllipse(p, shape)
      }
      if (activeTool !== 'pointer') {
        p.fill(pink)
        p.noStroke()
        for (const point of captures[activeTool].points) p.circle(point.x, point.y, 10)
      }
      p.pop()
      showMouseCoordinates(p, foreground, paper)
      }
      if (!controls.paused) time += Math.min(p.deltaTime, 50) * 0.00035
      else p.noLoop()
    }
  }
}
