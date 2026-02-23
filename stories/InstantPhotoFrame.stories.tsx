import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import {
  InstantPhotoFrame,
  FRAME_SPECS,
  PRINT_DPI,
  type CaptureFn,
  type CaptureTarget,
  type ExportFormat,
  type FilmType,
  type FrameType,
} from '../src'

// ---------------------------------------------------------------------------
// Stable Picsum seed images matched to each format's aspect ratio
// ---------------------------------------------------------------------------
const IMGS: Record<FrameType, string> = {
  polaroid_600: 'https://picsum.photos/seed/polaroid/800/800',
  instax_mini: 'https://picsum.photos/seed/instaxmini/600/810',
  instax_square: 'https://picsum.photos/seed/instaxsq/800/800',
  instax_wide: 'https://picsum.photos/seed/instaxwide/1000/625',
}

// Display widths (CSS px) that look good in Storybook for each format
const DISPLAY_WIDTHS: Record<FrameType, number> = {
  polaroid_600: 280,
  instax_mini: 200,
  instax_square: 260,
  instax_wide: 360,
}

// ---------------------------------------------------------------------------
// Storybook meta
// ---------------------------------------------------------------------------
const meta: Meta<typeof InstantPhotoFrame> = {
  title: 'Components/InstantPhotoFrame',
  component: InstantPhotoFrame,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
  argTypes: {
    src: { control: false },
    frameType: {
      control: 'select',
      options: [
        'polaroid_600',
        'instax_mini',
        'instax_square',
        'instax_wide',
      ] satisfies FrameType[],
    },
    filmType: {
      control: 'select',
      options: ['polaroid', 'instax', 'original'] satisfies FilmType[],
    },
    grainAmount: {
      control: { type: 'range', min: 0, max: 0.08, step: 0.001 },
    },
    grainSizePx: {
      control: { type: 'range', min: 0.8, max: 3.5, step: 0.01 },
    },
    grainColorAmount: {
      control: { type: 'range', min: 0, max: 1, step: 0.01 },
    },
    halationAmount: {
      control: { type: 'range', min: 0, max: 0.5, step: 0.01 },
    },
    vignetteIntensity: {
      control: { type: 'range', min: 0, max: 1, step: 0.01 },
    },
    seed: { control: { type: 'number' } },
    width: { control: false },
    onRender: { control: false },
    onError: { control: false },
  },
}
export default meta
type Story = StoryObj<typeof InstantPhotoFrame>

// ---------------------------------------------------------------------------
// Individual format stories
// ---------------------------------------------------------------------------

export const Polaroid600: Story = {
  name: 'Polaroid 600',
  args: {
    src: IMGS.polaroid_600,
    frameType: 'polaroid_600',
    filmType: 'polaroid',
    width: DISPLAY_WIDTHS.polaroid_600,
  },
}
export const InstaxMini: Story = {
  name: 'Instax Mini',
  args: {
    src: IMGS.instax_mini,
    frameType: 'instax_mini',
    filmType: 'instax',
    width: DISPLAY_WIDTHS.instax_mini,
  },
}
export const InstaxSquare: Story = {
  name: 'Instax Square',
  args: {
    src: IMGS.instax_square,
    frameType: 'instax_square',
    filmType: 'instax',
    width: DISPLAY_WIDTHS.instax_square,
  },
}
export const InstaxWide: Story = {
  name: 'Instax Wide',
  args: {
    src: IMGS.instax_wide,
    frameType: 'instax_wide',
    filmType: 'instax',
    width: DISPLAY_WIDTHS.instax_wide,
  },
}

export const Original: Story = {
  name: 'Original (Shadow Only)',
  args: {
    src: IMGS.polaroid_600,
    frameType: 'polaroid_600',
    filmType: 'original',
    width: DISPLAY_WIDTHS.polaroid_600,
  },
}

export const AllFormats: Story = {
  name: 'All formats',
  render: () => (
    <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start', flexWrap: 'wrap' }}>
      {(Object.keys(IMGS) as FrameType[]).map(ft => (
        <InstantPhotoFrame key={ft} src={IMGS[ft]} frameType={ft} width={DISPLAY_WIDTHS[ft]} />
      ))}
    </div>
  ),
}

// ---------------------------------------------------------------------------
// Export playground
// ---------------------------------------------------------------------------

const LABEL: Record<string, string> = {
  polaroid_600: 'Polaroid 600',
  instax_mini: 'Instax Mini',
  instax_square: 'Instax Square',
  instax_wide: 'Instax Wide',
  polaroid: 'Polaroid',
  instax: 'Instax',
  original: 'Original',
  image: 'Image only (no border)',
  frame: 'Full frame (white border)',
  'image/png': 'PNG',
  'image/jpeg': 'JPEG',
  'image/webp': 'WebP',
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = Object.assign(document.createElement('a'), { href: url, download: filename })
  a.click()
  URL.revokeObjectURL(url)
}

function ExportPlaygroundPanel() {
  const [frameType, setFrameType] = useState<FrameType>('polaroid_600')
  const [filmType, setFilmType] = useState<FilmType>('polaroid')
  const [target, setTarget] = useState<CaptureTarget>('image')
  const [format, setFormat] = useState<ExportFormat>('image/png')
  const [quality, setQuality] = useState(0.92)
  const [capture, setCapture] = useState<CaptureFn>()
  const [busy, setBusy] = useState(false)
  const [lastSize, setLastSize] = useState<string>()

  const spec = FRAME_SPECS[frameType]
  const [cw, ch] = spec.canvasSize
  const scale = cw / spec.imageSize[0]
  const frameW = Math.round(spec.totalSize[0] * scale)
  const frameH = Math.round(spec.totalSize[1] * scale)

  const outputDims = target === 'image' ? `${cw} × ${ch} px` : `${frameW} × ${frameH} px`

  async function handleDownload() {
    if (!capture) return
    setBusy(true)
    setLastSize(undefined)
    try {
      const blob = await capture({
        target,
        format,
        quality: format === 'image/png' ? undefined : quality,
      })
      if (!blob) return
      const ext = format.split('/')[1]
      const name = `${frameType}_${target}.${ext}`
      downloadBlob(blob, name)
      setLastSize(`${(blob.size / 1024).toFixed(1)} KB`)
    } finally {
      setBusy(false)
    }
  }

  // Re-mount the frame when frameType changes so canvas is re-initialised
  const frameKey = frameType

  return (
    <div
      style={{
        display: 'flex',
        gap: 32,
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        maxWidth: 700,
      }}
    >
      {/* ── Preview ── */}
      <InstantPhotoFrame
        key={frameKey}
        src={IMGS[frameType]}
        frameType={frameType}
        filmType={filmType}
        width={DISPLAY_WIDTHS[frameType]}
        onRender={setCapture}
      />

      {/* ── Controls ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 220 }}>
        <fieldset style={fieldsetStyle}>
          <legend style={legendStyle}>Format</legend>
          {(['polaroid_600', 'instax_mini', 'instax_square', 'instax_wide'] as FrameType[]).map(
            ft => (
              <label key={ft} style={radioRowStyle}>
                <input
                  type="radio"
                  name="frameType"
                  value={ft}
                  checked={frameType === ft}
                  onChange={() => {
                    setFrameType(ft)
                    setCapture(undefined)
                  }}
                />
                {LABEL[ft]}
              </label>
            )
          )}
        </fieldset>

        <fieldset style={fieldsetStyle}>
          <legend style={legendStyle}>Film</legend>
          {(['polaroid', 'instax', 'original'] as FilmType[]).map(f => (
            <label key={f} style={radioRowStyle}>
              <input
                type="radio"
                name="filmType"
                value={f}
                checked={filmType === f}
                onChange={() => setFilmType(f)}
              />
              {LABEL[f]}
            </label>
          ))}
        </fieldset>

        <fieldset style={fieldsetStyle}>
          <legend style={legendStyle}>Download target</legend>
          {(['image', 'frame'] as CaptureTarget[]).map(t => (
            <label key={t} style={radioRowStyle}>
              <input
                type="radio"
                name="target"
                value={t}
                checked={target === t}
                onChange={() => setTarget(t)}
              />
              {LABEL[t]}
            </label>
          ))}
        </fieldset>

        <fieldset style={fieldsetStyle}>
          <legend style={legendStyle}>File format</legend>
          {(['image/png', 'image/jpeg', 'image/webp'] as ExportFormat[]).map(f => (
            <label key={f} style={radioRowStyle}>
              <input
                type="radio"
                name="format"
                value={f}
                checked={format === f}
                onChange={() => setFormat(f)}
              />
              {LABEL[f]}
            </label>
          ))}
          {format !== 'image/png' && (
            <label style={{ ...radioRowStyle, marginTop: 6, flexDirection: 'column', gap: 2 }}>
              <span>
                Quality: <strong>{Math.round(quality * 100)}%</strong>
              </span>
              <input
                type="range"
                min={0.1}
                max={1}
                step={0.01}
                value={quality}
                onChange={e => setQuality(parseFloat(e.target.value))}
                style={{ width: '100%' }}
              />
            </label>
          )}
        </fieldset>

        {/* Output info */}
        <div style={{ fontSize: 11, color: '#666', lineHeight: 1.6 }}>
          <div>
            Canvas:{' '}
            <strong>
              {cw} × {ch} px
            </strong>{' '}
            ({PRINT_DPI} DPI)
          </div>
          <div>
            Output: <strong>{outputDims}</strong>
          </div>
          {lastSize && (
            <div>
              Last download: <strong>{lastSize}</strong>
            </div>
          )}
        </div>

        <button
          onClick={handleDownload}
          disabled={!capture || busy}
          style={buttonStyle(!capture || busy)}
        >
          {busy ? 'Preparing…' : capture ? '⬇ Download' : 'Rendering…'}
        </button>
      </div>
    </div>
  )
}

// Minimal inline styles — no external dependencies
const fieldsetStyle: React.CSSProperties = {
  border: '1px solid #ddd',
  borderRadius: 6,
  padding: '8px 12px',
  margin: 0,
}
const legendStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: '#888',
}
const radioRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  fontSize: 13,
  cursor: 'pointer',
}
function buttonStyle(disabled: boolean): React.CSSProperties {
  return {
    padding: '10px 0',
    borderRadius: 6,
    border: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    background: disabled ? '#ccc' : '#1a1a1a',
    color: '#fff',
    fontWeight: 600,
    fontSize: 14,
  }
}

export const ExportPlayground: Story = {
  name: '⬇ Export playground',
  render: () => <ExportPlaygroundPanel />,
  parameters: { layout: 'padded' },
}

// ---------------------------------------------------------------------------
// Error state story
// ---------------------------------------------------------------------------

function ErrorStatePanel() {
  const [errorMsg, setErrorMsg] = useState<string>()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
      <InstantPhotoFrame
        src="https://this-domain-does-not-exist.invalid/image.jpg"
        width={280}
        onError={err => setErrorMsg(err.message)}
      />
      {errorMsg ? (
        <div
          role="alert"
          style={{
            background: '#fef2f2',
            border: '1px solid #fca5a5',
            borderRadius: 6,
            padding: '8px 14px',
            fontSize: 13,
            color: '#b91c1c',
            maxWidth: 280,
            wordBreak: 'break-word',
          }}
        >
          <strong>Error caught by onError:</strong>
          <br />
          {errorMsg}
        </div>
      ) : (
        <div style={{ fontSize: 12, color: '#888', fontStyle: 'italic' }}>
          Waiting for network error…
        </div>
      )}
    </div>
  )
}

export const ErrorState: Story = {
  name: '⚠️ Error state (broken URL)',
  render: () => <ErrorStatePanel />,
  parameters: { layout: 'centered' },
}
