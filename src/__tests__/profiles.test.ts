import { describe, expect, it } from 'vitest'
import { FILM_PROFILES, FRAME_SPECS, PRINT_DPI, getFrameInsets } from '../presets/profiles'
import type { FilmType, FrameType } from '../types'

const FRAME_TYPES: FrameType[] = ['polaroid_600', 'instax_mini', 'instax_square', 'instax_wide']
const FILM_TYPES: FilmType[] = ['polaroid', 'instax', 'original']

// ---------------------------------------------------------------------------
// PRINT_DPI
// ---------------------------------------------------------------------------

describe('PRINT_DPI', () => {
  it('is 300', () => {
    expect(PRINT_DPI).toBe(300)
  })
})

// ---------------------------------------------------------------------------
// FRAME_SPECS
// ---------------------------------------------------------------------------

describe('FRAME_SPECS', () => {
  it('has an entry for every FrameType', () => {
    for (const ft of FRAME_TYPES) {
      expect(FRAME_SPECS[ft], `missing spec for ${ft}`).toBeDefined()
    }
  })

  it('each spec has positive dimensions', () => {
    for (const ft of FRAME_TYPES) {
      const s = FRAME_SPECS[ft]
      expect(s.totalSize[0]).toBeGreaterThan(0)
      expect(s.totalSize[1]).toBeGreaterThan(0)
      expect(s.imageSize[0]).toBeGreaterThan(0)
      expect(s.imageSize[1]).toBeGreaterThan(0)
      expect(s.canvasSize[0]).toBeGreaterThan(0)
      expect(s.canvasSize[1]).toBeGreaterThan(0)
    }
  })

  it('imageSize fits within totalSize', () => {
    for (const ft of FRAME_TYPES) {
      const { totalSize, imageSize, imagePos } = FRAME_SPECS[ft]
      expect(imagePos[0] + imageSize[0]).toBeLessThanOrEqual(totalSize[0])
      expect(imagePos[1] + imageSize[1]).toBeLessThanOrEqual(totalSize[1])
    }
  })

  it('canvasSize matches physical dimensions at 300 DPI', () => {
    // polaroid_600: 79 × 79 mm
    expect(FRAME_SPECS.polaroid_600.canvasSize[0]).toBe(Math.round((79 / 25.4) * 300)) // 933
    expect(FRAME_SPECS.polaroid_600.canvasSize[1]).toBe(Math.round((79 / 25.4) * 300)) // 933

    // instax_mini: 46 × 62 mm
    expect(FRAME_SPECS.instax_mini.canvasSize[0]).toBe(Math.round((46 / 25.4) * 300)) // 543
    expect(FRAME_SPECS.instax_mini.canvasSize[1]).toBe(Math.round((62 / 25.4) * 300)) // 732

    // instax_square: 62 × 62 mm
    expect(FRAME_SPECS.instax_square.canvasSize[0]).toBe(Math.round((62 / 25.4) * 300)) // 732
    expect(FRAME_SPECS.instax_square.canvasSize[1]).toBe(Math.round((62 / 25.4) * 300)) // 732

    // instax_wide: 99 × 62 mm
    expect(FRAME_SPECS.instax_wide.canvasSize[0]).toBe(Math.round((99 / 25.4) * 300)) // 1169
    expect(FRAME_SPECS.instax_wide.canvasSize[1]).toBe(Math.round((62 / 25.4) * 300)) // 732
  })

  it('polaroid_600 is square', () => {
    const { canvasSize, imageSize } = FRAME_SPECS.polaroid_600
    expect(canvasSize[0]).toBe(canvasSize[1])
    expect(imageSize[0]).toBe(imageSize[1])
  })

  it('instax_square has square canvas', () => {
    const { canvasSize } = FRAME_SPECS.instax_square
    expect(canvasSize[0]).toBe(canvasSize[1])
  })

  it('instax_wide canvas is landscape', () => {
    const { canvasSize } = FRAME_SPECS.instax_wide
    expect(canvasSize[0]).toBeGreaterThan(canvasSize[1])
  })

  it('instax_mini canvas is portrait', () => {
    const { canvasSize } = FRAME_SPECS.instax_mini
    expect(canvasSize[1]).toBeGreaterThan(canvasSize[0])
  })
})

// ---------------------------------------------------------------------------
// FILM_PROFILES
// ---------------------------------------------------------------------------

describe('FILM_PROFILES', () => {
  it('has an entry for every FilmType', () => {
    for (const ft of FILM_TYPES) {
      expect(FILM_PROFILES[ft], `missing profile for ${ft}`).toBeDefined()
    }
  })

  it('all values are in valid ranges', () => {
    for (const ft of FILM_TYPES) {
      const p = FILM_PROFILES[ft]
      expect(p.vignetteIntensity).toBeGreaterThanOrEqual(0)
      expect(p.vignetteIntensity).toBeLessThanOrEqual(1)
      expect(p.halationAmount).toBeGreaterThanOrEqual(0)
      expect(p.halationAmount).toBeLessThanOrEqual(1)
      expect(p.grainAmount).toBeGreaterThanOrEqual(0)
      expect(p.grainAmount).toBeLessThanOrEqual(0.1)
      expect(p.saturationDelta).toBeLessThanOrEqual(0) // original may be neutral
    }
  })

  it('polaroid has stronger effects than instax', () => {
    const { polaroid, instax } = FILM_PROFILES
    expect(polaroid.vignetteIntensity).toBeGreaterThan(instax.vignetteIntensity)
    expect(polaroid.halationAmount).toBeGreaterThan(instax.halationAmount)
    expect(polaroid.grainAmount).toBeGreaterThan(instax.grainAmount)
  })

  it('original profile disables film effects', () => {
    const { original } = FILM_PROFILES
    expect(original.vignetteIntensity).toBe(0)
    expect(original.halationAmount).toBe(0)
    expect(original.grainAmount).toBe(0)
    expect(original.chromaticShift).toBe(0)
    expect(original.saturationDelta).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// getFrameInsets
// ---------------------------------------------------------------------------

describe('getFrameInsets', () => {
  it('returns percentage strings for all inset sides', () => {
    for (const ft of FRAME_TYPES) {
      const insets = getFrameInsets(FRAME_SPECS[ft])
      for (const side of ['top', 'left', 'right', 'bottom'] as const) {
        expect(insets[side]).toMatch(/^\d+(\.\d+)?%$/)
      }
    }
  })

  it('inset percentages are positive and < 50%', () => {
    for (const ft of FRAME_TYPES) {
      const insets = getFrameInsets(FRAME_SPECS[ft])
      for (const side of ['top', 'left', 'right', 'bottom'] as const) {
        const val = parseFloat(insets[side])
        expect(val).toBeGreaterThan(0)
        expect(val).toBeLessThan(50)
      }
    }
  })

  it('frameAspect string has correct format', () => {
    const insets = getFrameInsets(FRAME_SPECS.polaroid_600)
    expect(insets.frameAspect).toMatch(/^\d+ \/ \d+$/)
  })

  it('imageAspect matches imageSize ratio', () => {
    for (const ft of FRAME_TYPES) {
      const spec = FRAME_SPECS[ft]
      const insets = getFrameInsets(spec)
      expect(insets.imageAspect).toBeCloseTo(spec.imageSize[0] / spec.imageSize[1], 6)
    }
  })

  it('polaroid_600 insets sum correctly with imageSize', () => {
    const spec = FRAME_SPECS.polaroid_600
    const { totalSize, imageSize, imagePos } = spec
    const right = totalSize[0] - imagePos[0] - imageSize[0]
    const bottom = totalSize[1] - imagePos[1] - imageSize[1]
    const insets = getFrameInsets(spec)

    expect(parseFloat(insets.left)).toBeCloseTo((imagePos[0] / totalSize[0]) * 100, 3)
    expect(parseFloat(insets.top)).toBeCloseTo((imagePos[1] / totalSize[1]) * 100, 3)
    expect(parseFloat(insets.right)).toBeCloseTo((right / totalSize[0]) * 100, 3)
    expect(parseFloat(insets.bottom)).toBeCloseTo((bottom / totalSize[1]) * 100, 3)
  })
})
