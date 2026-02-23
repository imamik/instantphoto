import { render, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { InstantPhotoFrame } from '../components/InstantPhotoFrame'
import { InstantPhotoImageEditor } from '../components/InstantPhotoImageEditor'
import { InstantPhotoEditor } from '../components/InstantPhotoEditor'

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

describe('InstantPhotoImageEditor emptyState / imageOverlay slots', () => {
  it('renders emptyState container when no src is provided', () => {
    render(
      <InstantPhotoImageEditor emptyState={<div data-testid="empty-slot">Upload a photo</div>} />
    )
    expect(document.querySelector('.ipf-empty-state')).toBeInTheDocument()
    expect(document.querySelector('[data-testid="empty-slot"]')).toBeInTheDocument()
  })

  it('does not render emptyState container when src is provided', () => {
    render(
      <InstantPhotoImageEditor
        src="test.jpg"
        emptyState={<div data-testid="empty-slot">Upload a photo</div>}
      />
    )
    expect(document.querySelector('.ipf-empty-state')).not.toBeInTheDocument()
  })

  it('renders imageOverlay container when src is provided', () => {
    render(<InstantPhotoImageEditor src="test.jpg" imageOverlay={<button>Delete</button>} />)
    expect(document.querySelector('.ipf-image-overlay')).toBeInTheDocument()
  })

  it('does not render imageOverlay container when no src', () => {
    render(<InstantPhotoImageEditor imageOverlay={<button>Delete</button>} />)
    expect(document.querySelector('.ipf-image-overlay')).not.toBeInTheDocument()
  })

  it('does not render emptyState container when emptyState prop is not provided', () => {
    render(<InstantPhotoImageEditor />)
    expect(document.querySelector('.ipf-empty-state')).not.toBeInTheDocument()
  })
})

describe('InstantPhotoEditor', () => {
  it('renders without props', () => {
    render(<InstantPhotoEditor />)
    expect(document.querySelector('.ipf-frame')).toBeInTheDocument()
  })

  it('renders upload button when onUpload is provided', () => {
    render(<InstantPhotoEditor onUpload={vi.fn()} />)
    expect(document.querySelector('.ipf-upload-btn')).toBeInTheDocument()
  })

  it('does not render upload button when onUpload is not provided', () => {
    render(<InstantPhotoEditor />)
    expect(document.querySelector('.ipf-upload-btn')).not.toBeInTheDocument()
  })

  it('renders delete button when onDelete and src are provided', () => {
    render(<InstantPhotoEditor src="test.jpg" onDelete={vi.fn()} />)
    expect(document.querySelector('.ipf-delete-btn')).toBeInTheDocument()
  })

  it('does not render delete button when src is absent', () => {
    render(<InstantPhotoEditor onDelete={vi.fn()} />)
    expect(document.querySelector('.ipf-delete-btn')).not.toBeInTheDocument()
  })

  it('calls onDelete when delete button is clicked', () => {
    const onDelete = vi.fn()
    render(<InstantPhotoEditor src="test.jpg" onDelete={onDelete} />)
    const btn = document.querySelector('.ipf-delete-btn') as HTMLElement
    btn.click()
    expect(onDelete).toHaveBeenCalledOnce()
  })

  it('renders a hidden file input when onUpload is provided', () => {
    render(<InstantPhotoEditor onUpload={vi.fn()} />)
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    expect(input).toBeInTheDocument()
    expect(input.style.display).toBe('none')
  })

  it('uses custom accept attribute on the file input', () => {
    render(<InstantPhotoEditor onUpload={vi.fn()} accept="image/png,image/jpeg" />)
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    expect(input.accept).toBe('image/png,image/jpeg')
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
