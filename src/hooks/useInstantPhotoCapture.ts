import { useCallback, useRef } from 'react'
import type { CaptureFn } from '../types'

/**
 * Convenience hook for storing and invoking a `CaptureFn` imperatively.
 *
 * Pass `onRender` to an `InstantPhotoFrame` or `InstantPhotoImageEditor` prop,
 * then call `ref.current?.()` at any time to export the processed image.
 *
 * ```tsx
 * const { ref: capture, onRender } = useInstantPhotoCapture()
 *
 * <InstantPhotoFrame src={src} onRender={onRender} />
 *
 * // later:
 * const blob = await capture.current?.()
 * ```
 */
export function useInstantPhotoCapture(): {
  ref: React.RefObject<CaptureFn | null>
  onRender: (fn: CaptureFn) => void
} {
  const ref = useRef<CaptureFn | null>(null)
  const onRender = useCallback((fn: CaptureFn) => {
    ref.current = fn
  }, [])
  return { ref, onRender }
}
