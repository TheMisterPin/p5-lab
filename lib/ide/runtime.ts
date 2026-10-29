import P5 from 'p5'
import * as coordinates from '../utility/coordinate/mouse'
import * as gradients from '../styles/gradients'
import * as triangle from '../shapes/triangle'
import * as rectangle from '../shapes/rectangle'
import * as ellipse from '../shapes/ellipse'

// p5's friendly-error checker fetches source files, which an opaque sandbox cannot read.
P5.disableFriendlyErrors = true

const helpers = Object.freeze({ ...coordinates, ...gradients, ...triangle, ...rectangle, ...ellipse })
let instance: P5 | undefined
let started = false
let messages = 0
let windowStart = performance.now()

function send(type: string, text?: string, level?: string) {
  window.parent.postMessage({ channel: 'sketchbook', type, text, level }, '*')
}

function describe(value: unknown): string {
  if (typeof value === 'string') return value.slice(0, 4000)
  if (value instanceof Error) return value.message
  const seen = new WeakSet<object>()
  try {
    return (JSON.stringify(value, (_key, item) => {
      if (item instanceof P5.Vector) return { type: 'p5.Vector', x: item.x, y: item.y, z: item.z }
      if (item && typeof item === 'object') {
        if (seen.has(item)) return '[Circular]'
        seen.add(item)
      }
      return item
    }, 2) ?? String(value)).slice(0, 4000)
  } catch { return String(value).slice(0, 4000) }
}

for (const level of ['log', 'info', 'warn', 'error'] as const) {
  console[level] = (...args: unknown[]) => {
    if (performance.now() - windowStart > 1000) {
      messages = 0
      windowStart = performance.now()
    }
    if (messages++ >= 30) return
    send('console', args.slice(0, 10).map(describe).join(' '), level)
  }
}

function fail(error: unknown) {
  instance?.noLoop()
  send('error', describe(error), 'error')
}

window.addEventListener('error', event => {
  fail(event.error || event.message)
  event.preventDefault()
})
window.addEventListener('unhandledrejection', event => {
  fail(event.reason)
  event.preventDefault()
})

window.addEventListener('message', event => {
  if (event.source !== window.parent || event.data?.channel !== 'sketchbook') return
  if (event.data.type === 'run' && !started && typeof event.data.code === 'string') {
    started = true
    try {
      // User JavaScript executes only in the opaque-origin, allow-scripts-only iframe.
      const execute = new Function('p', 'helpers', '"use strict";\n' + event.data.code)
      instance = new P5(p => {
        execute(p, helpers)
        const setup = p.setup
        p.setup = () => {
          try {
            const result = setup?.()
            Promise.resolve(result).then(() => send('running')).catch(fail)
          } catch (error) { fail(error) }
        }
        const draw = p.draw
        p.draw = () => {
          try { draw?.() } catch (error) { p.noLoop(); fail(error) }
        }
      }, document.getElementById('canvas-root')!)
    } catch (error) { fail(error) }
  }
})
