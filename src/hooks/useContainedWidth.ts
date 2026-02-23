import { useLayoutEffect, useState } from 'react'

function parseRequestedWidth(width: number | string, parentWidth: number): number {
  if (typeof width === 'number') return width

  const raw = width.trim()
  if (raw.endsWith('%')) {
    const pct = Number.parseFloat(raw.slice(0, -1))
    return Number.isFinite(pct) ? (parentWidth * pct) / 100 : parentWidth
  }
  if (raw.endsWith('px')) {
    const px = Number.parseFloat(raw.slice(0, -2))
    return Number.isFinite(px) ? px : parentWidth
  }

  const n = Number.parseFloat(raw)
  return Number.isFinite(n) ? n : parentWidth
}

/**
 * Fits a frame to its parent box while preserving aspect ratio.
 * Width is constrained by parent width and, when parent height is explicitly
 * constrained, by the maximum width that still fits the parent height.
 */
export function useContainedWidth(
  frameRef: React.RefObject<HTMLElement | null>,
  requestedWidth: number | string,
  frameAspect: number
): number | string {
  const [fitWidth, setFitWidth] = useState<number | null>(null)

  useLayoutEffect(() => {
    const frame = frameRef.current
    if (!frame) return

    const parent = frame.parentElement
    if (!parent || typeof ResizeObserver === 'undefined') return

    const update = () => {
      const parentRect = parent.getBoundingClientRect()
      const parentWidth = parentRect.width
      if (!Number.isFinite(parentWidth) || parentWidth <= 0) return

      const requestedPx = parseRequestedWidth(requestedWidth, parentWidth)
      let nextWidth = Math.min(requestedPx, parentWidth)

      // Only apply height constraint if parent height is explicitly set.
      const parentStyle = window.getComputedStyle(parent)
      const hasExplicitParentHeight = parentStyle.height !== 'auto'
      if (hasExplicitParentHeight) {
        const parentHeight = parentRect.height
        if (Number.isFinite(parentHeight) && parentHeight > 0) {
          nextWidth = Math.min(nextWidth, parentHeight * frameAspect)
        }
      }

      if (Number.isFinite(nextWidth) && nextWidth > 0) {
        setFitWidth(prev => {
          if (prev === null) return nextWidth
          return Math.abs(prev - nextWidth) > 0.25 ? nextWidth : prev
        })
      }
    }

    update()
    const ro = new ResizeObserver(() => update())
    ro.observe(parent)
    return () => ro.disconnect()
  }, [frameRef, requestedWidth, frameAspect])

  return fitWidth ?? requestedWidth
}
