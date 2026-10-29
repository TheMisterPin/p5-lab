import type p5 from 'p5'

export type SketchControls = {
  paused: boolean
  reset: boolean
}

export function createSketch(controls: SketchControls, onReady: () => void) {
  return (p: p5) => {
    let time = 0
    let paper = '#fafafa'
    let pink = '#d52368'
    let blue = '#365edb'

    p.setup = () => {
      const styles = getComputedStyle(document.documentElement)
      paper = styles.getPropertyValue('--card').trim() || paper
      pink = styles.getPropertyValue('--primary').trim() || pink
      blue = styles.getPropertyValue('--ink-blue').trim() || blue
      const canvas = p.createCanvas(800, 640)
      canvas.attribute('role', 'img')
      canvas.attribute('aria-label', 'Animated pink and blue ribbon loops. Move your pointer over the canvas to bend the pattern.')
      p.pixelDensity(Math.min(window.devicePixelRatio || 1, 2))
      p.frameRate(30)
      p.noFill()
      onReady()
    }

    p.draw = () => {
      if (controls.reset) {
        time = 0
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
      if (!controls.paused) time += Math.min(p.deltaTime, 50) * 0.00035
      else p.noLoop()
    }
  }
}
