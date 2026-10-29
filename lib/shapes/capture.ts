import type p5 from 'p5'

export function createPointCapture<T>(count: number, build: (points: p5.Vector[]) => T, label: string) {
  let points: p5.Vector[] = []
  return {
    get points(): readonly p5.Vector[] { return points },
    reset() { points = [] },
    addPoint(point: p5.Vector): T | null {
      if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) return null
      points.push(point.copy())
      if (points.length < count) return null
      const result = build(points)
      points = []
      console.log(`[shapes] ${label}`, result)
      return result
    },
  }
}
