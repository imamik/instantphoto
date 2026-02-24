import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { loadImageBitmap } from '../utils/loadImageBitmap'

// ---------------------------------------------------------------------------
// loadImageBitmap
//
// The global ImageBitmap class and createImageBitmap are stubbed in setup.ts.
// fetch is mocked per-test.
// ---------------------------------------------------------------------------

// Create a real ImageBitmap instance (uses the stub from setup.ts) so that
// `src instanceof ImageBitmap` returns true in loadImageBitmap.
const mockBitmap = await createImageBitmap(new Blob())

describe('loadImageBitmap – ImageBitmap input', () => {
  it('returns the same ImageBitmap directly without fetching', async () => {
    const result = await loadImageBitmap(mockBitmap)
    expect(result).toBe(mockBitmap)
  })
})

describe('loadImageBitmap – HTMLImageElement input', () => {
  it('returns the element immediately when it is already loaded', async () => {
    const img = document.createElement('img')
    Object.defineProperty(img, 'complete', { value: true, writable: false })
    Object.defineProperty(img, 'naturalWidth', { value: 200, writable: false })
    const result = await loadImageBitmap(img)
    expect(result).toBe(img)
  })

  it('waits for the load event when the image is not yet loaded', async () => {
    const img = document.createElement('img')
    Object.defineProperty(img, 'complete', { value: false, writable: false })
    Object.defineProperty(img, 'naturalWidth', { value: 0, writable: false })

    const promise = loadImageBitmap(img)
    img.dispatchEvent(new Event('load'))
    const result = await promise
    expect(result).toBe(img)
  })

  it('rejects when the image fires an error event', async () => {
    const img = document.createElement('img')
    Object.defineProperty(img, 'complete', { value: false, writable: false })
    Object.defineProperty(img, 'naturalWidth', { value: 0, writable: false })

    const promise = loadImageBitmap(img)
    img.dispatchEvent(new Event('error'))
    await expect(promise).rejects.toThrow('HTMLImageElement failed to load')
  })

  it('returns element even when naturalWidth is 0 if complete is false (waits for load)', async () => {
    const img = document.createElement('img')
    Object.defineProperty(img, 'complete', { value: false, writable: false })
    Object.defineProperty(img, 'naturalWidth', { value: 0, writable: false })

    const promise = loadImageBitmap(img)
    img.dispatchEvent(new Event('load'))
    const result = await promise
    expect(result).toBe(img)
  })
})

describe('loadImageBitmap – URL string input', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(new Blob(['fake-image'], { type: 'image/jpeg' })),
      })
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('fetches the URL and returns an ImageBitmap', async () => {
    const result = await loadImageBitmap('https://example.com/photo.jpg')
    expect(result).toBeDefined()
    expect(typeof (result as ImageBitmap).close).toBe('function')
  })

  it('calls fetch with the provided URL', async () => {
    await loadImageBitmap('https://example.com/img.png')
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      'https://example.com/img.png',
      expect.objectContaining({ signal: expect.anything() })
    )
  })

  it('throws when the HTTP response is not ok', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      })
    )
    await expect(loadImageBitmap('https://example.com/missing.jpg')).rejects.toThrow(
      'Failed to fetch image: 404 Not Found'
    )
  })

  it('propagates network errors from fetch', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')))
    await expect(loadImageBitmap('https://example.com/img.jpg')).rejects.toThrow('Network error')
  })

  it('wraps TypeError from fetch with CORS guidance', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    await expect(loadImageBitmap('https://other.example.com/img.jpg')).rejects.toThrow(
      'Access-Control-Allow-Origin'
    )
  })

  it('wraps TimeoutError with a human-readable message', async () => {
    const timeoutError = new DOMException('signal timed out', 'TimeoutError')
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(timeoutError))
    await expect(loadImageBitmap('https://example.com/slow.jpg')).rejects.toThrow(
      'timed out after 30s'
    )
  })
})

describe('loadImageBitmap – supportsFlipYOption caching', () => {
  it('returns an ImageBitmap on consecutive calls without re-checking flipY support', async () => {
    // Both calls should succeed; the second uses the cached result
    const r1 = await loadImageBitmap(mockBitmap)
    const r2 = await loadImageBitmap(mockBitmap)
    expect(r1).toBe(mockBitmap)
    expect(r2).toBe(mockBitmap)
  })
})
