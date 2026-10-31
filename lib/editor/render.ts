import type p5 from 'p5'
import { dimensions, dotDiameter, openShape, type Scene, type SceneObject } from './scene'

type Call = { method: string; args: (number | string)[] }
/** Geometry is scaled here, once. Stroke and dot widths stay in canvas units. */
export function geometryCalls(object: SceneObject): Call[] {
  const { width, height } = dimensions(object)
  if (object.geometry.kind === 'box') return [{ method: object.type === 'ellipse' || object.type === 'circle' ? 'ellipse' : 'rect', args: [-width / 2, -height / 2, width, height] }]
  const points = object.geometry.points.map(p => ({ x: p.x * object.scaleX, y: p.y * object.scaleY }))
  return [{ method: 'beginShape', args: [] }, ...points.map(p => ({ method: 'vertex', args: [p.x, p.y] })), { method: 'endShape', args: openShape(object.type) ? [] : ['CLOSE'] }]
}
export function drawScene(p: p5, scene: Scene) {
  p.background(scene.background)
  p.rectMode(p.CORNER); p.ellipseMode(p.CORNER)
  const ctx = p.drawingContext as CanvasRenderingContext2D
  for (const object of scene.objects) {
    if (!object.visible) continue
    const a = object.appearance
    p.push()
    ctx.globalAlpha = a.opacity
    p.strokeWeight(a.strokeWidth)
    if (a.stroke === null) p.noStroke(); else p.stroke(a.stroke)
    if (openShape(object.type) || a.fill.kind === 'none') p.noFill()
    else if (a.fill.kind === 'solid') p.fill(a.fill.color)
    else {
      const f = a.fill, blue = p.color(f.blue), pink = p.color(f.pink)
      blue.setAlpha(f.alpha); pink.setAlpha(f.alpha)
      const gradient = ctx.createLinearGradient(f.start.x, f.start.y, f.end.x, f.end.y)
      gradient.addColorStop(0, blue.toString()); gradient.addColorStop(1, pink.toString())
      p.fill(0); ctx.fillStyle = gradient
    }
    p.translate(object.x, object.y); p.rotate(object.rotation)
    for (const call of geometryCalls(object)) {
      const args = call.args.map(v => v === 'CLOSE' ? p.CLOSE : v)
      ;(p[call.method as keyof p5] as (...args: unknown[]) => void)(...args)
    }
    if (object.type === 'polyline' && a.stroke && object.geometry.kind === 'vertices') {
      p.noStroke(); p.fill(a.stroke)
      const d = dotDiameter(object)
      for (const point of object.geometry.points) p.ellipse(point.x * object.scaleX - d / 2, point.y * object.scaleY - d / 2, d, d)
    }
    p.pop()
  }
}
export function sceneToCode(scene: Scene): string {
  const n = (v: number) => String(Object.is(v, -0) ? 0 : v)
  const lines = ['p.setup = () => {', `  p.createCanvas(${scene.width}, ${scene.height});`, '  p.noLoop();', '};', '', 'p.draw = () => {', `  p.background(${JSON.stringify(scene.background)});`, '  p.rectMode(p.CORNER);', '  p.ellipseMode(p.CORNER);']
  for (const object of scene.objects) {
    if (!object.visible) continue
    const a = object.appearance
    // JSON encoding keeps user-authored names on a single safe comment line.
    lines.push('', `  // ${JSON.stringify(object.name).replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029')}`, '  p.push();', `  p.drawingContext.globalAlpha = ${n(a.opacity)};`, `  p.strokeWeight(${n(a.strokeWidth)});`, a.stroke === null ? '  p.noStroke();' : `  p.stroke(${JSON.stringify(a.stroke)});`)
    if (openShape(object.type) || a.fill.kind === 'none') lines.push('  p.noFill();')
    else if (a.fill.kind === 'solid') lines.push(`  p.fill(${JSON.stringify(a.fill.color)});`)
    else {
      const f = a.fill
      lines.push('  {', `    const blue = p.color(${JSON.stringify(f.blue)}), pink = p.color(${JSON.stringify(f.pink)});`, `    blue.setAlpha(${f.alpha}); pink.setAlpha(${f.alpha});`,
        `    const gradient = p.drawingContext.createLinearGradient(${f.start.x}, ${f.start.y}, ${f.end.x}, ${f.end.y});`, '    gradient.addColorStop(0, blue.toString());', '    gradient.addColorStop(1, pink.toString());', '    p.fill(0);', '    p.drawingContext.fillStyle = gradient;', '  }')
    }
    lines.push(`  p.translate(${n(object.x)}, ${n(object.y)});`, `  p.rotate(${n(object.rotation)});`)
    for (const c of geometryCalls(object)) lines.push(`  p.${c.method}(${c.args.map(v => v === 'CLOSE' ? 'p.CLOSE' : typeof v === 'number' ? n(v) : JSON.stringify(v)).join(', ')});`)
    if (object.type === 'polyline' && a.stroke && object.geometry.kind === 'vertices') {
      const d = dotDiameter(object)
      lines.push('  p.noStroke();', `  p.fill(${JSON.stringify(a.stroke)});`)
      for (const v of object.geometry.points) lines.push(`  p.ellipse(${n(v.x * object.scaleX - d / 2)}, ${n(v.y * object.scaleY - d / 2)}, ${d}, ${d});`)
    }
    lines.push('  p.pop();')
  }
  return [...lines, '};', ''].join('\n')
}
