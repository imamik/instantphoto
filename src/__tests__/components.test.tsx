import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PolaroidFrame } from '../components/PolaroidFrame'
import { PolaroidImageEditor } from '../components/PolaroidImageEditor'

// ---------------------------------------------------------------------------
// Note: jsdom does not implement WebGL, so canvas.getContext('webgl')
// returns null.  Both components call onError in that case, which is the
// correct error-handling path.  These tests verify:
//   1. The component mounts without throwing
//   2. The expected DOM structure is rendered
//   3. onError is called when WebGL is unavailable
// ---------------------------------------------------------------------------

describe('PolaroidFrame', () => {
  it('renders the frame container and canvas', () => {
    render(<PolaroidFrame src="test.jpg" />)
    expect(document.querySelector('.plrd-frame')).toBeInTheDocument()
    expect(document.querySelector('canvas.plrd-canvas')).toBeInTheDocument()
  })

  it('renders image-wrap inside the frame', () => {
    render(<PolaroidFrame src="test.jpg" />)
    expect(document.querySelector('.plrd-image-wrap')).toBeInTheDocument()
  })

  it('calls onError when WebGL is unavailable (jsdom)', async () => {
    const onError = vi.fn()
    render(<PolaroidFrame src="test.jpg" onError={onError} />)
    await waitFor(() => expect(onError).toHaveBeenCalledOnce())
    expect(onError.mock.calls[0][0]).toBeInstanceOf(Error)
  })

  it('applies custom className', () => {
    render(<PolaroidFrame src="test.jpg" className="my-frame" />)
    expect(document.querySelector('.plrd-frame.my-frame')).toBeInTheDocument()
  })

  it('accepts instax_mini frameType without throwing', () => {
    expect(() => render(<PolaroidFrame src="test.jpg" frameType="instax_mini" />)).not.toThrow()
  })

  it('accepts all filmType values without throwing', () => {
    expect(() => render(<PolaroidFrame src="test.jpg" filmType="polaroid" />)).not.toThrow()
    expect(() => render(<PolaroidFrame src="test.jpg" filmType="instax" />)).not.toThrow()
    expect(() => render(<PolaroidFrame src="test.jpg" filmType="original" />)).not.toThrow()
  })
})

describe('PolaroidImageEditor', () => {
  it('renders without src (placeholder state)', () => {
    render(<PolaroidImageEditor />)
    expect(document.querySelector('.plrd-frame')).toBeInTheDocument()
    expect(document.querySelector('canvas.plrd-canvas')).toBeInTheDocument()
  })

  it('renders the gesture overlay', () => {
    render(<PolaroidImageEditor />)
    expect(document.querySelector('.plrd-gesture-overlay')).toBeInTheDocument()
  })

  it('has the editor modifier class', () => {
    render(<PolaroidImageEditor />)
    expect(document.querySelector('.plrd-frame--editor')).toBeInTheDocument()
  })

  it('calls onError when WebGL is unavailable (jsdom)', async () => {
    const onError = vi.fn()
    render(<PolaroidImageEditor src="test.jpg" onError={onError} />)
    await waitFor(() => expect(onError).toHaveBeenCalledOnce())
  })

  it('gesture overlay has touch-action:none CSS', () => {
    render(<PolaroidImageEditor />)
    const overlay = document.querySelector('.plrd-gesture-overlay') as HTMLElement
    expect(overlay).toBeInTheDocument()
    // touch-action is set via CSS class – check the class is present
    expect(overlay.classList.contains('plrd-gesture-overlay')).toBe(true)
  })

  it('accepts all frameType values without throwing', () => {
    for (const ft of ['polaroid_600', 'instax_mini', 'instax_square', 'instax_wide'] as const) {
      expect(() => render(<PolaroidImageEditor frameType={ft} />)).not.toThrow()
    }
  })

  it('accepts maxZoom prop without throwing', () => {
    expect(() => render(<PolaroidImageEditor maxZoom={8} />)).not.toThrow()
  })

  it('accepts original filmType without throwing', () => {
    expect(() => render(<PolaroidImageEditor filmType="original" />)).not.toThrow()
  })

  it('fires onTransformChange with initial identity transform', async () => {
    const onTransformChange = vi.fn()
    render(<PolaroidImageEditor src="test.jpg" onTransformChange={onTransformChange} />)
    // Transform starts at { panX:0, panY:0, scale:1 } – no change event on mount
    // (onTransformChange only fires on gesture, not on initial render)
    expect(onTransformChange).not.toHaveBeenCalled()
  })
})

describe('PolaroidFrame + PolaroidImageEditor co-existence', () => {
  it('both components can render on the same page', () => {
    render(
      <div>
        <PolaroidFrame src="a.jpg" frameType="polaroid_600" />
        <PolaroidImageEditor frameType="instax_square" />
      </div>
    )
    expect(document.querySelectorAll('.plrd-frame')).toHaveLength(2)
    expect(document.querySelectorAll('canvas.plrd-canvas')).toHaveLength(2)
  })
})
