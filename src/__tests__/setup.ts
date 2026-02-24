import '@testing-library/jest-dom'

// ---------------------------------------------------------------------------
// ResizeObserver – not implemented in jsdom
// ---------------------------------------------------------------------------
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// ---------------------------------------------------------------------------
// ImageBitmap – not implemented in jsdom
// Provides a minimal class so `instanceof ImageBitmap` and `createImageBitmap`
// return values work correctly in tests.
// ---------------------------------------------------------------------------
class ImageBitmapStub {
  width: number
  height: number
  constructor(w = 1, h = 1) {
    this.width = w
    this.height = h
  }
  close() {}
}

;(global as unknown as Record<string, unknown>).ImageBitmap = ImageBitmapStub

// ---------------------------------------------------------------------------
// HTMLElement.setPointerCapture / releasePointerCapture – not in jsdom
// ---------------------------------------------------------------------------
if (!HTMLElement.prototype.setPointerCapture) {
  HTMLElement.prototype.setPointerCapture = () => {}
}
if (!HTMLElement.prototype.releasePointerCapture) {
  HTMLElement.prototype.releasePointerCapture = () => {}
}

// ---------------------------------------------------------------------------
// HTMLCanvasElement.toBlob – unconditionally stub for jsdom.
// jsdom may define toBlob but never invoke the callback without the `canvas`
// package.  We always override to guarantee the callback fires synchronously.
// ---------------------------------------------------------------------------
HTMLCanvasElement.prototype.toBlob = function (
  callback: BlobCallback,
  type?: string,
  _quality?: number
) {
  callback(new Blob(['<canvas>'], { type: type ?? 'image/png' }))
}

// ---------------------------------------------------------------------------
// createImageBitmap – not implemented in jsdom
// Returns an actual ImageBitmapStub instance so instanceof checks work.
// ---------------------------------------------------------------------------
global.createImageBitmap = async (source: ImageBitmapSource): Promise<ImageBitmap> => {
  const el = source as HTMLImageElement
  return new ImageBitmapStub(el.naturalWidth ?? 1, el.naturalHeight ?? 1) as unknown as ImageBitmap
}

// ---------------------------------------------------------------------------
// HTMLCanvasElement.getContext('webgl') – returns null in jsdom, which
// causes InstantPhotoFrame/InstantPhotoImageEditor to call onError.  That is the
// correct behaviour we test; no full WebGL mock is needed here.
//
// jsdom writes "Not implemented: getContext()" directly to process.stderr,
// bypassing Vitest's console capture.  Filter it out at the stream level.
// ---------------------------------------------------------------------------
const _origStderrWrite = process.stderr.write.bind(process.stderr)
process.stderr.write = (chunk: unknown, ...rest: unknown[]) => {
  if (typeof chunk === 'string' && chunk.includes('Not implemented')) return true
  return (_origStderrWrite as (...args: unknown[]) => boolean)(chunk, ...rest)
}
