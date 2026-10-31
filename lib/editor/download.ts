import type { Scene } from './scene'
import { sceneToCode } from './render'

export function downloadCode(scene: Scene, name: string) {
  const url = URL.createObjectURL(new Blob([sceneToCode(scene)], { type: 'text/javascript' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `${name.replace(/[^\w-]+/g, '-').toLowerCase() || 'sketch'}.js`
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
