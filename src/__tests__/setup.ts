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
// createImageBitmap – not implemented in jsdom
// ---------------------------------------------------------------------------
global.createImageBitmap = async (source: ImageBitmapSource): Promise<ImageBitmap> => {
  const el = source as HTMLImageElement
  return {
    width: el.naturalWidth ?? 1,
    height: el.naturalHeight ?? 1,
    close() {},
  } as ImageBitmap
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
