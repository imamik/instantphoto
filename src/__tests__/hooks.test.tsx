import { describe, expect, it, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useContainedWidth } from '../hooks/useContainedWidth'
import { useInstantPhotoCapture } from '../hooks/useInstantPhotoCapture'
import type { CaptureFn } from '../types'

// ---------------------------------------------------------------------------
// useContainedWidth
//
// The hook uses ResizeObserver (mocked in setup.ts) and useLayoutEffect.
// We drive the layout by manipulating getBoundingClientRect and
// getComputedStyle on the parent element.
// ---------------------------------------------------------------------------

function makeRefs(parentWidth: number, parentHeight: number | null = null) {
  const parent = document.createElement('div')
  const frame = document.createElement('div')
  parent.appendChild(frame)
  document.body.appendChild(parent)

  vi.spyOn(parent, 'getBoundingClientRect').mockReturnValue({
    width: parentWidth,
    height: parentHeight ?? 0,
    top: 0,
    left: 0,
    right: parentWidth,
    bottom: parentHeight ?? 0,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  } as DOMRect)

  vi.spyOn(window, 'getComputedStyle').mockImplementation((el: Element) => {
    if (el === parent) {
      return {
        height: parentHeight !== null ? `${parentHeight}px` : 'auto',
      } as CSSStyleDeclaration
    }
    return window.getComputedStyle(el)
  })

  const frameRef = { current: frame } as React.RefObject<HTMLDivElement>
  return { frameRef, frame, parent }
}

describe('useContainedWidth – numeric width', () => {
  it('returns the numeric width when parent is wide enough', () => {
    const { frameRef } = makeRefs(600)
    const { result } = renderHook(() => useContainedWidth(frameRef, 400, 1))
    // After layoutEffect fires, fitWidth should be 400
    expect(result.current).toBe(400)
  })

  it('clamps to parent width when requested width exceeds parent', () => {
    const { frameRef } = makeRefs(300)
    const { result } = renderHook(() => useContainedWidth(frameRef, 500, 1))
    expect(result.current).toBe(300)
  })
})

describe('useContainedWidth – percentage width', () => {
  it('resolves 50% of parent width', () => {
    const { frameRef } = makeRefs(800)
    const { result } = renderHook(() => useContainedWidth(frameRef, '50%', 1))
    expect(result.current).toBe(400)
  })

  it('resolves 100% to full parent width', () => {
    const { frameRef } = makeRefs(500)
    const { result } = renderHook(() => useContainedWidth(frameRef, '100%', 1))
    expect(result.current).toBe(500)
  })
})

describe('useContainedWidth – pixel string width', () => {
  it('resolves "320px" to 320 when parent is wider', () => {
    const { frameRef } = makeRefs(600)
    const { result } = renderHook(() => useContainedWidth(frameRef, '320px', 1))
    expect(result.current).toBe(320)
  })
})

describe('useContainedWidth – height-constrained parent', () => {
  it('constrains width by parent height when parent height is explicitly set', () => {
    // parent 800px wide, 200px tall, frameAspect 2 → max width from height = 200*2 = 400
    const { frameRef } = makeRefs(800, 200)
    const { result } = renderHook(() => useContainedWidth(frameRef, '100%', 2))
    expect(result.current).toBe(400)
  })
})

describe('useContainedWidth – fallback when no frame ref', () => {
  it('returns the requested width as-is when frameRef.current is null', () => {
    const frameRef = { current: null } as React.RefObject<HTMLDivElement>
    const { result } = renderHook(() => useContainedWidth(frameRef, 350, 1))
    // fitWidth stays null, so requestedWidth is returned
    expect(result.current).toBe(350)
  })

  it('returns the string width as-is when frameRef.current is null', () => {
    const frameRef = { current: null } as React.RefObject<HTMLDivElement>
    const { result } = renderHook(() => useContainedWidth(frameRef, '75%', 1))
    expect(result.current).toBe('75%')
  })
})

// ---------------------------------------------------------------------------
// useInstantPhotoCapture
// ---------------------------------------------------------------------------

describe('useInstantPhotoCapture', () => {
  it('ref.current is null initially', () => {
    const { result } = renderHook(() => useInstantPhotoCapture())
    expect(result.current.ref.current).toBeNull()
  })

  it('stores the fn after calling onRender', () => {
    const { result } = renderHook(() => useInstantPhotoCapture())
    const mockFn: CaptureFn = vi.fn().mockResolvedValue(null)
    act(() => {
      result.current.onRender(mockFn)
    })
    expect(result.current.ref.current).toBe(mockFn)
  })

  it('ref always reflects the latest fn after multiple onRender calls', () => {
    const { result } = renderHook(() => useInstantPhotoCapture())
    const fn1: CaptureFn = vi.fn().mockResolvedValue(null)
    const fn2: CaptureFn = vi.fn().mockResolvedValue(null)
    act(() => {
      result.current.onRender(fn1)
    })
    expect(result.current.ref.current).toBe(fn1)
    act(() => {
      result.current.onRender(fn2)
    })
    expect(result.current.ref.current).toBe(fn2)
  })

  it('onRender is stable across re-renders', () => {
    const { result, rerender } = renderHook(() => useInstantPhotoCapture())
    const firstOnRender = result.current.onRender
    rerender()
    expect(result.current.onRender).toBe(firstOnRender)
  })
})

describe('useContainedWidth – re-renders', () => {
  it('updates when requestedWidth prop changes', () => {
    const { frameRef } = makeRefs(600)
    const { result, rerender } = renderHook(({ w }) => useContainedWidth(frameRef, w, 1), {
      initialProps: { w: 200 as number | string },
    })
    expect(result.current).toBe(200)
    act(() => {
      rerender({ w: 400 })
    })
    expect(result.current).toBe(400)
  })
})
