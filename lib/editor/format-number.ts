/** Most literals differ by at most 0.0005. Tiny values keep six significant digits
 * if rounding to three decimal places would lose more than 1% of their value. */
export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) throw new RangeError('Cannot export a non-finite number.')
  if (value === 0) return '0'
  const rounded = Number(value.toFixed(3))
  if (rounded === 0 || Math.abs(rounded - value) > Math.abs(value) * 0.01) return String(Number(value.toPrecision(6)))
  return String(rounded)
}
