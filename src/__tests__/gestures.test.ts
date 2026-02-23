import { describe, expect, it } from 'vitest'
import { computeCrop } from '../gl/pipeline'

// ---------------------------------------------------------------------------
// computeCrop – pure math, no WebGL required
// ---------------------------------------------------------------------------

describe('computeCrop', () => {
  it('returns full scale for square src in square target', () => {
    const { offset, scale } = computeCrop(100, 100, 1)
    expect(scale[0]).toBeCloseTo(1)
    expect(scale[1]).toBeCloseTo(1)
    expect(offset[0]).toBeCloseTo(0)
    expect(offset[1]).toBeCloseTo(0)
  })

  it('letterboxes horizontally for a wide src in a tall target', () => {
    // Source 2:1 wide, target 1:1 – should shrink width to fit
    const { offset, scale } = computeCrop(200, 100, 1)
    expect(scale[0]).toBeCloseTo(0.5)
    expect(scale[1]).toBeCloseTo(1)
    expect(offset[0]).toBeCloseTo(0.25)
    expect(offset[1]).toBeCloseTo(0)
  })

  it('letterboxes vertically for a tall src in a wide target', () => {
    // Source 1:2 tall, target 2:1 wide – should shrink height to fit
    const { offset, scale } = computeCrop(100, 200, 2)
    expect(scale[0]).toBeCloseTo(1)
    expect(scale[1]).toBeCloseTo(0.25)
    expect(offset[0]).toBeCloseTo(0)
    expect(offset[1]).toBeCloseTo(0.375)
  })

  it('guards against zero-width source without throwing', () => {
    expect(() => computeCrop(0, 100, 1)).not.toThrow()
    const { scale } = computeCrop(0, 100, 1)
    expect(Number.isFinite(scale[0])).toBe(true)
    expect(Number.isFinite(scale[1])).toBe(true)
  })

  it('guards against zero-height source without throwing', () => {
    expect(() => computeCrop(100, 0, 1)).not.toThrow()
    const { scale } = computeCrop(100, 0, 1)
    expect(Number.isFinite(scale[0])).toBe(true)
    expect(Number.isFinite(scale[1])).toBe(true)
  })

  it('guards against zero targetAspect without throwing', () => {
    expect(() => computeCrop(100, 100, 0)).not.toThrow()
    const { scale } = computeCrop(100, 100, 0)
    expect(Number.isFinite(scale[0])).toBe(true)
    expect(Number.isFinite(scale[1])).toBe(true)
  })

  it('guards against negative targetAspect without throwing', () => {
    expect(() => computeCrop(100, 100, -1)).not.toThrow()
  })

  it('offset values are always in [0, 0.5] range', () => {
    for (const [sw, sh, ta] of [
      [100, 200, 1],
      [200, 100, 1],
      [100, 100, 2],
      [800, 600, 1.5],
    ]) {
      const { offset } = computeCrop(sw, sh, ta)
      expect(offset[0]).toBeGreaterThanOrEqual(0)
      expect(offset[0]).toBeLessThanOrEqual(0.5)
      expect(offset[1]).toBeGreaterThanOrEqual(0)
      expect(offset[1]).toBeLessThanOrEqual(0.5)
    }
  })
})

// ---------------------------------------------------------------------------
// useTransformHistory
// ---------------------------------------------------------------------------

import { renderHook, act } from '@testing-library/react'
import type React from 'react'
import { useTransformHistory } from '../hooks/useTransformHistory'
import type { ImageTransform } from '../types'

const identity: ImageTransform = { panX: 0, panY: 0, scale: 1 }
const moved: ImageTransform = { panX: 0.1, panY: 0.05, scale: 2 }
const further: ImageTransform = { panX: 0.2, panY: 0.1, scale: 3 }

function setupHistory() {
  const transformRef: React.MutableRefObject<ImageTransform> = { current: { ...identity } }
  const { result } = renderHook(() => useTransformHistory(transformRef))
  return { result, transformRef }
}

describe('useTransformHistory', () => {
  it('returns null for undo when history is empty', () => {
    const { result } = setupHistory()
    expect(result.current.undo()).toBeNull()
  })

  it('returns null for redo when future is empty', () => {
    const { result } = setupHistory()
    expect(result.current.redo()).toBeNull()
  })

  it('canUndo is false initially', () => {
    const { result } = setupHistory()
    expect(result.current.canUndo()).toBe(false)
  })

  it('canRedo is false initially', () => {
    const { result } = setupHistory()
    expect(result.current.canRedo()).toBe(false)
  })

  it('push records a checkpoint and enables undo', () => {
    const { result } = setupHistory()
    act(() => result.current.push({ ...moved }))
    expect(result.current.canUndo()).toBe(true)
  })

  it('undo returns the pushed transform', () => {
    const { result, transformRef } = setupHistory()
    act(() => {
      result.current.push({ ...moved })
      transformRef.current = { ...further }
    })
    const prev = result.current.undo()
    expect(prev).toEqual(moved)
  })

  it('redo returns the transform that was active before undo', () => {
    const { result, transformRef } = setupHistory()
    act(() => {
      result.current.push({ ...moved })
      transformRef.current = { ...further }
    })
    result.current.undo()
    const next = result.current.redo()
    expect(next).toEqual(further)
  })

  it('push after undo clears the redo stack', () => {
    const { result, transformRef } = setupHistory()
    act(() => {
      result.current.push({ ...moved })
      transformRef.current = { ...further }
    })
    result.current.undo()
    expect(result.current.canRedo()).toBe(true)
    act(() => result.current.push({ panX: 0.5, panY: 0, scale: 1.5 }))
    expect(result.current.canRedo()).toBe(false)
  })

  it('clear resets both stacks', () => {
    const { result } = setupHistory()
    act(() => {
      result.current.push({ ...moved })
      result.current.push({ ...further })
    })
    act(() => result.current.clear())
    expect(result.current.canUndo()).toBe(false)
    expect(result.current.canRedo()).toBe(false)
  })

  it('respects MAX_HISTORY limit (50 entries)', () => {
    const { result } = setupHistory()
    act(() => {
      for (let i = 0; i < 60; i++) {
        result.current.push({ panX: i * 0.01, panY: 0, scale: 1 })
      }
    })
    // We should be able to undo 50 times at most; the 51st should return null
    let undos = 0
    while (result.current.canUndo()) {
      result.current.undo()
      undos++
    }
    expect(undos).toBeLessThanOrEqual(50)
  })
})
