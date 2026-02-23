// ---------------------------------------------------------------------------
// Shared capture utilities used by PolaroidFrame and PolaroidImageEditor.
// ---------------------------------------------------------------------------

import type { ExportFormat, FrameSpec } from '../types'
import { IMAGE_CORNER_RADIUS_FACTOR } from '../presets/profiles'

const EXPORT_IMAGE_CORNER_RADIUS_MULTIPLIER = 2.0
const IMAGE_CAPTURE_IMAGE_CORNER_RADIUS_FACTOR =
  IMAGE_CORNER_RADIUS_FACTOR * EXPORT_IMAGE_CORNER_RADIUS_MULTIPLIER
// Full-frame export can tolerate a slightly stronger inner photo radius than
// image-only export, so the rounded image edges remain visible after encoding.
const FRAME_CAPTURE_IMAGE_CORNER_RADIUS_FACTOR =
  (IMAGE_CORNER_RADIUS_FACTOR + 0.16) * EXPORT_IMAGE_CORNER_RADIUS_MULTIPLIER

/**
 * Draws a rounded rectangle path on a 2D context.
 * Uses the native `roundRect` where available (Chrome 99+, Firefox 112+,
 * Safari 15.4+), with a manual arc fallback for older browsers.
 */
export function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, r)
    return
  }
  // Manual fallback
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.arcTo(x + w, y, x + w, y + r, r)
  ctx.lineTo(x + w, y + h - r)
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
  ctx.lineTo(x + r, y + h)
  ctx.arcTo(x, y + h, x, y + h - r, r)
  ctx.lineTo(x, y + r)
  ctx.arcTo(x, y, x + r, y, r)
}

function toBlobAsync(
  canvas: HTMLCanvasElement,
  format: ExportFormat,
  quality: number | undefined
): Promise<Blob | null> {
  return new Promise<Blob | null>(resolve => canvas.toBlob(resolve, format, quality))
}

/**
 * Exports only the processed image area and preserves subtle rounded corners.
 * Corners are transparent for alpha-capable formats; JPEG gets a paper-colored
 * background so clipped corners don't turn black.
 */
export function buildImageCapture(
  canvas: HTMLCanvasElement,
  spec: FrameSpec,
  format: ExportFormat,
  quality: number | undefined
): Promise<Blob | null> {
  const scale = canvas.width / spec.imageSize[0]
  const cornerR = spec.cornerRadius * scale
  const imageCornerR = Math.max(1, cornerR * IMAGE_CAPTURE_IMAGE_CORNER_RADIUS_FACTOR)

  const offscreen = document.createElement('canvas')
  offscreen.width = canvas.width
  offscreen.height = canvas.height

  const ctx = offscreen.getContext('2d')
  if (!ctx) return Promise.resolve(null)

  // JPEG has no alpha; prefill so clipped corners remain visually clean.
  if (format === 'image/jpeg') {
    ctx.fillStyle = spec.paperColor
    ctx.fillRect(0, 0, offscreen.width, offscreen.height)
  }

  ctx.save()
  ctx.beginPath()
  drawRoundedRect(ctx, 0.5, 0.5, canvas.width - 1, canvas.height - 1, imageCornerR)
  ctx.clip()
  ctx.drawImage(canvas, 0, 0, canvas.width, canvas.height)
  ctx.restore()

  return toBlobAsync(offscreen, format, quality)
}

/**
 * Composites the WebGL canvas onto a larger off-screen canvas that
 * includes the white paper border, matching the format's authentic
 * proportions at 300 DPI.
 */
export function buildFrameCapture(
  canvas: HTMLCanvasElement,
  spec: FrameSpec,
  format: ExportFormat,
  quality: number | undefined
): Promise<Blob | null> {
  const scale = canvas.width / spec.imageSize[0]

  const frameW = Math.round(spec.totalSize[0] * scale)
  const frameH = Math.round(spec.totalSize[1] * scale)
  const imageX = Math.round(spec.imagePos[0] * scale)
  const imageY = Math.round(spec.imagePos[1] * scale)
  const cornerR = spec.cornerRadius * scale
  const frameCornerR = Math.max(1, cornerR * 0.65)
  const imageCornerR = Math.max(1, cornerR * FRAME_CAPTURE_IMAGE_CORNER_RADIUS_FACTOR)

  const offscreen = document.createElement('canvas')
  offscreen.width = frameW
  offscreen.height = frameH

  const ctx = offscreen.getContext('2d')
  if (!ctx) return Promise.resolve(null)

  // White paper background with authentic rounded corners
  ctx.fillStyle = spec.paperColor
  ctx.beginPath()
  drawRoundedRect(ctx, 0.5, 0.5, frameW - 1, frameH - 1, frameCornerR)
  ctx.fill()

  // Clip the photo area to subtle rounded corners before compositing.
  ctx.save()
  ctx.beginPath()
  drawRoundedRect(ctx, imageX + 0.5, imageY + 0.5, canvas.width - 1, canvas.height - 1, imageCornerR)
  ctx.clip()
  ctx.drawImage(canvas, imageX, imageY, canvas.width, canvas.height)
  ctx.restore()

  return toBlobAsync(offscreen, format, quality)
}
