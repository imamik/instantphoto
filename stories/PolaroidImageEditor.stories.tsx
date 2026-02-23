import { useCallback, useRef, useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import {
  FILM_PROFILES,
  PolaroidImageEditor,
  FRAME_SPECS,
  PRINT_DPI,
  type CaptureFn,
  type CaptureTarget,
  type ExportFormat,
  type FilmType,
  type FrameType,
  type ImageTransform,
  type PolaroidSettings,
} from '../src'

// ---------------------------------------------------------------------------
// Storybook meta
// ---------------------------------------------------------------------------

const meta: Meta<typeof PolaroidImageEditor> = {
  title: 'Components/PolaroidImageEditor',
  component: PolaroidImageEditor,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
}
export default meta
type Story = StoryObj<typeof PolaroidImageEditor>

// ---------------------------------------------------------------------------
// Helpers
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

const DISPLAY_WIDTHS: Record<FrameType, number> = {
  polaroid_600: 640,
  instax_mini: 440,
  instax_square: 560,
  instax_wide: 860,
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = Object.assign(document.createElement('a'), { href: url, download: filename })
  a.click()
  URL.revokeObjectURL(url)
}

// ---------------------------------------------------------------------------
// Image Editor story
// ---------------------------------------------------------------------------

function ImageEditorPanel() {
  const [frameType, setFrameType] = useState<FrameType>('polaroid_600')
  const [filmType, setFilmType] = useState<FilmType>('polaroid')
  const [target, setTarget] = useState<CaptureTarget>('image')
  const [format, setFormat] = useState<ExportFormat>('image/png')
  const [quality, setQuality] = useState(0.92)
  const [grainAmount, setGrainAmount] = useState(FILM_PROFILES.polaroid.grainAmount)
  const [grainSizePx, setGrainSizePx] = useState(2.08)
  const [grainColorAmount, setGrainColorAmount] = useState(1)
  const [halationAmount, setHalationAmount] = useState(FILM_PROFILES.polaroid.halationAmount)
  const [vignetteIntensity, setVignetteIntensity] = useState(
    FILM_PROFILES.polaroid.vignetteIntensity
  )
  const [chromaticShift, setChromaticShift] = useState(FILM_PROFILES.polaroid.chromaticShift)
  const [saturationDelta, setSaturationDelta] = useState(FILM_PROFILES.polaroid.saturationDelta)
  const [filmCurveAmount, setFilmCurveAmount] = useState(1)
  const [shadowWideIntensity, setShadowWideIntensity] = useState(0.31)
  const [shadowWideStart, setShadowWideStart] = useState(0.02)
  const [shadowWideEnd, setShadowWideEnd] = useState(0.11)
  const [shadowFineIntensity, setShadowFineIntensity] = useState(0.3)
  const [shadowFineStart, setShadowFineStart] = useState(0.003)
  const [shadowFineEnd, setShadowFineEnd] = useState(0.006)
  const [liveUpdateDuringGesture, setLiveUpdateDuringGesture] = useState(true)

  const [src, setSrc] = useState<string | undefined>(undefined)
  const [capture, setCapture] = useState<CaptureFn | undefined>(undefined)
  const [busy, setBusy] = useState(false)
  const [lastSize, setLastSize] = useState<string | undefined>(undefined)
  const [zoom, setZoom] = useState(1)

  const fileInputRef = useRef<HTMLInputElement>(null)

  function applyFilmDefaults(ft: FilmType) {
    const p = FILM_PROFILES[ft]
    setGrainAmount(p.grainAmount)
    setHalationAmount(p.halationAmount)
    setVignetteIntensity(p.vignetteIntensity)
    setChromaticShift(p.chromaticShift)
    setSaturationDelta(p.saturationDelta)
    setFilmCurveAmount(ft === 'original' ? 0 : 1)
  }

  // Load the selected file as an object URL
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (src) URL.revokeObjectURL(src)
    setSrc(URL.createObjectURL(file))
    setCapture(undefined)
  }

  // Keep zoom readout in sync without re-rendering the editor
  const handleTransformChange = useCallback((t: ImageTransform) => {
    setZoom(Math.round(t.scale * 10) / 10)
  }, [])

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
      const name = `polaroid-editor_${frameType}_${target}.${ext}`
      downloadBlob(blob, name)
      setLastSize(`${(blob.size / 1024).toFixed(1)} KB`)
    } finally {
      setBusy(false)
    }
  }

  const spec = FRAME_SPECS[frameType]
  const [cw, ch] = spec.canvasSize
  const scale = cw / spec.imageSize[0]
  const frameW = Math.round(spec.totalSize[0] * scale)
  const frameH = Math.round(spec.totalSize[1] * scale)

  const outputDims = target === 'image' ? `${cw} × ${ch} px` : `${frameW} × ${frameH} px`

  // Re-mount the editor when frameType changes so the canvas is re-initialised
  const editorKey = `${frameType}-${src ?? 'empty'}`

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        maxWidth: 1700,
        width: '100%',
      }}
    >
      <div style={topSplitStyle}>
        <div style={previewColumnStyle}>
          <div style={previewSurfaceStyle}>
            <PolaroidImageEditor
              key={editorKey}
              src={src}
              frameType={frameType}
              filmType={filmType}
              grainAmount={grainAmount}
              grainSizePx={grainSizePx}
              grainColorAmount={grainColorAmount}
              halationAmount={halationAmount}
              vignetteIntensity={vignetteIntensity}
              chromaticShift={chromaticShift}
              saturationDelta={saturationDelta}
              filmCurveAmount={filmCurveAmount}
              shadowWideIntensity={shadowWideIntensity}
              shadowWideStart={shadowWideStart}
              shadowWideEnd={shadowWideEnd}
              shadowFineIntensity={shadowFineIntensity}
              shadowFineStart={shadowFineStart}
              shadowFineEnd={shadowFineEnd}
              liveUpdateDuringGesture={liveUpdateDuringGesture}
              width={DISPLAY_WIDTHS[frameType]}
              onRender={fn => setCapture(() => fn)}
              onTransformChange={handleTransformChange}
            />
          </div>
          {src && (
            <div style={{ fontSize: 11, color: '#888' }}>
              Zoom: <strong>{zoom.toFixed(1)}×</strong>
              &nbsp;·&nbsp;drag to pan&nbsp;·&nbsp;scroll or pinch to zoom
            </div>
          )}
          {!src && (
            <div style={{ fontSize: 11, color: '#aaa', fontStyle: 'italic' }}>
              Upload a photo to begin
            </div>
          )}
        </div>

        <div style={controlColumnStyle}>
          <fieldset style={fieldsetStyle}>
            <legend style={legendStyle}>Image</legend>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
            <button onClick={() => fileInputRef.current?.click()} style={buttonStyle(false)}>
              Upload photo
            </button>
          </fieldset>

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
                  onChange={() => {
                    setFilmType(f)
                    applyFilmDefaults(f)
                  }}
                />
                {LABEL[f]}
              </label>
            ))}
          </fieldset>

          <fieldset style={fieldsetStyle}>
            <legend style={legendStyle}>Interaction</legend>
            <label style={radioRowStyle}>
              <input
                type="checkbox"
                checked={liveUpdateDuringGesture}
                onChange={e => setLiveUpdateDuringGesture(e.target.checked)}
              />
              Live update while dragging
            </label>
          </fieldset>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={sectionHeadingStyle}>Visual Parameters</div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 14,
          }}
        >
          <fieldset style={fieldsetStyle}>
            <legend style={legendStyle}>Grain</legend>
            <label style={sliderRowStyle}>
              <span>
                Grain: <strong>{grainAmount.toFixed(3)}</strong>
              </span>
              <input
                type="range"
                min={0}
                max={0.08}
                step={0.001}
                value={grainAmount}
                onChange={e => setGrainAmount(parseFloat(e.target.value))}
              />
            </label>
            <label style={sliderRowStyle}>
              <span>
                Grain size: <strong>{grainSizePx.toFixed(2)} px</strong>
              </span>
              <input
                type="range"
                min={0.8}
                max={3.5}
                step={0.01}
                value={grainSizePx}
                onChange={e => setGrainSizePx(parseFloat(e.target.value))}
              />
            </label>
            <label style={sliderRowStyle}>
              <span>
                Grain color: <strong>{grainColorAmount.toFixed(2)}</strong>
              </span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={grainColorAmount}
                onChange={e => setGrainColorAmount(parseFloat(e.target.value))}
              />
            </label>
          </fieldset>

          <fieldset style={fieldsetStyle}>
            <legend style={legendStyle}>Tone</legend>
            <label style={sliderRowStyle}>
              <span>
                Halation: <strong>{halationAmount.toFixed(3)}</strong>
              </span>
              <input
                type="range"
                min={0}
                max={0.5}
                step={0.005}
                value={halationAmount}
                onChange={e => setHalationAmount(parseFloat(e.target.value))}
              />
            </label>
            <label style={sliderRowStyle}>
              <span>
                Vignette: <strong>{vignetteIntensity.toFixed(3)}</strong>
              </span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={vignetteIntensity}
                onChange={e => setVignetteIntensity(parseFloat(e.target.value))}
              />
            </label>
            <label style={sliderRowStyle}>
              <span>
                Chromatic shift: <strong>{chromaticShift.toFixed(2)} px</strong>
              </span>
              <input
                type="range"
                min={0}
                max={4}
                step={0.05}
                value={chromaticShift}
                onChange={e => setChromaticShift(parseFloat(e.target.value))}
              />
            </label>
            <label style={sliderRowStyle}>
              <span>
                Film curve amount: <strong>{filmCurveAmount.toFixed(2)}</strong>
              </span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={filmCurveAmount}
                onChange={e => setFilmCurveAmount(parseFloat(e.target.value))}
              />
            </label>
            <label style={sliderRowStyle}>
              <span>
                Saturation delta: <strong>{saturationDelta.toFixed(1)}</strong>
              </span>
              <input
                type="range"
                min={-40}
                max={40}
                step={0.5}
                value={saturationDelta}
                onChange={e => setSaturationDelta(parseFloat(e.target.value))}
              />
            </label>
          </fieldset>

          <fieldset style={fieldsetStyle}>
            <legend style={legendStyle}>Shadow Wide</legend>
            <label style={sliderRowStyle}>
              <span>
                Shadow wide intensity: <strong>{shadowWideIntensity.toFixed(2)}</strong>
              </span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={shadowWideIntensity}
                onChange={e => setShadowWideIntensity(parseFloat(e.target.value))}
              />
            </label>
            <label style={sliderRowStyle}>
              <span>
                Shadow wide start: <strong>{shadowWideStart.toFixed(3)}</strong>
              </span>
              <input
                type="range"
                min={0}
                max={0.2}
                step={0.001}
                value={shadowWideStart}
                onChange={e => setShadowWideStart(parseFloat(e.target.value))}
              />
            </label>
            <label style={sliderRowStyle}>
              <span>
                Shadow wide end: <strong>{shadowWideEnd.toFixed(3)}</strong>
              </span>
              <input
                type="range"
                min={0.001}
                max={0.3}
                step={0.001}
                value={shadowWideEnd}
                onChange={e => setShadowWideEnd(parseFloat(e.target.value))}
              />
            </label>
          </fieldset>

          <fieldset style={fieldsetStyle}>
            <legend style={legendStyle}>Shadow Fine</legend>
            <label style={sliderRowStyle}>
              <span>
                Shadow fine intensity: <strong>{shadowFineIntensity.toFixed(2)}</strong>
              </span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={shadowFineIntensity}
                onChange={e => setShadowFineIntensity(parseFloat(e.target.value))}
              />
            </label>
            <label style={sliderRowStyle}>
              <span>
                Shadow fine start: <strong>{shadowFineStart.toFixed(4)}</strong>
              </span>
              <input
                type="range"
                min={0}
                max={0.05}
                step={0.0005}
                value={shadowFineStart}
                onChange={e => setShadowFineStart(parseFloat(e.target.value))}
              />
            </label>
            <label style={sliderRowStyle}>
              <span>
                Shadow fine end: <strong>{shadowFineEnd.toFixed(4)}</strong>
              </span>
              <input
                type="range"
                min={0.0005}
                max={0.08}
                step={0.0005}
                value={shadowFineEnd}
                onChange={e => setShadowFineEnd(parseFloat(e.target.value))}
              />
            </label>
          </fieldset>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 14,
          alignItems: 'start',
        }}
      >
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

        <div style={{ fontSize: 11, color: '#666', lineHeight: 1.6, gridColumn: '1 / -1' }}>
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
          style={{ ...buttonStyle(!capture || busy), gridColumn: '1 / -1' }}
        >
          {busy ? 'Preparing…' : capture ? '⬇ Download' : src ? 'Rendering…' : 'No image'}
        </button>
      </div>
    </div>
  )
}

// Minimal inline styles
const topSplitStyle: React.CSSProperties = {
  display: 'flex',
  gap: 18,
  flexWrap: 'wrap',
  alignItems: 'flex-start',
}
const previewColumnStyle: React.CSSProperties = {
  flex: '2 1 780px',
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
}
const previewSurfaceStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  minHeight: 540,
  border: '1px solid #e5e5e5',
  borderRadius: 8,
  background: 'linear-gradient(180deg, #fcfcfc 0%, #f6f6f6 100%)',
  padding: 16,
}
const controlColumnStyle: React.CSSProperties = {
  flex: '1 1 340px',
  minWidth: 300,
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
}
const sectionHeadingStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: '#666',
}
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
const sliderRowStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  fontSize: 12,
  marginTop: 6,
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

export const ImageEditor: Story = {
  name: '✏️ Image Editor',
  render: () => <ImageEditorPanel />,
  parameters: { layout: 'padded' },
}

// ---------------------------------------------------------------------------
// Error state story
// ---------------------------------------------------------------------------

function ErrorStatePanel() {
  const [errorMsg, setErrorMsg] = useState<string>()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
      <PolaroidImageEditor
        src="https://this-domain-does-not-exist.invalid/image.jpg"
        width={320}
        onError={err => setErrorMsg(err.message)}
      />
      {errorMsg && (
        <div
          role="alert"
          style={{
            background: '#fef2f2',
            border: '1px solid #fca5a5',
            borderRadius: 6,
            padding: '8px 14px',
            fontSize: 13,
            color: '#b91c1c',
            maxWidth: 320,
            wordBreak: 'break-word',
          }}
        >
          <strong>Error caught by onError:</strong>
          <br />
          {errorMsg}
        </div>
      )}
      {!errorMsg && (
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

// ---------------------------------------------------------------------------
// Loading / placeholder state story
// ---------------------------------------------------------------------------

export const PlaceholderState: Story = {
  name: '⏳ Placeholder (no image)',
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
      <PolaroidImageEditor width={320} />
      <div style={{ fontSize: 12, color: '#aaa', fontStyle: 'italic' }}>
        Editor with no src — shows blank frame
      </div>
    </div>
  ),
  parameters: { layout: 'centered' },
}

// ---------------------------------------------------------------------------
// Settings export / onSettingsChange demo
// ---------------------------------------------------------------------------

function SettingsExportPanel() {
  const [src, setSrc] = useState<string | undefined>()
  const [settings, setSettings] = useState<PolaroidSettings | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (src) URL.revokeObjectURL(src)
    setSrc(URL.createObjectURL(file))
  }

  return (
    <div
      style={{
        display: 'flex',
        gap: 20,
        flexWrap: 'wrap',
        alignItems: 'flex-start',
        maxWidth: 900,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          style={{
            padding: '8px 16px',
            borderRadius: 6,
            border: '1px solid #ddd',
            cursor: 'pointer',
          }}
        >
          Upload photo
        </button>
        <PolaroidImageEditor src={src} width={300} onSettingsChange={setSettings} />
      </div>
      <div style={{ flex: 1, minWidth: 280 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: 'uppercase',
            color: '#888',
            marginBottom: 6,
          }}
        >
          Live settings snapshot (onSettingsChange)
        </div>
        <pre
          style={{
            background: '#f6f6f6',
            borderRadius: 6,
            padding: 12,
            fontSize: 11,
            overflow: 'auto',
            maxHeight: 500,
            margin: 0,
          }}
        >
          {settings
            ? JSON.stringify(settings, null, 2)
            : '(change a setting or gesture to see output)'}
        </pre>
      </div>
    </div>
  )
}

export const SettingsExport: Story = {
  name: '📋 Settings export (onSettingsChange)',
  render: () => <SettingsExportPanel />,
  parameters: { layout: 'padded' },
}
