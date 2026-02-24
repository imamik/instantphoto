import { describe, expect, it } from 'vitest'
import { clampGLOptions } from '../gl/pipeline'
import type { InstantPhotoGLOptions } from '../types'

const BASE: InstantPhotoGLOptions = {
  filmType: 'polaroid',
  canvasSize: [933, 933],
  imageAspect: 1,
  seed: 42,
}

describe('clampGLOptions – in-range values pass through unchanged', () => {
  it('returns in-range numeric values unchanged', () => {
    const opts: InstantPhotoGLOptions = {
      ...BASE,
      vignetteIntensity: 0.5,
      halationAmount: 0.5,
      grainAmount: 0.5,
      grainColorAmount: 0.5,
      grainSizePx: 2,
      chromaticShift: 5,
      saturationDelta: 0,
      filmCurveAmount: 0.5,
      shadowWideIntensity: 0.5,
      shadowFineIntensity: 0.5,
      seed: 100,
    }
    const result = clampGLOptions(opts)
    expect(result.vignetteIntensity).toBe(0.5)
    expect(result.halationAmount).toBe(0.5)
    expect(result.grainAmount).toBe(0.5)
    expect(result.grainColorAmount).toBe(0.5)
    expect(result.grainSizePx).toBe(2)
    expect(result.chromaticShift).toBe(5)
    expect(result.saturationDelta).toBe(0)
    expect(result.filmCurveAmount).toBe(0.5)
    expect(result.shadowWideIntensity).toBe(0.5)
    expect(result.shadowFineIntensity).toBe(0.5)
    expect(result.seed).toBe(100)
  })

  it('preserves boundary values exactly', () => {
    const opts: InstantPhotoGLOptions = {
      ...BASE,
      vignetteIntensity: 0,
      halationAmount: 1,
      grainAmount: 0,
      grainColorAmount: 1,
      grainSizePx: 0.5,
      chromaticShift: 0,
      saturationDelta: -100,
      filmCurveAmount: 1,
      shadowWideIntensity: 0,
      shadowFineIntensity: 1,
      seed: 0,
    }
    const result = clampGLOptions(opts)
    expect(result.vignetteIntensity).toBe(0)
    expect(result.halationAmount).toBe(1)
    expect(result.grainAmount).toBe(0)
    expect(result.grainColorAmount).toBe(1)
    expect(result.grainSizePx).toBe(0.5)
    expect(result.chromaticShift).toBe(0)
    expect(result.saturationDelta).toBe(-100)
    expect(result.filmCurveAmount).toBe(1)
    expect(result.shadowWideIntensity).toBe(0)
    expect(result.shadowFineIntensity).toBe(1)
    expect(result.seed).toBe(0)
  })
})

describe('clampGLOptions – out-of-range values are clamped', () => {
  it('clamps vignetteIntensity > 1 to 1', () => {
    expect(clampGLOptions({ ...BASE, vignetteIntensity: 2 }).vignetteIntensity).toBe(1)
  })

  it('clamps vignetteIntensity < 0 to 0', () => {
    expect(clampGLOptions({ ...BASE, vignetteIntensity: -0.5 }).vignetteIntensity).toBe(0)
  })

  it('clamps halationAmount < 0 to 0', () => {
    expect(clampGLOptions({ ...BASE, halationAmount: -1 }).halationAmount).toBe(0)
  })

  it('clamps grainAmount > 1 to 1', () => {
    expect(clampGLOptions({ ...BASE, grainAmount: 5 }).grainAmount).toBe(1)
  })

  it('clamps grainSizePx below 0.5 to 0.5', () => {
    expect(clampGLOptions({ ...BASE, grainSizePx: 0 }).grainSizePx).toBe(0.5)
  })

  it('clamps grainSizePx above 10 to 10', () => {
    expect(clampGLOptions({ ...BASE, grainSizePx: 100 }).grainSizePx).toBe(10)
  })

  it('clamps chromaticShift above 20 to 20', () => {
    expect(clampGLOptions({ ...BASE, chromaticShift: 999 }).chromaticShift).toBe(20)
  })

  it('clamps saturationDelta below -100 to -100', () => {
    expect(clampGLOptions({ ...BASE, saturationDelta: -200 }).saturationDelta).toBe(-100)
  })

  it('clamps saturationDelta above 100 to 100', () => {
    expect(clampGLOptions({ ...BASE, saturationDelta: 200 }).saturationDelta).toBe(100)
  })

  it('clamps seed below 0 to 0', () => {
    expect(clampGLOptions({ ...BASE, seed: -5 }).seed).toBe(0)
  })

  it('clamps filmCurveAmount > 1 to 1', () => {
    expect(clampGLOptions({ ...BASE, filmCurveAmount: 3 }).filmCurveAmount).toBe(1)
  })

  it('clamps shadowWideIntensity > 1 to 1', () => {
    expect(clampGLOptions({ ...BASE, shadowWideIntensity: 2 }).shadowWideIntensity).toBe(1)
  })

  it('clamps shadowFineIntensity < 0 to 0', () => {
    expect(clampGLOptions({ ...BASE, shadowFineIntensity: -0.5 }).shadowFineIntensity).toBe(0)
  })
})

describe('clampGLOptions – undefined optional fields pass through as-is', () => {
  it('leaves undefined optional fields as undefined', () => {
    const result = clampGLOptions(BASE)
    expect(result.vignetteIntensity).toBeUndefined()
    expect(result.halationAmount).toBeUndefined()
    expect(result.grainAmount).toBeUndefined()
    expect(result.grainColorAmount).toBeUndefined()
    expect(result.grainSizePx).toBeUndefined()
    expect(result.chromaticShift).toBeUndefined()
    expect(result.saturationDelta).toBeUndefined()
    expect(result.filmCurveAmount).toBeUndefined()
    expect(result.shadowWideIntensity).toBeUndefined()
    expect(result.shadowFineIntensity).toBeUndefined()
  })
})
