/**
 * Tests for the public API surface (index.ts re-exports) and
 * additional component edge cases not covered elsewhere.
 */
import { describe, expect, it, vi } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { fireEvent } from '@testing-library/dom'

// Public API imports – touching index.ts ensures coverage of that file
import {
  InstantPhotoFrame,
  InstantPhotoImageEditor,
  InstantPhotoEditor,
  FRAME_SPECS,
  FILM_PROFILES,
  PRINT_DPI,
  getFrameInsets,
} from '../index'

// ---------------------------------------------------------------------------
// Public API shape
// ---------------------------------------------------------------------------

describe('public API exports', () => {
  it('exports PRINT_DPI as 300', () => {
    expect(PRINT_DPI).toBe(300)
  })

  it('exports FRAME_SPECS with all four frame types', () => {
    expect(Object.keys(FRAME_SPECS)).toEqual(
      expect.arrayContaining(['polaroid_600', 'instax_mini', 'instax_square', 'instax_wide'])
    )
  })

  it('exports FILM_PROFILES with polaroid, instax, original', () => {
    expect(Object.keys(FILM_PROFILES)).toEqual(
      expect.arrayContaining(['polaroid', 'instax', 'original'])
    )
  })

  it('getFrameInsets returns expected keys', () => {
    const insets = getFrameInsets(FRAME_SPECS.polaroid_600)
    expect(insets).toHaveProperty('top')
    expect(insets).toHaveProperty('left')
    expect(insets).toHaveProperty('right')
    expect(insets).toHaveProperty('bottom')
    expect(insets).toHaveProperty('frameAspect')
    expect(insets).toHaveProperty('imageAspect')
  })

  it('FRAME_SPECS.polaroid_600 has correct canvasSize', () => {
    expect(FRAME_SPECS.polaroid_600.canvasSize).toEqual([933, 933])
  })

  it('FRAME_SPECS.instax_mini has correct canvasSize', () => {
    expect(FRAME_SPECS.instax_mini.canvasSize).toEqual([543, 732])
  })

  it('FILM_PROFILES.polaroid has positive grainAmount', () => {
    expect(FILM_PROFILES.polaroid.grainAmount).toBeGreaterThan(0)
  })

  it('FILM_PROFILES.original has zero grainAmount', () => {
    expect(FILM_PROFILES.original.grainAmount).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// InstantPhotoFrame – additional edge cases
// ---------------------------------------------------------------------------

describe('InstantPhotoFrame – additional props', () => {
  it('renders data-frame-type attribute', () => {
    render(<InstantPhotoFrame src="test.jpg" frameType="instax_square" />)
    const frame = document.querySelector('.ipf-frame') as HTMLElement
    expect(frame.dataset.frameType).toBe('instax_square')
  })

  it('renders data-film-type attribute', () => {
    render(<InstantPhotoFrame src="test.jpg" filmType="instax" />)
    const frame = document.querySelector('.ipf-frame') as HTMLElement
    expect(frame.dataset.filmType).toBe('instax')
  })

  it('applies inline style prop', () => {
    render(<InstantPhotoFrame src="test.jpg" style={{ opacity: 0.5 }} />)
    const frame = document.querySelector('.ipf-frame') as HTMLElement
    expect(frame.style.opacity).toBe('0.5')
  })

  it('renders a fallback img for string src', () => {
    render(<InstantPhotoFrame src="test.jpg" />)
    expect(document.querySelector('img.ipf-fallback')).toBeInTheDocument()
  })

  it('does not render fallback img when src is not a string', () => {
    // Pass an ImageBitmap-like object (not a string)
    const fakeBitmap = { width: 1, height: 1, close: vi.fn() } as unknown as ImageBitmap
    render(<InstantPhotoFrame src={fakeBitmap} />)
    expect(document.querySelector('img.ipf-fallback')).not.toBeInTheDocument()
  })

  it('accepts all frame types without throwing', () => {
    const frameTypes = ['polaroid_600', 'instax_mini', 'instax_square', 'instax_wide'] as const
    for (const ft of frameTypes) {
      expect(() => render(<InstantPhotoFrame src="test.jpg" frameType={ft} />)).not.toThrow()
    }
  })

  it('accepts numeric width prop', () => {
    expect(() => render(<InstantPhotoFrame src="test.jpg" width={480} />)).not.toThrow()
  })

  it('accepts string width prop', () => {
    expect(() => render(<InstantPhotoFrame src="test.jpg" width="80%" />)).not.toThrow()
  })

  it('accepts all effect overrides without throwing', () => {
    expect(() =>
      render(
        <InstantPhotoFrame
          src="test.jpg"
          grainAmount={0.05}
          grainSizePx={2}
          grainColorAmount={0.8}
          halationAmount={0.2}
          vignetteIntensity={0.3}
          chromaticShift={1.0}
          saturationDelta={-20}
          filmCurveAmount={0.9}
          shadowWideIntensity={0.4}
          shadowFineIntensity={0.2}
          seed={42}
        />
      )
    ).not.toThrow()
  })
})

// ---------------------------------------------------------------------------
// InstantPhotoImageEditor – additional edge cases
// ---------------------------------------------------------------------------

describe('InstantPhotoImageEditor – additional props', () => {
  it('fires onSettingsChange on mount', async () => {
    const onSettingsChange = vi.fn()
    render(<InstantPhotoImageEditor onSettingsChange={onSettingsChange} />)
    await waitFor(() => expect(onSettingsChange).toHaveBeenCalled())
    const settings = onSettingsChange.mock.calls[0][0]
    expect(settings).toHaveProperty('frameType')
    expect(settings).toHaveProperty('filmType')
    expect(settings).toHaveProperty('transform')
  })

  it('onSettingsChange receives correct filmType', async () => {
    const onSettingsChange = vi.fn()
    render(<InstantPhotoImageEditor filmType="instax" onSettingsChange={onSettingsChange} />)
    await waitFor(() => expect(onSettingsChange).toHaveBeenCalled())
    expect(onSettingsChange.mock.calls[0][0].filmType).toBe('instax')
  })

  it('onSettingsChange receives all effect fields', async () => {
    const onSettingsChange = vi.fn()
    render(<InstantPhotoImageEditor onSettingsChange={onSettingsChange} />)
    await waitFor(() => expect(onSettingsChange).toHaveBeenCalled())
    const settings = onSettingsChange.mock.calls[0][0]
    expect(settings).toHaveProperty('grainAmount')
    expect(settings).toHaveProperty('grainSizePx')
    expect(settings).toHaveProperty('vignetteIntensity')
    expect(settings).toHaveProperty('halationAmount')
    expect(settings).toHaveProperty('chromaticShift')
    expect(settings).toHaveProperty('saturationDelta')
    expect(settings).toHaveProperty('filmCurveAmount')
    expect(settings).toHaveProperty('seed')
  })

  it('accepts liveUpdateDuringGesture=false without throwing', () => {
    expect(() => render(<InstantPhotoImageEditor liveUpdateDuringGesture={false} />)).not.toThrow()
  })

  it('accepts onRenderDelay prop', () => {
    expect(() => render(<InstantPhotoImageEditor onRenderDelay={200} />)).not.toThrow()
  })

  it('accepts custom maxZoom', () => {
    expect(() => render(<InstantPhotoImageEditor maxZoom={10} />)).not.toThrow()
  })

  it('applies custom className', () => {
    render(<InstantPhotoImageEditor className="my-editor" />)
    expect(document.querySelector('.ipf-frame.ipf-frame--editor.my-editor')).toBeInTheDocument()
  })

  it('applies inline style', () => {
    render(<InstantPhotoImageEditor style={{ border: '2px solid red' }} />)
    const frame = document.querySelector('.ipf-frame--editor') as HTMLElement
    expect(frame.style.border).toBe('2px solid red')
  })
})

// ---------------------------------------------------------------------------
// InstantPhotoEditor – additional edge cases
// ---------------------------------------------------------------------------

describe('InstantPhotoEditor – upload interaction', () => {
  it('triggers file input click when upload button is clicked', () => {
    const onUpload = vi.fn()
    render(<InstantPhotoEditor onUpload={onUpload} />)
    const btn = document.querySelector('.ipf-upload-btn') as HTMLElement
    const input = document.querySelector('input[type="file"]') as HTMLInputElement

    const clickSpy = vi.spyOn(input, 'click')
    btn.click()
    expect(clickSpy).toHaveBeenCalled()
  })

  it('calls onUpload when a file is selected', () => {
    const onUpload = vi.fn()
    render(<InstantPhotoEditor onUpload={onUpload} />)
    const input = document.querySelector('input[type="file"]') as HTMLInputElement

    const file = new File(['content'], 'photo.jpg', { type: 'image/jpeg' })
    Object.defineProperty(input, 'files', { value: [file], writable: false })
    fireEvent.change(input)
    expect(onUpload).toHaveBeenCalledWith(file)
  })

  it('does not call onUpload when no file is selected', () => {
    const onUpload = vi.fn()
    render(<InstantPhotoEditor onUpload={onUpload} />)
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    Object.defineProperty(input, 'files', { value: [], writable: false })
    fireEvent.change(input)
    expect(onUpload).not.toHaveBeenCalled()
  })

  it('renders without any callback props', () => {
    expect(() => render(<InstantPhotoEditor />)).not.toThrow()
  })

  it('does not render delete button when src is absent (even with onDelete)', () => {
    render(<InstantPhotoEditor onDelete={vi.fn()} />)
    expect(document.querySelector('.ipf-delete-btn')).not.toBeInTheDocument()
  })

  it('forwards frameType to inner editor', () => {
    render(<InstantPhotoEditor frameType="instax_wide" />)
    const frame = document.querySelector('.ipf-frame') as HTMLElement
    expect(frame.dataset.frameType).toBe('instax_wide')
  })
})
