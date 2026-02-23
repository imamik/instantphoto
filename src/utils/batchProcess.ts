// ---------------------------------------------------------------------------
// Batch processing utility — applies Polaroid/Instax effects to multiple
// images using a single off-screen WebGL canvas.
//
// Resources are created once and reused across all items, then torn down
// on completion or error.
// ---------------------------------------------------------------------------

import type { CaptureOptions, ExportFormat, FrameType, PolaroidGLOptions } from '../types'
import { FRAME_SPECS, getFrameInsets } from '../presets/profiles'
import { createPipeline, destroyPipeline, render } from '../gl/pipeline'
import { loadImageBitmap } from './loadImageBitmap'
import { buildFrameCapture, buildImageCapture } from '../gl/captureUtils'

export interface BatchItem {
  /** Image source — URL string, HTMLImageElement, or decoded ImageBitmap. */
  src: string | HTMLImageElement | ImageBitmap
}

export interface BatchProcessOptions {
  /** Frame format to apply. Defaults to `'polaroid_600'`. */
  frameType?: FrameType
  /** Capture target and format. Defaults to `{ target: 'image', format: 'image/png' }`. */
  captureOptions?: CaptureOptions
  /**
   * Called after each item completes.
   * @param completed - Number of items finished so far (1-based).
   * @param total     - Total number of items in the batch.
   */
  onProgress?: (completed: number, total: number) => void
  /** WebGL effect overrides applied to every item (filmType, grain, vignette, etc.). */
  glOptions?: Partial<Omit<PolaroidGLOptions, 'canvasSize' | 'imageAspect'>>
}

/**
 * Apply Polaroid / Instax film effects to a list of images off-screen and
 * return the resulting Blobs in the same order as `items`.
 *
 * A single WebGL canvas + pipeline is created and reused for all items,
 * making this significantly faster than mounting/unmounting React components.
 *
 * @throws {Error} If WebGL is unavailable in the current environment.
 *
 * ```ts
 * const blobs = await batchProcess(
 *   files.map(f => ({ src: URL.createObjectURL(f) })),
 *   { frameType: 'instax_mini', glOptions: { filmType: 'instax' }, onProgress: (n, t) => setProgress(n / t) }
 * )
 * ```
 */
export async function batchProcess(
  items: BatchItem[],
  options: BatchProcessOptions = {}
): Promise<Array<Blob | null>> {
  const {
    frameType = 'polaroid_600',
    captureOptions = {},
    onProgress,
    glOptions = {},
  } = options

  const spec = FRAME_SPECS[frameType]
  const insets = getFrameInsets(spec)

  const canvas = document.createElement('canvas')
  canvas.width = spec.canvasSize[0]
  canvas.height = spec.canvasSize[1]

  const pipeline = createPipeline(canvas)
  if (!pipeline) throw new Error('[batchProcess] WebGL is not available in this environment')

  const glFullOptions: PolaroidGLOptions = {
    canvasSize: spec.canvasSize,
    imageAspect: insets.imageAspect,
    filmType: 'polaroid',
    seed: 0,
    ...glOptions,
  }

  const { target = 'image', format = 'image/png' as ExportFormat, quality } = captureOptions
  const results: Array<Blob | null> = []

  try {
    for (let i = 0; i < items.length; i++) {
      const image = await loadImageBitmap(items[i].src)

      render(pipeline, image, {
        ...glFullOptions,
        // Randomise grain per image so they all look distinct
        seed: glFullOptions.seed !== 0 ? glFullOptions.seed : Math.random() * 9999,
      })

      const blob =
        target === 'frame'
          ? await buildFrameCapture(canvas, spec, format, quality)
          : await buildImageCapture(canvas, spec, format, quality)

      results.push(blob)
      onProgress?.(i + 1, items.length)
    }
  } finally {
    destroyPipeline(pipeline)
  }

  return results
}
