// ---------------------------------------------------------------------------
// React hook that manages WebGL resources and drives re-renders.
//
// Canvas pixel dimensions are fixed at 300 DPI (from FrameSpec.canvasSize)
// regardless of display size.  CSS scales the canvas visually; the pixel
// buffer is always at print resolution so the canvas can be exported directly.
//
// Lifecycle:
//   1. useLayoutEffect (sync, before paint): set canvas.width / canvas.height
//      to the fixed 300 DPI dimensions.
//   2. useEffect (mount): create the WebGL pipeline, register context loss handlers.
//   3. useEffect (src change): load the image, render, then call onRender.
//   4. useEffect (options change): re-render with the cached image.
//   5. cleanup: destroy all GL resources on unmount.
// ---------------------------------------------------------------------------

import { useEffect, useLayoutEffect, useRef } from 'react'

import type { CaptureFn, PolaroidGLOptions } from '../types'
import { createPipeline, destroyPipeline, render, type Pipeline } from '../gl/pipeline'
import { loadImageBitmap } from '../utils/loadImageBitmap'

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function usePolaroidGL(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  src: string | HTMLImageElement | ImageBitmap,
  options: PolaroidGLOptions,
  callbacks: {
    onRender?: (capture: CaptureFn) => void
    onError?: (err: Error) => void
    /** Stable capture function created by the component; forwarded to onRender */
    captureFn: CaptureFn
  }
): void {
  // Stable ref to the GL pipeline (not part of React state)
  const pipelineRef = useRef<Pipeline | null>(null)
  // Latest resolved image – retained for re-renders triggered by option changes
  const imageRef = useRef<ImageBitmap | HTMLImageElement | null>(null)
  // Stable callback refs to avoid stale-closure issues in async paths
  const onRenderRef = useRef(callbacks.onRender)
  const onErrorRef = useRef(callbacks.onError)
  const captureFnRef = useRef(callbacks.captureFn)
  // Keep options accessible in context-restored handler without stale closure
  const optionsRef = useRef(options)

  useEffect(() => {
    onRenderRef.current = callbacks.onRender
    onErrorRef.current = callbacks.onError
    captureFnRef.current = callbacks.captureFn
    optionsRef.current = options
  })

  // -------------------------------------------------------------------------
  // 1. Fix canvas pixel dimensions at print resolution (synchronous, pre-paint)
  //
  // useLayoutEffect fires synchronously after DOM mutations and always before
  // any useEffect in the same render, guaranteeing the GL pipeline is
  // initialised at the correct canvas dimensions in step 2.
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
    }

    initPipeline()

    // GPU context can be lost when the tab is backgrounded or VRAM is exhausted.
    // Calling preventDefault() on contextlost signals the browser to restore it.
    function handleContextLost(e: Event) {
      e.preventDefault()
      pipelineRef.current = null
    }

    function handleContextRestored() {
      initPipeline()
      if (pipelineRef.current && imageRef.current) {
        render(pipelineRef.current, imageRef.current, optionsRef.current)
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
    }
    // canvasRef is a stable ref object – this only needs to run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // -------------------------------------------------------------------------
  // 3. Load image when src changes, render, then notify via onRender
  //
  // onRender is called only on image-load renders (not on options-only
  // re-renders) because the CaptureFn is stable: it always reads whatever
  // is currently on the canvas, so the consumer can call it at any time
  // to get the latest content, even after grain/vignette adjustments.
  // -------------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false

    loadImageBitmap(src)
      .then(img => {
        if (cancelled) return
        imageRef.current = img

        if (pipelineRef.current) {
          render(pipelineRef.current, img, options)
          onRenderRef.current?.(captureFnRef.current)
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return
        onErrorRef.current?.(err instanceof Error ? err : new Error(String(err)))
      })

    return () => {
      cancelled = true
    }
    // Re-run only when src changes; options are read via closure at render time
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src])

  // -------------------------------------------------------------------------
  // 4. Re-render when GL options change (image already loaded)
  //
  // canvasW / canvasH are included so that a frameType switch (which changes
  // canvas dimensions via useLayoutEffect above) also triggers a re-render.
  // By the time this effect fires, useLayoutEffect has already updated the
  // canvas dimensions.
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
      render(pipelineRef.current, imageRef.current, options)
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
}
