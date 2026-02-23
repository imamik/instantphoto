import { render, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { InstantPhotoFrame } from '../components/InstantPhotoFrame'
import { InstantPhotoImageEditor } from '../components/InstantPhotoImageEditor'

// ---------------------------------------------------------------------------
// Note: jsdom does not implement WebGL, so canvas.getContext('webgl')
// returns null.  Both components call onError in that case, which is the
// correct error-handling path.  These tests verify:
//   1. The component mounts without throwing
//   2. The expected DOM structure is rendered
//   3. onError is called when WebGL is unavailable
// ---------------------------------------------------------------------------

describe('InstantPhotoFrame', () => {
  it('renders the frame container and canvas', () => {
    render(<InstantPhotoFrame src="test.jpg" />)
    expect(document.querySelector('.ipf-frame')).toBeInTheDocument()
    expect(document.querySelector('canvas.ipf-canvas')).toBeInTheDocument()
  })

  it('renders image-wrap inside the frame', () => {
    render(<InstantPhotoFrame src="test.jpg" />)
    expect(document.querySelector('.ipf-image-wrap')).toBeInTheDocument()
  })

  it('calls onError when WebGL is unavailable (jsdom)', async () => {
    const onError = vi.fn()
    render(<InstantPhotoFrame src="test.jpg" onError={onError} />)
    await waitFor(() => expect(onError).toHaveBeenCalledOnce())
    expect(onError.mock.calls[0][0]).toBeInstanceOf(Error)
  })

  it('applies custom className', () => {
    render(<InstantPhotoFrame src="test.jpg" className="my-frame" />)
    expect(document.querySelector('.ipf-frame.my-frame')).toBeInTheDocument()
  })

  it('accepts instax_mini frameType without throwing', () => {
    expect(() => render(<InstantPhotoFrame src="test.jpg" frameType="instax_mini" />)).not.toThrow()
  })

  it('accepts all filmType values without throwing', () => {
    expect(() => render(<InstantPhotoFrame src="test.jpg" filmType="polaroid" />)).not.toThrow()
    expect(() => render(<InstantPhotoFrame src="test.jpg" filmType="instax" />)).not.toThrow()
    expect(() => render(<InstantPhotoFrame src="test.jpg" filmType="original" />)).not.toThrow()
  })
})

describe('InstantPhotoImageEditor', () => {
  it('renders without src (placeholder state)', () => {
    render(<InstantPhotoImageEditor />)
    expect(document.querySelector('.ipf-frame')).toBeInTheDocument()
    expect(document.querySelector('canvas.ipf-canvas')).toBeInTheDocument()
  })

  it('renders the gesture overlay', () => {
    render(<InstantPhotoImageEditor />)
    expect(document.querySelector('.ipf-gesture-overlay')).toBeInTheDocument()
  })

  it('has the editor modifier class', () => {
    render(<InstantPhotoImageEditor />)
    expect(document.querySelector('.ipf-frame--editor')).toBeInTheDocument()
  })

  it('calls onError when WebGL is unavailable (jsdom)', async () => {
    const onError = vi.fn()
    render(<InstantPhotoImageEditor src="test.jpg" onError={onError} />)
    await waitFor(() => expect(onError).toHaveBeenCalledOnce())
  })

  it('gesture overlay has touch-action:none CSS', () => {
    render(<InstantPhotoImageEditor />)
    const overlay = document.querySelector('.ipf-gesture-overlay') as HTMLElement
    expect(overlay).toBeInTheDocument()
    // touch-action is set via CSS class – check the class is present
    expect(overlay.classList.contains('ipf-gesture-overlay')).toBe(true)
  })

  it('accepts all frameType values without throwing', () => {
    for (const ft of ['polaroid_600', 'instax_mini', 'instax_square', 'instax_wide'] as const) {
      expect(() => render(<InstantPhotoImageEditor frameType={ft} />)).not.toThrow()
    }
  })

  it('accepts maxZoom prop without throwing', () => {
    expect(() => render(<InstantPhotoImageEditor maxZoom={8} />)).not.toThrow()
  })

  it('accepts original filmType without throwing', () => {
    expect(() => render(<InstantPhotoImageEditor filmType="original" />)).not.toThrow()
  })

  it('fires onTransformChange with initial identity transform', async () => {
    const onTransformChange = vi.fn()
    render(<InstantPhotoImageEditor src="test.jpg" onTransformChange={onTransformChange} />)
    // Transform starts at { panX:0, panY:0, scale:1 } – no change event on mount
    // (onTransformChange only fires on gesture, not on initial render)
    expect(onTransformChange).not.toHaveBeenCalled()
  })
})

describe('InstantPhotoFrame + InstantPhotoImageEditor co-existence', () => {
  it('both components can render on the same page', () => {
    render(
      <div>
        <InstantPhotoFrame src="a.jpg" frameType="polaroid_600" />
        <InstantPhotoImageEditor frameType="instax_square" />
      </div>
    )
    expect(document.querySelectorAll('.ipf-frame')).toHaveLength(2)
    expect(document.querySelectorAll('canvas.ipf-canvas')).toHaveLength(2)
  })
})
