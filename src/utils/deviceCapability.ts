/**
 * Heuristic to detect low-end or mobile devices.
 *
 * Returns `true` if:
 * - `navigator.hardwareConcurrency` is 2 or fewer (typical of budget phones), OR
 * - the user agent string matches a common mobile/tablet pattern.
 *
 * Returns `false` in SSR environments where `navigator` is not defined.
 */
export function detectLowEndDevice(): boolean {
  if (typeof navigator === 'undefined') return false
  const cores = navigator.hardwareConcurrency
  if (cores !== undefined && cores <= 2) return true
  return /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)
}
