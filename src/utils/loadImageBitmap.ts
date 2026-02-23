// ---------------------------------------------------------------------------
// Shared async image loader used by both useInstantPhotoGL and useInteractiveGL.
// Accepts a URL string, HTMLImageElement, or already-decoded ImageBitmap.
// ---------------------------------------------------------------------------

/**
 * Feature-detect createImageBitmap with imageOrientation support.
 * Safari < 17 does not support the imageOrientation option, so the first call
 * caches the result to avoid per-load overhead.
 */
let _flipYSupported: boolean | null = null

async function supportsFlipYOption(): Promise<boolean> {
  if (_flipYSupported !== null) return _flipYSupported
  try {
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    await createImageBitmap(canvas, { imageOrientation: 'flipY' })
    _flipYSupported = true
  } catch {
    _flipYSupported = false
  }
  return _flipYSupported
}

/**
 * Create a Y-flipped ImageBitmap from a Blob, with a canvas-based fallback
 * for browsers (Safari < 17) that do not support imageOrientation: 'flipY'.
 */
async function createFlippedBitmap(blob: Blob): Promise<ImageBitmap> {
  if (await supportsFlipYOption()) {
    return createImageBitmap(blob, { imageOrientation: 'flipY' })
  }

  // Canvas-based Y-flip fallback for Safari
  const bitmap = await createImageBitmap(blob)
  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    // Can't flip – return unflipped bitmap as last resort
    return bitmap
  }
  ctx.translate(0, bitmap.height)
  ctx.scale(1, -1)
  ctx.drawImage(bitmap, 0, 0)
  bitmap.close()
  return createImageBitmap(canvas)
}

export async function loadImageBitmap(
  src: string | HTMLImageElement | ImageBitmap
): Promise<ImageBitmap | HTMLImageElement> {
  if (src instanceof ImageBitmap) return src

  if (src instanceof HTMLImageElement) {
    if (src.complete && src.naturalWidth > 0) return src
    return new Promise<HTMLImageElement>((resolve, reject) => {
      src.onload = () => resolve(src)
      src.onerror = () => reject(new Error('HTMLImageElement failed to load'))
    })
  }

  // URL string
  const response = await fetch(src)
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`)
  }
  const blob = await response.blob()
  return createFlippedBitmap(blob)
}
