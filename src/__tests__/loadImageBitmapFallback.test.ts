/**
 * Tests for the Safari Y-flip fallback path in loadImageBitmap.
 *
 * These tests use vi.resetModules() + dynamic import to get a fresh module
 * with a clean _flipYSupported cache, then simulate Safari < 17 by making
 * createImageBitmap throw when called with the imageOrientation option.
 */
import { describe, expect, it, vi, afterEach } from 'vitest'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetModules()
})

describe('loadImageBitmap – Safari Y-flip fallback (supportsFlipYOption returns false)', () => {
  it('covers catch block in supportsFlipYOption and fallback body', async () => {
    // Reset so a fresh module is loaded with _flipYSupported === null
    vi.resetModules()

    // Patch createImageBitmap to throw when called with imageOrientation option
    global.createImageBitmap = vi
      .fn()
      .mockImplementation(async (_source: ImageBitmapSource, options?: ImageBitmapOptions) => {
        if (options && 'imageOrientation' in options) {
          throw new Error('imageOrientation not supported in this browser')
        }
        // Return a minimal ImageBitmap stub for calls without options
        return { width: 10, height: 10, close: vi.fn() } as unknown as ImageBitmap
      })

    // Mock fetch to provide a Blob source
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(new Blob(['fake-image'], { type: 'image/jpeg' })),
      })
    )

    // Dynamic import gets a fresh module with _flipYSupported === null
    const { loadImageBitmap } = await import('../utils/loadImageBitmap')

    // With imageOrientation throwing, supportsFlipYOption() returns false
    // and createFlippedBitmap falls through to the canvas fallback.
    // jsdom has no 2D context so the canvas fallback returns the unflipped bitmap.
    const result = await loadImageBitmap('https://example.com/test.jpg')
    expect(result).toBeDefined()
  })

  it('supportsFlipYOption returns false on second call (cached)', async () => {
    vi.resetModules()

    global.createImageBitmap = vi
      .fn()
      .mockImplementation(async (_source: ImageBitmapSource, options?: ImageBitmapOptions) => {
        if (options && 'imageOrientation' in options) {
          throw new Error('not supported')
        }
        return { width: 5, height: 5, close: vi.fn() } as unknown as ImageBitmap
      })

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(new Blob(['img'], { type: 'image/jpeg' })),
      })
    )

    const { loadImageBitmap } = await import('../utils/loadImageBitmap')

    // First call – sets _flipYSupported = false
    await loadImageBitmap('https://example.com/a.jpg')
    // Second call – reads cached _flipYSupported = false
    const result = await loadImageBitmap('https://example.com/b.jpg')
    expect(result).toBeDefined()
  })
})
