import { describe, expect, it } from 'vitest'
import { computeCrop } from '../gl/pipeline'

// ---------------------------------------------------------------------------
// computeCrop – centre-fill UV crop
// ---------------------------------------------------------------------------

describe('computeCrop', () => {
  // Helper: assert crop covers the full canvas (scale = 1) on one axis
  // and centres the window on the other.

  it('square source in square target – no crop', () => {
    const { offset, scale } = computeCrop(100, 100, 1)
    expect(scale[0]).toBeCloseTo(1)
    expect(scale[1]).toBeCloseTo(1)
    expect(offset[0]).toBeCloseTo(0)
    expect(offset[1]).toBeCloseTo(0)
  })

  it('landscape source (2:1) in square target – crops width', () => {
    // Frame is 1:1, image is 2:1 → image is wider, letterbox horizontally
    const { offset, scale } = computeCrop(200, 100, 1)
    // Y fills the frame (scale[1] = 1)
    expect(scale[1]).toBeCloseTo(1)
    // X is cropped to 50% of the source width (targetAspect/srcAspect = 1/2)
    expect(scale[0]).toBeCloseTo(0.5)
    // Centred: offset = (1 - 0.5) / 2 = 0.25
    expect(offset[0]).toBeCloseTo(0.25)
    expect(offset[1]).toBeCloseTo(0)
  })

  it('portrait source (1:2) in square target – crops height', () => {
    const { offset, scale } = computeCrop(100, 200, 1)
    expect(scale[0]).toBeCloseTo(1)
    expect(scale[1]).toBeCloseTo(0.5)
    expect(offset[0]).toBeCloseTo(0)
    expect(offset[1]).toBeCloseTo(0.25)
  })

  it('landscape source in wide target – matches when src/target same aspect', () => {
    // Source 4:3, target 4:3 – no crop
    const { offset: _offset, scale } = computeCrop(400, 300, 4 / 3)
    expect(scale[0]).toBeCloseTo(1)
    expect(scale[1]).toBeCloseTo(1)
  })

  it('wider source than target – horizontal offset is centred', () => {
    // Source 16:9, target 4:3
    const { offset, scale } = computeCrop(1920, 1080, 4 / 3)
    const expectedScale = 4 / 3 / (16 / 9) // = 0.75
    expect(scale[0]).toBeCloseTo(expectedScale)
    expect(scale[1]).toBeCloseTo(1)
    expect(offset[0]).toBeCloseTo((1 - expectedScale) / 2)
  })

  it('taller source than target – vertical offset is centred', () => {
    // Source 4:3, target 16:9
    const { offset, scale } = computeCrop(400, 300, 16 / 9)
    const expectedScale = 4 / 3 / (16 / 9) // = 0.75
    expect(scale[1]).toBeCloseTo(expectedScale)
    expect(scale[0]).toBeCloseTo(1)
    expect(offset[1]).toBeCloseTo((1 - expectedScale) / 2)
  })

  it('crop + zoom UV math – scale halves at 2× zoom', () => {
    // Simulate what render() does with imageTransform = { scale: 2, panX: 0, panY: 0 }
    const { scale: baseScale } = computeCrop(200, 100, 1) // landscape → scale = [0.5, 1]
    const zoom = 2
    const uvSX = baseScale[0] / zoom // 0.25
    const uvSY = baseScale[1] / zoom // 0.5
    expect(uvSX).toBeCloseTo(0.25)
    expect(uvSY).toBeCloseTo(0.5)
  })

  it('pan clamping – panX is clamped to prevent blank edges', () => {
    // Square image, square frame, zoom = 2
    const { scale: baseScale } = computeCrop(100, 100, 1)
    const zoom = 2
    const uvSX = baseScale[0] / zoom
    const maxPanX = (1 - uvSX) / 2 // = (1 - 0.5)/2 = 0.25

    // Clamp a pan that exceeds the limit
    const requestedPan = 1.0
    const clamped = Math.max(-maxPanX, Math.min(maxPanX, requestedPan))
    expect(clamped).toBeCloseTo(maxPanX)
  })

  it('pan clamping – scale 1 still allows panning across aspect crop room', () => {
    // Landscape source in square target: base crop already hides left/right content.
    const { scale: baseScale } = computeCrop(200, 100, 1) // [0.5, 1]
    const zoom = 1
    const uvSX = baseScale[0] / zoom
    const uvSY = baseScale[1] / zoom
    const maxPanX = (1 - uvSX) / 2
    const maxPanY = (1 - uvSY) / 2

    expect(maxPanX).toBeCloseTo(0.25)
    expect(maxPanY).toBeCloseTo(0)
  })

  it('pan offset centres the zoomed window when pan = 0', () => {
    const { scale: baseScale, offset: baseOffset } = computeCrop(100, 100, 1)
    const zoom = 3
    const uvSX = baseScale[0] / zoom
    const uvSY = baseScale[1] / zoom
    const panX = 0
    const panY = 0
    const maxPanX = (1 - uvSX) / 2
    const maxPanY = (1 - uvSY) / 2
    const clampedPanX = Math.max(-maxPanX, Math.min(maxPanX, panX))
    const clampedPanY = Math.max(-maxPanY, Math.min(maxPanY, panY))
    const uvOffX = (1 - uvSX) / 2 - clampedPanX
    const uvOffY = (1 - uvSY) / 2 - clampedPanY

    // With no pan, offset should be same as base crop offset
    expect(uvOffX).toBeCloseTo(baseOffset[0] + (baseScale[0] - uvSX) / 2)
    expect(uvOffY).toBeCloseTo(baseOffset[1] + (baseScale[1] - uvSY) / 2)
  })
})
