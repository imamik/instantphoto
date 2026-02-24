import type React from 'react'

/** Supported instant photo frame formats */
export type FrameType = 'polaroid_600' | 'instax_mini' | 'instax_square' | 'instax_wide'

/**
 * A built-in `FrameType` string or an inline `FrameSpec` object.
 * Pass a custom `FrameSpec` directly to use a fully custom frame format,
 * or register one by ID with `registerFrameSpec` and pass that string ID.
 */
export type FrameTypeOrSpec = FrameType | FrameSpec

/** Film emulsion characteristic to emulate */
export type FilmType = 'polaroid' | 'instax' | 'original'

/** Internal layout specification for a single frame type */
export interface FrameSpec {
  /** [width, height] of the total frame in reference pixels */
  totalSize: readonly [number, number]
  /** [width, height] of the image content area in reference pixels */
  imageSize: readonly [number, number]
  /** [x, y] top-left offset of the image within the total frame */
  imagePos: readonly [number, number]
  /**
   * Fixed WebGL canvas pixel dimensions derived from the format's physical
   * image-area size at 300 DPI.  The canvas always renders at this resolution
   * regardless of how it is displayed, so exporting it yields a print-ready
   * image at the correct pixel density.
   *
   * Formula: Math.round(physical_mm / 25.4 * 300)
   */
  canvasSize: readonly [number, number]
  /** Corner radius in reference pixels */
  cornerRadius: number
  /** Frame paper color as CSS hex string */
  paperColor: string
  /** CSS box-shadow value for the drop shadow behind the whole frame */
  shadow: string
}

/** Film-profile derived parameters passed to the WebGL pipeline */
export interface FilmProfile {
  vignetteIntensity: number
  halationAmount: number
  grainAmount: number
  chromaticShift: number
  saturationDelta: number
}

/** All options consumed by the WebGL render pipeline */
export interface InstantPhotoGLOptions {
  filmType: FilmType
  /** Fixed canvas pixel dimensions at 300 DPI (from FrameSpec.canvasSize) */
  canvasSize: readonly [number, number]
  /** Image aspect ratio the canvas should crop the source to */
  imageAspect: number
  /** Rounded-corner radius for the image area in canvas pixels */
  imageCornerRadiusPx?: number
  vignetteIntensity?: number
  halationAmount?: number
  grainAmount?: number
  /** Grain particle size in output pixels. */
  grainSizePx?: number
  /** Colored grain amount (0 = monochrome, 1 = default subtle color). */
  grainColorAmount?: number
  chromaticShift?: number
  saturationDelta?: number
  filmCurveAmount?: number
  shadowWideIntensity?: number
  shadowWideStart?: number
  shadowWideEnd?: number
  shadowFineIntensity?: number
  shadowFineStart?: number
  shadowFineEnd?: number
  seed: number
}

// ---------------------------------------------------------------------------
// Capture / export API
// ---------------------------------------------------------------------------

/**
 * What to include in the exported image.
 *
 * - `'image'` – the WebGL canvas only: just the film-effect photo, no border.
 *   Pixel dimensions equal `FrameSpec.canvasSize` (300 DPI).
 *
 * - `'frame'` – the full instant photo frame: white paper border + photo composited
 *   together on a single canvas, scaled to 300 DPI.  Useful for sharing or
 *   printing the authentic instant-film look including the white surround.
 */
export type CaptureTarget = 'image' | 'frame'

/** Output image format for `CaptureFn`. */
export type ExportFormat = 'image/png' | 'image/jpeg' | 'image/webp'

export interface CaptureOptions {
  /**
   * What to capture.
   * - `'image'` (default) – film-effect canvas only, no border.
   * - `'frame'` – full instant photo frame with white paper surround.
   */
  target?: CaptureTarget
  /** Output format. Defaults to `'image/png'`. */
  format?: ExportFormat
  /**
   * Encoding quality for `'image/jpeg'` and `'image/webp'`, 0–1.
   * Ignored for PNG. Defaults to `0.92`.
   */
  quality?: number
}

/**
 * Stable function provided via `InstantPhotoFrameProps.onRender`.
 *
 * Call it at any time after the component has rendered to obtain the
 * processed image as a Blob.  The canvas is always at its 300 DPI
 * print resolution regardless of display size.
 *
 * ```tsx
 * const [capture, setCapture] = useState<CaptureFn>()
 *
 * <InstantPhotoFrame src="photo.jpg" onRender={setCapture} />
 *
 * // Export the image area only (default):
 * const blob = await capture?.()
 *
 * // Export the full frame (white border included):
 * const blob = await capture?.({ target: 'frame', format: 'image/jpeg', quality: 0.9 })
 * ```
 */
export type CaptureFn = (options?: CaptureOptions) => Promise<Blob | null>

// ---------------------------------------------------------------------------
// Interactive pan/zoom transform
// ---------------------------------------------------------------------------

/**
 * Pan/zoom transform applied to the source image inside the frame.
 * All values are in UV space (0–1 range, relative to the source image).
 *
 * - `panX / panY` – UV-unit offsets from the center-fill position.
 *   Positive X moves the viewport right (shows the left part of the image).
 * - `scale` – zoom factor ≥ 1 (1 = center-fill crop, no extra zoom).
 *   At `scale = 1`, panning can still move along any axis that is cropped
 *   by aspect-ratio mismatch (for example, wide panoramas in portrait frames).
 */
export interface ImageTransform {
  panX: number
  panY: number
  scale: number
}

// ---------------------------------------------------------------------------
// Settings snapshot – transform + all resolved effect parameters.
// Useful for persisting editor state or embedding metadata alongside exports.
// ---------------------------------------------------------------------------

/**
 * A serialisable snapshot of all editor settings at a point in time.
 * Returned by `onSettingsChange` on `InstantPhotoImageEditor`.
 *
 * ```ts
 * // Embed alongside an exported image:
 * const meta = JSON.stringify(settings, null, 2)
 * ```
 */
export interface InstantPhotoSettings {
  frameType: FrameTypeOrSpec
  filmType: FilmType
  transform: ImageTransform
  grainAmount: number
  grainSizePx: number
  grainColorAmount: number
  halationAmount: number
  vignetteIntensity: number
  chromaticShift: number
  saturationDelta: number
  filmCurveAmount: number
  shadowWideIntensity: number
  shadowWideStart: number
  shadowWideEnd: number
  shadowFineIntensity: number
  shadowFineStart: number
  shadowFineEnd: number
  seed: number
}

// ---------------------------------------------------------------------------
// Component props
// ---------------------------------------------------------------------------

/** Props for the InstantPhotoFrame component */
export interface InstantPhotoFrameProps {
  /**
   * Image source. Accepts a URL string, an already-loaded HTMLImageElement,
   * or a decoded ImageBitmap.
   */
  src: string | HTMLImageElement | ImageBitmap
  /** Frame format. Defaults to `'polaroid_600'`. Accepts a built-in `FrameType`, a custom registered ID, or an inline `FrameSpec` object. */
  frameType?: FrameTypeOrSpec
  /** Film emulsion profile. Defaults to `'polaroid'`. */
  filmType?: FilmType
  /** Override grain intensity (0–1). Defaults to film-profile value. */
  grainAmount?: number
  /** Override grain particle size in output pixels. */
  grainSizePx?: number
  /** Override colored grain amount (0 = monochrome, 1 = default subtle color). */
  grainColorAmount?: number
  /** Override halation intensity (0–1). Defaults to film-profile value. */
  halationAmount?: number
  /** Override vignette intensity (0–1). Defaults to film-profile value. */
  vignetteIntensity?: number
  /** Override chromatic shift in source-image pixels. */
  chromaticShift?: number
  /** Override saturation delta (-100 to +100). */
  saturationDelta?: number
  /** Blend amount for film color curves (0 = off, 1 = full). */
  filmCurveAmount?: number
  /** Large inbound shadow intensity. */
  shadowWideIntensity?: number
  /** Large inbound shadow start distance in UV units. */
  shadowWideStart?: number
  /** Large inbound shadow end distance in UV units. */
  shadowWideEnd?: number
  /** Fine inward edge-line intensity. */
  shadowFineIntensity?: number
  /** Fine inward edge-line start distance in UV units. */
  shadowFineStart?: number
  /** Fine inward edge-line end distance in UV units. */
  shadowFineEnd?: number
  /**
   * Seed for deterministic grain.
   * `0` (default) picks a random seed on every render.
   */
  seed?: number
  /** CSS width of the frame. Defaults to `'100%'`. */
  width?: number | string
  className?: string
  style?: React.CSSProperties
  /**
   * Called after each successful render (on first load and whenever `src`
   * changes) with a stable `capture()` function.  Store it and call at any
   * time to export the image or the full frame as a print-ready Blob.
   *
   * ```tsx
   * const [capture, setCapture] = useState<CaptureFn>()
   * <InstantPhotoFrame src={src} onRender={setCapture} />
   *
   * <button onClick={() => capture?.().then(saveFile)}>
   *   Download image
   * </button>
   * <button onClick={() => capture?.({ target: 'frame' }).then(saveFile)}>
   *   Download with frame
   * </button>
   * ```
   */
  onRender?: (capture: CaptureFn) => void
  /** Called if WebGL initialisation or image loading fails. */
  onError?: (error: Error) => void
}

/** Props for the InstantPhotoImageEditor component */
export interface InstantPhotoImageEditorProps {
  /**
   * Image source.  Optional — the editor renders a placeholder until an image
   * is provided (useful for file-upload flows where src starts undefined).
   */
  src?: string | HTMLImageElement | ImageBitmap
  /** Rendered centred inside the image area when `src` is not set. */
  emptyState?: React.ReactNode
  /**
   * Rendered inside the image area on top of the photo when `src` is set.
   * The wrapper has `pointer-events: none`; add `pointer-events: auto` to
   * interactive children (buttons, icons).
   */
  imageOverlay?: React.ReactNode
  /** Frame format. Defaults to `'polaroid_600'`. Accepts a built-in `FrameType`, a custom registered ID, or an inline `FrameSpec` object. */
  frameType?: FrameTypeOrSpec
  /** Film emulsion profile. Defaults to `'polaroid'`. */
  filmType?: FilmType
  /** Override grain intensity (0–1). Defaults to film-profile value. */
  grainAmount?: number
  /** Override grain particle size in output pixels. */
  grainSizePx?: number
  /** Override colored grain amount (0 = monochrome, 1 = default subtle color). */
  grainColorAmount?: number
  /** Override halation intensity (0–1). Defaults to film-profile value. */
  halationAmount?: number
  /** Override vignette intensity (0–1). Defaults to film-profile value. */
  vignetteIntensity?: number
  /** Override chromatic shift in source-image pixels. */
  chromaticShift?: number
  /** Override saturation delta (-100 to +100). */
  saturationDelta?: number
  /** Blend amount for film color curves (0 = off, 1 = full). */
  filmCurveAmount?: number
  /** Large inbound shadow intensity. */
  shadowWideIntensity?: number
  /** Large inbound shadow start distance in UV units. */
  shadowWideStart?: number
  /** Large inbound shadow end distance in UV units. */
  shadowWideEnd?: number
  /** Fine inward edge-line intensity. */
  shadowFineIntensity?: number
  /** Fine inward edge-line start distance in UV units. */
  shadowFineStart?: number
  /** Fine inward edge-line end distance in UV units. */
  shadowFineEnd?: number
  /**
   * Seed for deterministic grain.
   * `0` (default) picks a random seed on every render.
   */
  seed?: number
  /** Maximum zoom factor. Defaults to `5`. */
  maxZoom?: number
  /**
   * Milliseconds to wait after the last gesture before firing `onRender`.
   * Prevents flooding consumers with captures during fast drags.
   * Defaults to `600`.
   */
  onRenderDelay?: number
  /**
   * Whether to re-render the WebGL pipeline on every gesture update.
   * - `true`: highest fidelity live preview.
   * - `false`: lightweight GPU raw-source preview during drag/pinch (no
   *   film effects), one full-effects render on gesture end (typically much
   *   smoother on low-end/mobile devices).
   * - When omitted (default), the value is **auto-detected** at mount time:
   *   `false` on low-end/mobile devices (≤2 CPU cores or mobile UA),
   *   `true` on all other devices.
   */
  liveUpdateDuringGesture?: boolean
  /** CSS width of the frame. Defaults to `'100%'`. */
  width?: number | string
  className?: string
  style?: React.CSSProperties
  /**
   * Called whenever the pan/zoom transform changes (on every gesture event).
   * Useful for displaying a zoom readout or syncing state.
   */
  onTransformChange?: (transform: ImageTransform) => void
  /**
   * Called after the user finishes a gesture (with `onRenderDelay` debounce)
   * and on initial image load, with a stable `capture()` function.
   */
  onRender?: (capture: CaptureFn) => void
  /** Called if WebGL initialisation or image loading fails. */
  onError?: (error: Error) => void
  /**
   * Called whenever the editor's settings change (transform or any effect
   * parameter).  Receives a full serialisable snapshot that can be persisted
   * or embedded as metadata alongside an exported image.
   *
   * ```ts
   * <InstantPhotoImageEditor onSettingsChange={s => console.log(JSON.stringify(s))} />
   * ```
   */
  onSettingsChange?: (settings: InstantPhotoSettings) => void
  /**
   * Called after the editor performs a keyboard undo (Ctrl+Z / Cmd+Z).
   * The editor has already applied the undo internally; this callback lets
   * the parent react (e.g. update its own state or display a toast).
   */
  onUndo?: (transform: ImageTransform) => void
  /**
   * Called after the editor performs a keyboard redo (Ctrl+Y / Ctrl+Shift+Z).
   */
  onRedo?: (transform: ImageTransform) => void
}

/** Props for the InstantPhotoEditor convenience component */
export interface InstantPhotoEditorProps extends Omit<
  InstantPhotoImageEditorProps,
  'emptyState' | 'imageOverlay'
> {
  /** Called when the user picks a file; a hidden upload button appears when set. */
  onUpload?: (file: File) => void
  /** Called when the delete button is clicked; a delete overlay button appears when set. */
  onDelete?: () => void
  /** `accept` attribute for the hidden file input. Defaults to `'image/*'`. */
  accept?: string
}
