import type p5 from 'p5'
import type { Scene } from './scene'

export function drawScene(p: p5, scene: Scene) {
  const { style } = scene
  p.background(style.background)
  p.stroke(style.stroke)
  p.strokeWeight(style.strokeWidth)
  const blue = p.color(style.blue), pink = p.color(style.pink)
  blue.setAlpha(style.alpha); pink.setAlpha(style.alpha)
  const context = p.drawingContext as CanvasRenderingContext2D
  const gradient = context.createLinearGradient(0, 0, scene.width, scene.height)
  gradient.addColorStop(0, blue.toString()); gradient.addColorStop(1, pink.toString())
  p.fill(0)
  context.fillStyle = gradient
  for (const object of scene.objects) {
    p.push()
    p.translate(object.x, object.y)
    p.rotate(object.rotation)
    if (object.type === 'rectangle') {
      p.rectMode(p.CENTER)
      p.rect(0, 0, object.width, object.height)
    } else if (object.type === 'ellipse') {
      p.ellipseMode(p.CENTER)
      p.ellipse(0, 0, object.width, object.height)
    } else {
      const [a, b, c] = object.vertices!
      p.triangle(a.x * object.width, a.y * object.height, b.x * object.width, b.y * object.height, c.x * object.width, c.y * object.height)
    }
    p.pop()
  }
}

export function sceneToCode(scene: Scene): string {
  // Preserve numeric precision so export and visual rendering stay identical.
  const n = (value: number) => String(Object.is(value, -0) ? 0 : value)
  const { style } = scene
  const lines = [
    '// Created in Sketchbook. Edit freely — this is an independent code sketch.',
    'p.setup = () => {', `  p.createCanvas(${n(scene.width)}, ${n(scene.height)});`, '  p.noLoop();', '};', '',
    'p.draw = () => {', `  p.background(${JSON.stringify(style.background)});`,
    `  p.stroke(${JSON.stringify(style.stroke)});`, `  p.strokeWeight(${n(style.strokeWidth)});`, '',
    '  // A canvas-wide gradient, shared by all shapes.',
    `  const blue = p.color(${JSON.stringify(style.blue)});`, `  const pink = p.color(${JSON.stringify(style.pink)});`,
    `  blue.setAlpha(${style.alpha});`, `  pink.setAlpha(${style.alpha});`,
    '  const gradient = p.drawingContext.createLinearGradient(0, 0, p.width, p.height);',
    '  gradient.addColorStop(0, blue.toString());', '  gradient.addColorStop(1, pink.toString());',
    '  p.fill(0);', '  p.drawingContext.fillStyle = gradient;',
  ]
  scene.objects.forEach((o, index) => {
    lines.push('', `  // ${o.type[0].toUpperCase() + o.type.slice(1)} ${index + 1}`, '  p.push();', `  p.translate(${n(o.x)}, ${n(o.y)});`, `  p.rotate(${n(o.rotation)});`)
    if (o.type === 'triangle') {
      const coordinates = o.vertices!.flatMap(v => [n(v.x * o.width), n(v.y * o.height)])
      lines.push(`  p.triangle(${coordinates.join(', ')});`)
    } else {
      lines.push(`  p.${o.type === 'rectangle' ? 'rectMode' : 'ellipseMode'}(p.CENTER);`)
      lines.push(`  p.${o.type === 'rectangle' ? 'rect' : 'ellipse'}(0, 0, ${n(o.width)}, ${n(o.height)});`)
    }
    lines.push('  p.pop();')
  })
  return [...lines, '};', ''].join('\n')
}
