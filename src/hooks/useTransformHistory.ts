// ---------------------------------------------------------------------------
// Undo/redo history for the image pan/zoom transform.
//
// History is stored in two ref-backed stacks (past / future) so that
// pushing, undoing and redoing never trigger React re-renders.
// ---------------------------------------------------------------------------

import { useCallback, useRef } from 'react'
import type { ImageTransform } from '../types'

const MAX_HISTORY = 50

export interface UseTransformHistoryResult {
  /**
   * Record the current transform state as a checkpoint.
   * Clears the redo stack (same behaviour as most editors).
   */
  push: (t: ImageTransform) => void
  /**
   * Step back one entry.  Returns the previous transform, or null if there
   * is nothing to undo.  The caller is responsible for updating transformRef
   * and re-rendering the canvas.
   */
  undo: () => ImageTransform | null
  /**
   * Step forward one entry.  Returns the next transform, or null if there
   * is nothing to redo.
   */
  redo: () => ImageTransform | null
  /** Returns true when there is at least one entry to undo. */
  canUndo: () => boolean
  /** Returns true when there is at least one entry to redo. */
  canRedo: () => boolean
  /** Discard all history (call when the source image or frame changes). */
  clear: () => void
}

export function useTransformHistory(
  transformRef: React.MutableRefObject<ImageTransform>
): UseTransformHistoryResult {
  // Each stack holds snapshots of ImageTransform; past[last] is the most recent checkpoint.
  const pastRef = useRef<ImageTransform[]>([])
  const futureRef = useRef<ImageTransform[]>([])

  const push = useCallback((t: ImageTransform) => {
    pastRef.current = [...pastRef.current.slice(-(MAX_HISTORY - 1)), { ...t }]
    futureRef.current = []
  }, [])

  const undo = useCallback((): ImageTransform | null => {
    if (pastRef.current.length === 0) return null
    const prev = pastRef.current[pastRef.current.length - 1]
    pastRef.current = pastRef.current.slice(0, -1)
    // Save current state to future stack so redo can restore it
    futureRef.current = [{ ...transformRef.current }, ...futureRef.current]
    return { ...prev }
  }, [transformRef])

  const redo = useCallback((): ImageTransform | null => {
    if (futureRef.current.length === 0) return null
    const next = futureRef.current[0]
    futureRef.current = futureRef.current.slice(1)
    // Save current state to past stack so undo can restore it
    pastRef.current = [...pastRef.current, { ...transformRef.current }]
    return { ...next }
  }, [transformRef])

  const canUndo = useCallback(() => pastRef.current.length > 0, [])
  const canRedo = useCallback(() => futureRef.current.length > 0, [])

  const clear = useCallback(() => {
    pastRef.current = []
    futureRef.current = []
  }, [])

  return { push, undo, redo, canUndo, canRedo, clear }
}
