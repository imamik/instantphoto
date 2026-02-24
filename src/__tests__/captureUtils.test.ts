import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { drawRoundedRect, buildImageCapture, buildFrameCapture } from '../gl/captureUtils'
import type { FrameSpec } from '../types'

// ---------------------------------------------------------------------------
// Shared mock spec — mirrors the polaroid_600 shape
// ---------------------------------------------------------------------------
const mockSpec: FrameSpec = {
  totalSize: [1080, 1296],
  imageSize: [956, 956],
  imagePos: [62, 77],
  canvasSize: [933, 933],
  cornerRadius: 5,
  paperColor: '#FCFCFA',
  shadow: '0 8px 32px rgba(0,0,0,0.30)',
}

// ---------------------------------------------------------------------------
// Helper: build a minimal CanvasRenderingContext2D-like object
// ---------------------------------------------------------------------------
function createMockCtx() {
  return {
    roundRect: vi.fn() as unknown as CanvasRenderingContext2D['roundRect'],
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arcTo: vi.fn(),
    beginPath: vi.fn(),
    clip: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    drawImage: vi.fn(),
    fillRect: vi.fn(),
    fill: vi.fn(),
    fillStyle: '' as string | CanvasGradient | CanvasPattern,
  }
}

// ---------------------------------------------------------------------------
// drawRoundedRect
// ---------------------------------------------------------------------------

describe('drawRoundedRect', () => {
  it('calls native roundRect when available', () => {
    const ctx = createMockCtx()
    drawRoundedRect(ctx as unknown as CanvasRenderingContext2D, 0, 0, 100, 100, 10)
    expect(ctx.roundRect).toHaveBeenCalledOnce()
    expect(ctx.roundRect).toHaveBeenCalledWith(0, 0, 100, 100, 10)
    expect(ctx.moveTo).not.toHaveBeenCalled()
  })

  it('uses arc fallback when roundRect is not a function', () => {
    const ctx = createMockCtx()
    ;(ctx as Record<string, unknown>).roundRect = 'not-a-function'
    drawRoundedRect(ctx as unknown as CanvasRenderingContext2D, 0, 0, 100, 100, 10)
    expect(ctx.moveTo).toHaveBeenCalled()
    expect(ctx.arcTo).toHaveBeenCalled()
    expect(ctx.lineTo).toHaveBeenCalled()
  })

  it('uses arc fallback when roundRect is undefined', () => {
    const { roundRect: _removed, ...ctxWithout } = createMockCtx()
    drawRoundedRect(ctxWithout as unknown as CanvasRenderingContext2D, 5, 10, 80, 80, 8)
    expect(ctxWithout.moveTo).toHaveBeenCalled()
    expect(ctxWithout.arcTo).toHaveBeenCalledTimes(4)
    expect(ctxWithout.lineTo).toHaveBeenCalledTimes(4)
  })

  it('passes correct coordinates to arc fallback: first moveTo is at (x+r, y)', () => {
    const ctx = createMockCtx()
    delete (ctx as Record<string, unknown>).roundRect
    drawRoundedRect(ctx as unknown as CanvasRenderingContext2D, 10, 20, 200, 150, 15)
    expect(ctx.moveTo).toHaveBeenCalledWith(25, 20)
  })
})

// ---------------------------------------------------------------------------
// buildImageCapture
// ---------------------------------------------------------------------------

describe('buildImageCapture – 2D context available', () => {
  let ctx: ReturnType<typeof createMockCtx>
  let getContextSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    ctx = createMockCtx()
    getContextSpy = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockImplementation((contextId: string) => {
        if (contextId === '2d') return ctx as unknown as CanvasRenderingContext2D
        return null
      })
  })

  afterEach(() => {
    getContextSpy.mockRestore()
  })

  it('returns a Blob for PNG format', async () => {
    const canvas = document.createElement('canvas')
    canvas.width = 933
    canvas.height = 933
    const result = await buildImageCapture(canvas, mockSpec, 'image/png', undefined)
    expect(result).toBeInstanceOf(Blob)
  })

  it('returns a Blob for JPEG format', async () => {
    const canvas = document.createElement('canvas')
    canvas.width = 933
    canvas.height = 933
    const result = await buildImageCapture(canvas, mockSpec, 'image/jpeg', 0.9)
    expect(result).toBeInstanceOf(Blob)
  })

  it('fills paper background for JPEG format', async () => {
    const canvas = document.createElement('canvas')
    canvas.width = 933
    canvas.height = 933
    await buildImageCapture(canvas, mockSpec, 'image/jpeg', 0.9)
    expect(ctx.fillRect).toHaveBeenCalledOnce()
    expect(ctx.fillStyle).toBe(mockSpec.paperColor)
  })

  it('does not call fillRect for non-JPEG formats', async () => {
    const canvas = document.createElement('canvas')
    canvas.width = 933
    canvas.height = 933
    await buildImageCapture(canvas, mockSpec, 'image/webp', undefined)
    expect(ctx.fillRect).not.toHaveBeenCalled()
  })

  it('calls save/beginPath/clip/drawImage/restore', async () => {
    const canvas = document.createElement('canvas')
    canvas.width = 933
    canvas.height = 933
    await buildImageCapture(canvas, mockSpec, 'image/png', undefined)
    expect(ctx.save).toHaveBeenCalledOnce()
    expect(ctx.beginPath).toHaveBeenCalledOnce()
    expect(ctx.clip).toHaveBeenCalledOnce()
    expect(ctx.drawImage).toHaveBeenCalledOnce()
    expect(ctx.restore).toHaveBeenCalledOnce()
  })
})

describe('buildImageCapture – 2D context unavailable', () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns null when 2D context is unavailable', async () => {
    const canvas = document.createElement('canvas')
    const result = await buildImageCapture(canvas, mockSpec, 'image/png', undefined)
    expect(result).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// buildFrameCapture
// ---------------------------------------------------------------------------

describe('buildFrameCapture – 2D context available', () => {
  let ctx: ReturnType<typeof createMockCtx>
  let getContextSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    ctx = createMockCtx()
    getContextSpy = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockImplementation((contextId: string) => {
        if (contextId === '2d') return ctx as unknown as CanvasRenderingContext2D
        return null
      })
  })

  afterEach(() => {
    getContextSpy.mockRestore()
  })

  it('returns a Blob for PNG format', async () => {
    const canvas = document.createElement('canvas')
    canvas.width = 933
    canvas.height = 933
    const result = await buildFrameCapture(canvas, mockSpec, 'image/png', undefined)
    expect(result).toBeInstanceOf(Blob)
  })

  it('returns a Blob for JPEG format', async () => {
    const canvas = document.createElement('canvas')
    canvas.width = 933
    canvas.height = 933
    const result = await buildFrameCapture(canvas, mockSpec, 'image/jpeg', 0.85)
    expect(result).toBeInstanceOf(Blob)
  })

  it('fills paper background color', async () => {
    const canvas = document.createElement('canvas')
    canvas.width = 933
    canvas.height = 933
    await buildFrameCapture(canvas, mockSpec, 'image/png', undefined)
    expect(ctx.fill).toHaveBeenCalled()
    expect(ctx.fillStyle).toBe(mockSpec.paperColor)
  })

  it('clips and draws the image into the frame', async () => {
    const canvas = document.createElement('canvas')
    canvas.width = 933
    canvas.height = 933
    await buildFrameCapture(canvas, mockSpec, 'image/jpeg', 0.85)
    expect(ctx.save).toHaveBeenCalledOnce()
    expect(ctx.clip).toHaveBeenCalledOnce()
    expect(ctx.drawImage).toHaveBeenCalledOnce()
    expect(ctx.restore).toHaveBeenCalledOnce()
  })
})

describe('buildFrameCapture – 2D context unavailable', () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns null when 2D context is unavailable', async () => {
    const canvas = document.createElement('canvas')
    const result = await buildFrameCapture(canvas, mockSpec, 'image/png', undefined)
    expect(result).toBeNull()
  })
})
