import { describe, expect, it, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mock the WebGL pipeline – createPipeline returns null to simulate no-WebGL,
// or a minimal pipeline object to simulate success.
// ---------------------------------------------------------------------------
const mockPipeline = { _type: 'mock-pipeline' }

vi.mock('../gl/pipeline', () => ({
  createPipeline: vi.fn(),
  destroyPipeline: vi.fn(),
  render: vi.fn(),
  computeCrop: vi.fn().mockReturnValue({ scale: [1, 1], offset: [0, 0] }),
}))

vi.mock('../utils/loadImageBitmap', () => ({
  loadImageBitmap: vi.fn().mockResolvedValue({ width: 100, height: 80, close: vi.fn() }),
}))

vi.mock('../gl/captureUtils', () => ({
  buildImageCapture: vi.fn().mockResolvedValue(new Blob(['img'], { type: 'image/png' })),
  buildFrameCapture: vi.fn().mockResolvedValue(new Blob(['frame'], { type: 'image/png' })),
}))

// Import after mocks are registered
import { batchProcess } from '../utils/batchProcess'
import { createPipeline, destroyPipeline, render } from '../gl/pipeline'
import { loadImageBitmap } from '../utils/loadImageBitmap'
import { buildImageCapture, buildFrameCapture } from '../gl/captureUtils'

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('batchProcess – WebGL unavailable', () => {
  beforeEach(() => {
    vi.mocked(createPipeline).mockReturnValue(null)
  })

  it('throws when createPipeline returns null', async () => {
    await expect(batchProcess([{ src: 'a.jpg' }])).rejects.toThrow(
      '[batchProcess] WebGL is not available in this environment'
    )
  })

  it('does not call render when pipeline creation fails', async () => {
    await expect(batchProcess([{ src: 'a.jpg' }])).rejects.toThrow()
    expect(vi.mocked(render)).not.toHaveBeenCalled()
  })
})

describe('batchProcess – WebGL available', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(createPipeline).mockReturnValue(mockPipeline as never)
    vi.mocked(buildImageCapture).mockResolvedValue(new Blob(['img'], { type: 'image/png' }))
    vi.mocked(buildFrameCapture).mockResolvedValue(new Blob(['frame'], { type: 'image/png' }))
    vi.mocked(loadImageBitmap).mockResolvedValue({
      width: 100,
      height: 80,
      close: vi.fn(),
    } as ImageBitmap)
  })

  it('returns one result per item', async () => {
    const results = await batchProcess([{ src: 'a.jpg' }, { src: 'b.jpg' }, { src: 'c.jpg' }])
    expect(results).toHaveLength(3)
  })

  it('calls loadImageBitmap for each item', async () => {
    await batchProcess([{ src: 'a.jpg' }, { src: 'b.jpg' }])
    expect(vi.mocked(loadImageBitmap)).toHaveBeenCalledTimes(2)
  })

  it('calls render for each item', async () => {
    await batchProcess([{ src: 'a.jpg' }, { src: 'b.jpg' }])
    expect(vi.mocked(render)).toHaveBeenCalledTimes(2)
  })

  it('calls destroyPipeline after processing', async () => {
    await batchProcess([{ src: 'a.jpg' }])
    expect(vi.mocked(destroyPipeline)).toHaveBeenCalledWith(mockPipeline)
  })

  it('calls onProgress with correct counters', async () => {
    const onProgress = vi.fn()
    await batchProcess([{ src: 'a.jpg' }, { src: 'b.jpg' }, { src: 'c.jpg' }], { onProgress })
    expect(onProgress).toHaveBeenCalledTimes(3)
    expect(onProgress).toHaveBeenNthCalledWith(1, 1, 3)
    expect(onProgress).toHaveBeenNthCalledWith(2, 2, 3)
    expect(onProgress).toHaveBeenNthCalledWith(3, 3, 3)
  })

  it('uses buildImageCapture by default (target: image)', async () => {
    await batchProcess([{ src: 'a.jpg' }])
    expect(vi.mocked(buildImageCapture)).toHaveBeenCalled()
    expect(vi.mocked(buildFrameCapture)).not.toHaveBeenCalled()
  })

  it('uses buildFrameCapture when target is frame', async () => {
    await batchProcess([{ src: 'a.jpg' }], { captureOptions: { target: 'frame' } })
    expect(vi.mocked(buildFrameCapture)).toHaveBeenCalled()
    expect(vi.mocked(buildImageCapture)).not.toHaveBeenCalled()
  })

  it('passes glOptions to render', async () => {
    await batchProcess([{ src: 'a.jpg' }], { glOptions: { filmType: 'instax' } })
    const renderCall = vi.mocked(render).mock.calls[0]
    expect(renderCall[2]).toMatchObject({ filmType: 'instax' })
  })

  it('uses polaroid_600 frameType by default', async () => {
    await batchProcess([{ src: 'a.jpg' }])
    // render is called with options that include the correct canvasSize for polaroid_600
    const renderCall = vi.mocked(render).mock.calls[0]
    expect(renderCall[2].canvasSize).toEqual([933, 933])
  })

  it('accepts instax_mini frameType', async () => {
    await batchProcess([{ src: 'a.jpg' }], { frameType: 'instax_mini' })
    const renderCall = vi.mocked(render).mock.calls[0]
    expect(renderCall[2].canvasSize).toEqual([543, 732])
  })

  it('returns Blob results when capture succeeds', async () => {
    const results = await batchProcess([{ src: 'a.jpg' }])
    expect(results[0]).toBeInstanceOf(Blob)
  })

  it('still calls destroyPipeline when loadImageBitmap rejects', async () => {
    vi.mocked(loadImageBitmap).mockRejectedValueOnce(new Error('load failed'))
    await expect(batchProcess([{ src: 'bad.jpg' }])).rejects.toThrow('load failed')
    expect(vi.mocked(destroyPipeline)).toHaveBeenCalled()
  })

  it('handles an empty items array', async () => {
    const results = await batchProcess([])
    expect(results).toHaveLength(0)
    expect(vi.mocked(render)).not.toHaveBeenCalled()
    // destroyPipeline is still called in the finally block
    expect(vi.mocked(destroyPipeline)).toHaveBeenCalled()
  })

  it('uses fixed seed from glOptions when seed is non-zero', async () => {
    await batchProcess([{ src: 'a.jpg' }, { src: 'b.jpg' }], { glOptions: { seed: 42 } })
    const calls = vi.mocked(render).mock.calls
    expect(calls[0][2].seed).toBe(42)
    expect(calls[1][2].seed).toBe(42)
  })

  it('randomises seed per image when glOptions.seed is 0 (default)', async () => {
    await batchProcess([{ src: 'a.jpg' }, { src: 'b.jpg' }])
    const calls = vi.mocked(render).mock.calls
    // Seeds should be non-zero random values (not guaranteed equal)
    expect(calls[0][2].seed).toBeGreaterThan(0)
    expect(calls[1][2].seed).toBeGreaterThan(0)
  })
})
