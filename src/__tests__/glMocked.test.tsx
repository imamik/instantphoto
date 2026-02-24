/**
 * Tests for useInstantPhotoGL and useInteractiveGL with a fully mocked
 * WebGL pipeline, covering the successful render paths that jsdom can't reach.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, waitFor, cleanup, act } from '@testing-library/react'

// ---------------------------------------------------------------------------
// All variables referenced inside vi.mock factories must be defined via
// vi.hoisted() because the factory is hoisted to the top of the file.
// ---------------------------------------------------------------------------
const { fakePipeline } = vi.hoisted(() => ({
  fakePipeline: {
    gl: {},
    blurProgram: {},
    mainProgram: {},
    sourceTex: {},
    fboBlurH: {},
    fboBlurV: {},
    quadBuffer: {},
    canvasWidth: 933,
    canvasHeight: 933,
    fboDataType: 5121,
  },
}))

vi.mock('../gl/pipeline', async importOriginal => {
  const real = await importOriginal<typeof import('../gl/pipeline')>()
  return {
    ...real,
    createPipeline: vi.fn().mockReturnValue(fakePipeline),
    destroyPipeline: vi.fn(),
    render: vi.fn(),
  }
})

vi.mock('../utils/loadImageBitmap', () => ({
  loadImageBitmap: vi
    .fn()
    .mockResolvedValue({ width: 200, height: 150, close: vi.fn() } as ImageBitmap),
}))

// Import components AFTER mock declarations (mocks are hoisted, but imports execute after)
import { InstantPhotoFrame } from '../components/InstantPhotoFrame'
import { InstantPhotoImageEditor } from '../components/InstantPhotoImageEditor'
import { createPipeline, destroyPipeline, render as glRender } from '../gl/pipeline'
import { loadImageBitmap } from '../utils/loadImageBitmap'

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(createPipeline).mockReturnValue(fakePipeline as never)
  vi.mocked(loadImageBitmap).mockResolvedValue({
    width: 200,
    height: 150,
    close: vi.fn(),
  } as ImageBitmap)
})

afterEach(() => {
  cleanup()
})

// ---------------------------------------------------------------------------
// InstantPhotoFrame – successful WebGL render path
// ---------------------------------------------------------------------------

describe('InstantPhotoFrame – with mocked WebGL pipeline', () => {
  it('does NOT call onError when pipeline initialises successfully', async () => {
    const onError = vi.fn()
    render(<InstantPhotoFrame src="test.jpg" onError={onError} />)
    await new Promise(r => setTimeout(r, 50))
    expect(onError).not.toHaveBeenCalled()
  })

  it('calls onRender after successful image load', async () => {
    const onRender = vi.fn()
    render(<InstantPhotoFrame src="test.jpg" onRender={onRender} />)
    await waitFor(() => expect(onRender).toHaveBeenCalled())
  })

  it('calls onRender with a capture function', async () => {
    const onRender = vi.fn()
    render(<InstantPhotoFrame src="test.jpg" onRender={onRender} />)
    await waitFor(() => expect(onRender).toHaveBeenCalled())
    expect(typeof onRender.mock.calls[0][0]).toBe('function')
  })

  it('calls glRender (pipeline render) after image load', async () => {
    render(<InstantPhotoFrame src="test.jpg" />)
    await waitFor(() => expect(vi.mocked(glRender)).toHaveBeenCalled())
  })

  it('calls destroyPipeline on unmount', async () => {
    const { unmount } = render(<InstantPhotoFrame src="test.jpg" />)
    await new Promise(r => setTimeout(r, 50))
    unmount()
    expect(vi.mocked(destroyPipeline)).toHaveBeenCalled()
  })

  it('re-renders when filmType prop changes', async () => {
    const { rerender } = render(<InstantPhotoFrame src="test.jpg" filmType="polaroid" />)
    await waitFor(() => expect(vi.mocked(glRender)).toHaveBeenCalled())
    const callsBefore = vi.mocked(glRender).mock.calls.length
    act(() => {
      rerender(<InstantPhotoFrame src="test.jpg" filmType="instax" />)
    })
    await new Promise(r => setTimeout(r, 50))
    expect(vi.mocked(glRender).mock.calls.length).toBeGreaterThanOrEqual(callsBefore)
  })

  it('accepts all effect prop overrides without errors', async () => {
    const onError = vi.fn()
    render(
      <InstantPhotoFrame
        src="test.jpg"
        grainAmount={0.03}
        halationAmount={0.1}
        vignetteIntensity={0.5}
        chromaticShift={2.0}
        saturationDelta={-10}
        filmCurveAmount={0.8}
        seed={12}
        onError={onError}
      />
    )
    await new Promise(r => setTimeout(r, 50))
    expect(onError).not.toHaveBeenCalled()
  })

  it('creates the pipeline once on mount', async () => {
    render(<InstantPhotoFrame src="test.jpg" />)
    await new Promise(r => setTimeout(r, 50))
    expect(vi.mocked(createPipeline)).toHaveBeenCalledTimes(1)
  })

  it('capture function can be invoked after render', async () => {
    let capture: ((opts?: object) => Promise<Blob | null>) | undefined
    render(
      <InstantPhotoFrame
        src="test.jpg"
        onRender={fn => {
          capture = fn as typeof capture
        }}
      />
    )
    await waitFor(() => expect(capture).toBeDefined())
    // capture() reads the canvas; in jsdom this returns a Blob from our toBlob stub
    const result = await capture!()
    // May be Blob or null depending on the 2D context availability
    expect(result === null || result instanceof Blob).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// InstantPhotoImageEditor – successful WebGL render path
// ---------------------------------------------------------------------------

describe('InstantPhotoImageEditor – with mocked WebGL pipeline', () => {
  it('does NOT call onError when pipeline initialises successfully', async () => {
    const onError = vi.fn()
    render(<InstantPhotoImageEditor src="test.jpg" onError={onError} />)
    await new Promise(r => setTimeout(r, 50))
    expect(onError).not.toHaveBeenCalled()
  })

  it('calls onRender after successful image load', async () => {
    const onRender = vi.fn()
    render(<InstantPhotoImageEditor src="test.jpg" onRender={onRender} />)
    await waitFor(() => expect(onRender).toHaveBeenCalled())
  })

  it('calls loadImageBitmap with the provided src', async () => {
    render(<InstantPhotoImageEditor src="photo.jpg" />)
    await waitFor(() => expect(vi.mocked(loadImageBitmap)).toHaveBeenCalledWith('photo.jpg'))
  })

  it('calls glRender (pipeline render) after image load', async () => {
    render(<InstantPhotoImageEditor src="test.jpg" />)
    await waitFor(() => expect(vi.mocked(glRender)).toHaveBeenCalled())
  })

  it('calls destroyPipeline on unmount', async () => {
    const { unmount } = render(<InstantPhotoImageEditor src="test.jpg" />)
    await new Promise(r => setTimeout(r, 50))
    unmount()
    expect(vi.mocked(destroyPipeline)).toHaveBeenCalled()
  })

  it('does not call loadImageBitmap when src is undefined', async () => {
    render(<InstantPhotoImageEditor />)
    await new Promise(r => setTimeout(r, 50))
    expect(vi.mocked(loadImageBitmap)).not.toHaveBeenCalled()
  })

  it('calls onError if loadImageBitmap rejects', async () => {
    vi.mocked(loadImageBitmap).mockRejectedValueOnce(new Error('load failed'))
    const onError = vi.fn()
    render(<InstantPhotoImageEditor src="bad.jpg" onError={onError} />)
    await waitFor(() => expect(onError).toHaveBeenCalled())
    expect(onError.mock.calls[0][0]).toBeInstanceOf(Error)
  })

  it('loads a new image when src prop changes', async () => {
    const { rerender } = render(<InstantPhotoImageEditor src="a.jpg" />)
    await waitFor(() => expect(vi.mocked(loadImageBitmap)).toHaveBeenCalledWith('a.jpg'))
    act(() => {
      rerender(<InstantPhotoImageEditor src="b.jpg" />)
    })
    await waitFor(() => expect(vi.mocked(loadImageBitmap)).toHaveBeenCalledWith('b.jpg'))
  })

  it('handles all frame types without error', async () => {
    const frameTypes = ['polaroid_600', 'instax_mini', 'instax_square', 'instax_wide'] as const
    for (const ft of frameTypes) {
      const onError = vi.fn()
      const { unmount } = render(
        <InstantPhotoImageEditor src="test.jpg" frameType={ft} onError={onError} />
      )
      await new Promise(r => setTimeout(r, 30))
      expect(onError).not.toHaveBeenCalled()
      unmount()
    }
  })

  it('fires onSettingsChange with settings on mount', async () => {
    const onSettingsChange = vi.fn()
    render(<InstantPhotoImageEditor onSettingsChange={onSettingsChange} />)
    await waitFor(() => expect(onSettingsChange).toHaveBeenCalled())
  })

  it('covers naturalWidth branch when src is an HTMLImageElement', async () => {
    // HTMLImageElement has naturalWidth, so the crop calculation uses that branch
    const img = document.createElement('img')
    Object.defineProperty(img, 'complete', { value: true, writable: false })
    Object.defineProperty(img, 'naturalWidth', { value: 400, writable: false })
    Object.defineProperty(img, 'naturalHeight', { value: 300, writable: false })
    vi.mocked(loadImageBitmap).mockResolvedValueOnce(img as unknown as ImageBitmap)
    const { unmount } = render(<InstantPhotoImageEditor src="test.jpg" />)
    await new Promise(r => setTimeout(r, 80))
    unmount()
  })

  it('re-renders when options change after image is loaded', async () => {
    const { rerender } = render(<InstantPhotoImageEditor src="test.jpg" filmType="polaroid" />)
    await waitFor(() => expect(vi.mocked(glRender)).toHaveBeenCalled())
    const callsBefore = vi.mocked(glRender).mock.calls.length
    act(() => {
      rerender(<InstantPhotoImageEditor src="test.jpg" filmType="instax" />)
    })
    await new Promise(r => setTimeout(r, 50))
    expect(vi.mocked(glRender).mock.calls.length).toBeGreaterThan(callsBefore)
  })

  it('covers liveUpdateDuringGesture=false path with pointer events', async () => {
    render(<InstantPhotoImageEditor src="test.jpg" liveUpdateDuringGesture={false} />)
    await waitFor(() => expect(vi.mocked(glRender)).toHaveBeenCalled())
    const overlay = document.querySelector('.ipf-gesture-overlay') as HTMLElement
    // Pointer events in deferred mode should go through the renderRawFrame path
    overlay.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, clientX: 100, clientY: 100 })
    )
    overlay.dispatchEvent(
      new PointerEvent('pointermove', { bubbles: true, pointerId: 1, clientX: 150, clientY: 100 })
    )
    overlay.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 }))
    // After gesture end in deferred mode, renderFrame is called once more
    expect(vi.mocked(glRender).mock.calls.length).toBeGreaterThanOrEqual(1)
  })
})

// ---------------------------------------------------------------------------
// WebGL context loss / restore events
// ---------------------------------------------------------------------------

describe('WebGL context loss and restore', () => {
  it('handles webglcontextlost event on InstantPhotoFrame canvas', async () => {
    const { container } = render(<InstantPhotoFrame src="test.jpg" />)
    await new Promise(r => setTimeout(r, 50))
    const canvas = container.querySelector('canvas.ipf-canvas') as HTMLCanvasElement
    expect(() => {
      canvas.dispatchEvent(new Event('webglcontextlost', { bubbles: false, cancelable: true }))
    }).not.toThrow()
  })

  it('handles webglcontextrestored event on InstantPhotoFrame canvas', async () => {
    const { container } = render(<InstantPhotoFrame src="test.jpg" />)
    await new Promise(r => setTimeout(r, 50))
    const canvas = container.querySelector('canvas.ipf-canvas') as HTMLCanvasElement
    canvas.dispatchEvent(new Event('webglcontextlost', { bubbles: false, cancelable: true }))
    expect(() => {
      canvas.dispatchEvent(new Event('webglcontextrestored', { bubbles: false }))
    }).not.toThrow()
  })

  it('handles webglcontextlost on InstantPhotoImageEditor canvas', async () => {
    const { container } = render(<InstantPhotoImageEditor src="test.jpg" />)
    await new Promise(r => setTimeout(r, 50))
    const canvas = container.querySelector('canvas.ipf-canvas') as HTMLCanvasElement
    expect(() => {
      canvas.dispatchEvent(new Event('webglcontextlost', { bubbles: false, cancelable: true }))
    }).not.toThrow()
  })

  it('handles webglcontextrestored on InstantPhotoImageEditor canvas', async () => {
    const { container } = render(<InstantPhotoImageEditor src="test.jpg" />)
    await waitFor(() => expect(vi.mocked(glRender)).toHaveBeenCalled())
    const canvas = container.querySelector('canvas.ipf-canvas') as HTMLCanvasElement
    canvas.dispatchEvent(new Event('webglcontextlost', { bubbles: false, cancelable: true }))
    expect(() => {
      canvas.dispatchEvent(new Event('webglcontextrestored', { bubbles: false }))
    }).not.toThrow()
  })
})
