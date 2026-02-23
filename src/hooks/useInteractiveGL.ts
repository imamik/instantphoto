// ---------------------------------------------------------------------------
// Imperative GL hook for PolaroidImageEditor.
//
// Unlike usePolaroidGL (which drives renders from React state), this hook
// exposes renderFrame() for direct synchronous rendering from the gesture
// hot path, bypassing React re-renders entirely.
//
// The hook still uses React effects for the slow path (image load,
// film-effect changes), mirroring usePolaroidGL's lifecycle.
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'

import type { CaptureFn, ImageTransform, PolaroidGLOptions } from '../types'
import { computeCrop, createPipeline, destroyPipeline, render, type Pipeline } from '../gl/pipeline'
import { loadImageBitmap } from '../utils/loadImageBitmap'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UseInteractiveGLCallbacks {
  onRender?: (capture: CaptureFn) => void
  onError?: (err: Error) => void
  captureFn: CaptureFn
  onRenderDelay?: number
}

export interface UseInteractiveGLResult {
  /** Synchronous GL render using the current transform state. Call from gesture handlers. */
  renderFrame: () => void
  /** Lightweight preview render (raw source crop only, no film effects). */
  renderRawFrame: () => void
  /** Start the debounce timer that fires onRender after the last gesture. */
  scheduleOnRender: () => void
  /** Cancel any pending debounce timer (call at gesture start). */
  cancelOnRender: () => void
  /**
   * Base UV scale values from computeCrop, updated after each image load.
   * Used by useGestures to convert drag distance to UV-space pan increments.
   */
  cropRef: React.MutableRefObject<{ baseSX: number; baseSY: number } | null>
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useInteractiveGL(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  src: string | HTMLImageElement | ImageBitmap | undefined,
  options: PolaroidGLOptions,
  transformRef: React.MutableRefObject<ImageTransform>,
  callbacks: UseInteractiveGLCallbacks
): UseInteractiveGLResult {
  const pipelineRef = useRef<Pipeline | null>(null)
  const imageRef = useRef<ImageBitmap | HTMLImageElement | null>(null)
  const cropRef = useRef<{ baseSX: number; baseSY: number } | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sourceUploadedRef = useRef(false)
  const optionsRef = useRef(options)
  const onRenderRef = useRef(callbacks.onRender)
  const onErrorRef = useRef(callbacks.onError)
  const captureFnRef = useRef(callbacks.captureFn)
  const delayRef = useRef(callbacks.onRenderDelay ?? 600)

  // Keep all callback refs current on every render (no dep array)
  useEffect(() => {
    onRenderRef.current = callbacks.onRender
    onErrorRef.current = callbacks.onError
    captureFnRef.current = callbacks.captureFn
    delayRef.current = callbacks.onRenderDelay ?? 600
    optionsRef.current = options
  })

  // -------------------------------------------------------------------------
  // 1. Fix canvas pixel dimensions at print resolution (synchronous, pre-paint)
  // -------------------------------------------------------------------------
  const [canvasW, canvasH] = options.canvasSize

  useLayoutEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = canvasW
    canvas.height = canvasH
  }, [canvasRef, canvasW, canvasH])

  // -------------------------------------------------------------------------
  // 2. Initialise the GL pipeline once on mount; handle context loss/restore
  // -------------------------------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    function initPipeline() {
      const p = createPipeline(canvas!)
      if (!p) {
        onErrorRef.current?.(new Error('WebGL is not available in this browser'))
        return
      }
      pipelineRef.current = p
      sourceUploadedRef.current = false
    }

    initPipeline()

    // GPU context can be lost when the tab is backgrounded or VRAM is exhausted.
    // Calling preventDefault() on contextlost signals the browser to restore it.
    function handleContextLost(e: Event) {
      e.preventDefault()
      pipelineRef.current = null
      sourceUploadedRef.current = false
    }

    function handleContextRestored() {
      initPipeline()
      if (pipelineRef.current && imageRef.current) {
        render(pipelineRef.current, imageRef.current, optionsRef.current, transformRef.current, {
          skipUpload: false,
        })
        sourceUploadedRef.current = true
        onRenderRef.current?.(captureFnRef.current)
      }
    }

    canvas.addEventListener('webglcontextlost', handleContextLost)
    canvas.addEventListener('webglcontextrestored', handleContextRestored)

    return () => {
      canvas.removeEventListener('webglcontextlost', handleContextLost)
      canvas.removeEventListener('webglcontextrestored', handleContextRestored)
      if (pipelineRef.current) {
        destroyPipeline(pipelineRef.current)
        pipelineRef.current = null
      }
      sourceUploadedRef.current = false
    }
    // canvasRef is a stable ref — only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // -------------------------------------------------------------------------
  // renderFrame: synchronous GL render using the current transform state.
  // Called from the gesture hot path — zero React overhead.
  // -------------------------------------------------------------------------
  const renderFrame = useCallback(() => {
    if (pipelineRef.current && imageRef.current) {
      render(pipelineRef.current, imageRef.current, optionsRef.current, transformRef.current, {
        skipUpload: sourceUploadedRef.current,
      })
      sourceUploadedRef.current = true
    }
  }, [transformRef])

  const renderRawFrame = useCallback(() => {
    if (pipelineRef.current && imageRef.current) {
      render(pipelineRef.current, imageRef.current, optionsRef.current, transformRef.current, {
        skipUpload: sourceUploadedRef.current,
        rawPreview: true,
      })
      sourceUploadedRef.current = true
    }
  }, [transformRef])

  // -------------------------------------------------------------------------
  // Debounced onRender scheduling
  // -------------------------------------------------------------------------
  const cancelOnRender = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const scheduleOnRender = useCallback(() => {
    cancelOnRender()
    timerRef.current = setTimeout(() => {
      timerRef.current = null
      onRenderRef.current?.(captureFnRef.current)
    }, delayRef.current)
  }, [cancelOnRender])

  // -------------------------------------------------------------------------
  // 3. Load image when src changes, then render and fire onRender immediately
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!src) return
    let cancelled = false

    loadImageBitmap(src)
      .then(img => {
        if (cancelled) return
        imageRef.current = img
        sourceUploadedRef.current = false

        // Update crop ref so the gesture hook has correct drag sensitivity
        const srcW = 'naturalWidth' in img ? img.naturalWidth : img.width
        const srcH = 'naturalHeight' in img ? img.naturalHeight : img.height
        const { scale } = computeCrop(srcW, srcH, optionsRef.current.imageAspect)
        cropRef.current = { baseSX: scale[0], baseSY: scale[1] }

        if (pipelineRef.current) {
          render(pipelineRef.current, img, optionsRef.current, transformRef.current, {
            skipUpload: false,
          })
          sourceUploadedRef.current = true
          // No gesture in flight — fire onRender immediately
          onRenderRef.current?.(captureFnRef.current)
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return
        // Reset transform so stale pan/zoom doesn't persist after a failed load
        transformRef.current = { panX: 0, panY: 0, scale: 1 }
        cropRef.current = null
        onErrorRef.current?.(err instanceof Error ? err : new Error(String(err)))
      })

    return () => {
      cancelled = true
    }
    // Re-run only when src changes; options are read via optionsRef at render time
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src])

  // -------------------------------------------------------------------------
  // 4. Re-render when GL options change (preserves current transform)
  // -------------------------------------------------------------------------
  const {
    filmType,
    imageAspect,
    imageCornerRadiusPx,
    vignetteIntensity,
    halationAmount,
    grainAmount,
    grainSizePx,
    grainColorAmount,
    chromaticShift,
    saturationDelta,
    filmCurveAmount,
    shadowWideIntensity,
    shadowWideStart,
    shadowWideEnd,
    shadowFineIntensity,
    shadowFineStart,
    shadowFineEnd,
    seed,
  } = options

  useEffect(() => {
    if (pipelineRef.current && imageRef.current) {
      render(pipelineRef.current, imageRef.current, optionsRef.current, transformRef.current, {
        skipUpload: sourceUploadedRef.current,
      })
      sourceUploadedRef.current = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    canvasW,
    canvasH,
    filmType,
    imageAspect,
    imageCornerRadiusPx,
    vignetteIntensity,
    halationAmount,
    grainAmount,
    grainSizePx,
    grainColorAmount,
    chromaticShift,
    saturationDelta,
    filmCurveAmount,
    shadowWideIntensity,
    shadowWideStart,
    shadowWideEnd,
    shadowFineIntensity,
    shadowFineStart,
    shadowFineEnd,
    seed,
  ])

  return { renderFrame, renderRawFrame, scheduleOnRender, cancelOnRender, cropRef }
}
