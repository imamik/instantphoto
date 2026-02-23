import type { FilmProfile, FilmType, FrameSpec, FrameType } from '../types'

// ---------------------------------------------------------------------------
// Print resolution
// ---------------------------------------------------------------------------

/**
 * Target DPI used to derive fixed canvas pixel dimensions.
 * Every frame's canvas is sized so that when printed at PRINT_DPI it
 * reproduces the format's authentic physical image area exactly.
 */
export const PRINT_DPI = 300

/**
 * Convert a physical measurement in millimetres to canvas pixels at PRINT_DPI.
 * Formula: mm / 25.4 * PRINT_DPI, rounded to the nearest integer.
 */
function mmToPx(mm: number): number {
  return Math.round((mm / 25.4) * PRINT_DPI)
}

// ---------------------------------------------------------------------------
// Frame specifications
//
// Reference pixel values (totalSize / imageSize / imagePos) come from the
// Go implementation and define CSS layout proportions.
//
// canvasSize is independently derived from each format's physical image-area
// dimensions at PRINT_DPI:
//
//   Polaroid 600   image area: 79 × 79 mm   → 933 × 933 px
//   Instax Mini    image area: 46 × 62 mm   → 543 × 732 px
//   Instax Square  image area: 62 × 62 mm   → 732 × 732 px
//   Instax Wide    image area: 99 × 62 mm   → 1169 × 732 px
// ---------------------------------------------------------------------------

export const FRAME_SPECS: Record<FrameType, FrameSpec> = {
  polaroid_600: {
    totalSize: [1080, 1296],
    imageSize: [956, 956],
    imagePos: [62, 77],
    // Physical image area: 79 × 79 mm (Polaroid 600 square frame)
    canvasSize: [mmToPx(79), mmToPx(79)], // 933 × 933 px
    cornerRadius: 5,
    paperColor: '#FCFCFA',
    shadow: '0 8px 32px rgba(0,0,0,0.30), 0 3px 10px rgba(0,0,0,0.18), 0 1px 3px rgba(0,0,0,0.12)',
  },
  instax_mini: {
    totalSize: [1080, 1720],
    imageSize: [920, 1240],
    imagePos: [80, 100],
    // Physical image area: 46 × 62 mm (Fujifilm Instax Mini, portrait)
    canvasSize: [mmToPx(46), mmToPx(62)], // 543 × 732 px
    cornerRadius: 4,
    paperColor: '#F8F9F7',
    shadow: '0 8px 32px rgba(0,0,0,0.28), 0 3px 10px rgba(0,0,0,0.16), 0 1px 3px rgba(0,0,0,0.10)',
  },
  instax_square: {
    totalSize: [1080, 1290],
    imageSize: [930, 930],
    imagePos: [75, 105],
    // Physical image area: 62 × 62 mm (Fujifilm Instax Square SQ)
    canvasSize: [mmToPx(62), mmToPx(62)], // 732 × 732 px
    cornerRadius: 4.5,
    paperColor: '#F9F9F6',
    shadow: '0 8px 32px rgba(0,0,0,0.28), 0 3px 10px rgba(0,0,0,0.16), 0 1px 3px rgba(0,0,0,0.10)',
  },
  instax_wide: {
    totalSize: [1080, 860],
    imageSize: [990, 620],
    imagePos: [45, 100],
    // Physical image area: 99 × 62 mm (Fujifilm Instax Wide, landscape)
    canvasSize: [mmToPx(99), mmToPx(62)], // 1169 × 732 px
    cornerRadius: 4,
    paperColor: '#F8F9F7',
    shadow: '0 8px 32px rgba(0,0,0,0.28), 0 3px 10px rgba(0,0,0,0.16), 0 1px 3px rgba(0,0,0,0.10)',
  },
}

// ---------------------------------------------------------------------------
// Film profiles – match the Go implementation coefficients exactly
// ---------------------------------------------------------------------------

export const FILM_PROFILES: Record<FilmType, FilmProfile> = {
  polaroid: {
    vignetteIntensity: 0.4,
    halationAmount: 0.17,
    grainAmount: 0.021,
    chromaticShift: 1.5,
    saturationDelta: -15.0,
  },
  instax: {
    vignetteIntensity: 0.25,
    halationAmount: 0.08,
    grainAmount: 0.018,
    chromaticShift: 1.2,
    saturationDelta: -10.0,
  },
  original: {
    // "Original" mode: no film emulation; only inbound shadow is applied
    // in the shader pipeline.
    vignetteIntensity: 0.0,
    halationAmount: 0.0,
    grainAmount: 0.0,
    chromaticShift: 0.0,
    saturationDelta: 0.0,
  },
}

// ---------------------------------------------------------------------------
// CSS layout helpers
// ---------------------------------------------------------------------------

/**
 * Returns the CSS percentage values needed to position the image canvas
 * absolutely inside the frame container using `position: absolute`.
 *
 * All percentages follow the CSS spec:
 * - `left` / `right` are relative to the containing block WIDTH
 * - `top` / `bottom` are relative to the containing block HEIGHT
 */
export function getFrameInsets(spec: FrameSpec): {
  top: string
  left: string
  right: string
  bottom: string
  frameAspect: string
  imageAspect: number
} {
  const [tw, th] = spec.totalSize
  const [iw, ih] = spec.imageSize
  const [px, py] = spec.imagePos

  const right = tw - px - iw
  const bottom = th - py - ih

  return {
    top: `${((py / th) * 100).toFixed(4)}%`,
    left: `${((px / tw) * 100).toFixed(4)}%`,
    right: `${((right / tw) * 100).toFixed(4)}%`,
    bottom: `${((bottom / th) * 100).toFixed(4)}%`,
    frameAspect: `${tw} / ${th}`,
    imageAspect: iw / ih,
  }
}

/**
 * Returns the subtle inner photo corner radius in canvas pixels.
 * This mirrors the export compositor's rounded-photo clip so the WebGL
 * pipeline can apply edge-dependent effects against the same geometry.
 */
export const IMAGE_CORNER_RADIUS_FACTOR = 0.58

export function getImageCornerRadiusPx(spec: FrameSpec): number {
  const scale = spec.canvasSize[0] / spec.imageSize[0]
  return Math.max(1, spec.cornerRadius * scale * IMAGE_CORNER_RADIUS_FACTOR)
}

/** Returns the photo cutout corner radius for CSS display-space clipping. */
export function getImageDisplayCornerRadiusPx(spec: FrameSpec): number {
  return Math.max(1, spec.cornerRadius * IMAGE_CORNER_RADIUS_FACTOR)
}
