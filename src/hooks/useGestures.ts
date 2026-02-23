// ---------------------------------------------------------------------------
// Pointer / wheel / pinch gesture hook for PolaroidImageEditor.
//
// All gesture math operates in UV space so the image follows the
// finger/cursor exactly. React is never involved in the gesture hot path —
// event handlers update transformRef directly and invoke callbacks.
//
// Drag:   1:1 grab-and-drag; dx/dy → UV delta via baseCrop + currentScale
// Wheel:  scale *= (1 - deltaY * 0.001), clamped to [1, maxZoom]
// Pinch:  scale = initialScale * (currentDist / initialDist)
//
// Keyboard (overlay must be focused — click it first, or set autoFocus):
//   Arrow keys : pan  (step = PAN_STEP UV units)
//   + / =      : zoom in
//   -           : zoom out
//   r / R / 0  : reset pan and zoom
//   Ctrl+Z     : undo (delegated via onUndo callback)
//   Ctrl+Y / Ctrl+Shift+Z : redo (delegated via onRedo callback)
// ---------------------------------------------------------------------------

import { useEffect, useRef } from 'react'

import type { ImageTransform } from '../types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UseGesturesOptions {
  /** Mutable ref owned by the component; useGestures updates it directly. */
  transformRef: React.MutableRefObject<ImageTransform>
  /**
   * Base UV scale values from computeCrop (updated after image load).
   * Used to convert display-pixel deltas into UV-space pan increments.
   * Falls back to { baseSX: 1, baseSY: 1 } when null.
   */
  cropRef: React.RefObject<{ baseSX: number; baseSY: number } | null>
  /** Maximum allowed zoom factor (clamped). */
  maxZoom: number
  /** Called at the start of a new gesture (cancels debounce timer). */
  onGestureStart: () => void
  /** Called on every gesture event with the updated transform. */
  onTransform: (t: ImageTransform) => void
  /** Called when all pointers are released (starts debounce timer). */
  onGestureEnd: () => void
  /** Called when the user triggers keyboard undo (Ctrl+Z). */
  onUndo?: () => void
  /** Called when the user triggers keyboard redo (Ctrl+Y / Ctrl+Shift+Z). */
  onRedo?: () => void
}

interface UseGesturesResult {
  /** Attach to the invisible overlay div that sits over the canvas. */
  overlayRef: React.RefObject<HTMLDivElement>
}

// UV-space pan step per arrow key press
const PAN_STEP = 0.04
// Zoom multiplier per +/- key press
const ZOOM_STEP = 1.1

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useGestures({
  transformRef,
  cropRef,
  maxZoom,
  onGestureStart,
  onTransform,
  onGestureEnd,
  onUndo,
  onRedo,
}: UseGesturesOptions): UseGesturesResult {
  const overlayRef = useRef<HTMLDivElement>(null)

  // Keep callback refs stable so the effect closure sees the latest functions
  const onGestureStartRef = useRef(onGestureStart)
  const onTransformRef = useRef(onTransform)
  const onGestureEndRef = useRef(onGestureEnd)
  const maxZoomRef = useRef(maxZoom)
  const onUndoRef = useRef(onUndo)
  const onRedoRef = useRef(onRedo)

  useEffect(() => {
    onGestureStartRef.current = onGestureStart
    onTransformRef.current = onTransform
    onGestureEndRef.current = onGestureEnd
    onUndoRef.current = onUndo
    onRedoRef.current = onRedo
  })

  useEffect(() => {
    maxZoomRef.current = maxZoom
  })

  useEffect(() => {
    const rawOverlay = overlayRef.current
    if (!rawOverlay) return
    // Explicit typed alias so nested function declarations see HTMLDivElement,
    // not HTMLDivElement | null (TypeScript may lose narrowing across function boundaries)
    const overlay: HTMLDivElement = rawOverlay

    // Active pointer positions: Map<pointerId, { x, y }>
    const pointers = new Map<number, { x: number; y: number }>()

    // State for tracking whether a pointer drag is in progress
    let dragActive = false

    // Pinch tracking: recorded at the moment the second pointer lands
    let pinchInitialScale = 1
    let pinchInitialDist = 0

    function getPinchDist(): number {
      const pts = Array.from(pointers.values())
      if (pts.length < 2) return 0
      const dx = pts[1].x - pts[0].x
      const dy = pts[1].y - pts[0].y
      return Math.sqrt(dx * dx + dy * dy)
    }

    function getBaseCrop(): { baseSX: number; baseSY: number } {
      return cropRef.current ?? { baseSX: 1, baseSY: 1 }
    }

    function clampTransform(
      t: ImageTransform,
      baseSX: number,
      baseSY: number
    ): ImageTransform {
      const scale = clamp(t.scale, 1, maxZoomRef.current)
      const uvSX = baseSX / scale
      const uvSY = baseSY / scale
      // Clamp pan against the full [0, 1] source UV domain so
      // aspect-ratio crop headroom is pannable even at scale=1.
      const maxPanX = Math.max(0, (1 - uvSX) / 2)
      const maxPanY = Math.max(0, (1 - uvSY) / 2)
      return {
        panX: clamp(t.panX, -maxPanX, maxPanX),
        panY: clamp(t.panY, -maxPanY, maxPanY),
        scale,
      }
    }

    // -----------------------------------------------------------------
    // Pointer down – begin gesture
    // -----------------------------------------------------------------
    function onPointerDown(e: PointerEvent): void {
      overlay.setPointerCapture(e.pointerId)
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })

      if (!dragActive) {
        dragActive = true
        onGestureStartRef.current()
      }

      // Second pointer landing: snapshot state for pinch
      if (pointers.size === 2) {
        pinchInitialScale = transformRef.current.scale
        pinchInitialDist = getPinchDist()
      }
    }

    // -----------------------------------------------------------------
    // Pointer move – pan (1 pointer) or pinch (2+ pointers)
    // -----------------------------------------------------------------
    function onPointerMove(e: PointerEvent): void {
      if (!pointers.has(e.pointerId)) return

      const prev = pointers.get(e.pointerId)!
      const dx = e.clientX - prev.x
      const dy = e.clientY - prev.y
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })

      const rect = overlay.getBoundingClientRect()
      const displayW = rect.width || 1
      const displayH = rect.height || 1
      const { baseSX, baseSY } = getBaseCrop()
      const t = transformRef.current

      if (pointers.size === 1) {
        // Single pointer: 1:1 grab-and-drag
        // 1 display pixel = (baseSX / scale) / displayW UV units
        const uvDX = (dx / displayW) * (baseSX / t.scale)
        const uvDY = (dy / displayH) * (baseSY / t.scale)
        // Screen Y increases downward; WebGL UV Y increases upward (image is
        // Y-correct after the ImageBitmap flipY fix).  Negate uvDY so dragging
        // down shows more of the image top, matching standard grab-and-drag.
        transformRef.current = clampTransform(
          {
            panX: t.panX + uvDX,
            panY: t.panY - uvDY,
            scale: t.scale,
          },
          baseSX,
          baseSY
        )
      } else if (pointers.size >= 2) {
        // Two+ pointers: pinch-to-zoom
        const currentDist = getPinchDist()
        if (pinchInitialDist > 0) {
          const newScale = pinchInitialScale * (currentDist / pinchInitialDist)
          transformRef.current = clampTransform(
            {
              ...transformRef.current,
              scale: newScale,
            },
            baseSX,
            baseSY
          )
        }
      }

      onTransformRef.current({ ...transformRef.current })
    }

    // -----------------------------------------------------------------
    // Pointer up / cancel – end gesture when all pointers released
    // -----------------------------------------------------------------
    function onPointerUp(e: PointerEvent): void {
      pointers.delete(e.pointerId)

      if (pointers.size === 0) {
        dragActive = false
        onGestureEndRef.current()
      } else if (pointers.size === 1) {
        // Dropped back to one finger: re-anchor pinch tracking
        pinchInitialScale = transformRef.current.scale
        pinchInitialDist = 0
      }
    }

    // -----------------------------------------------------------------
    // Wheel – zoom in/out; each event is self-contained (start + end)
    // -----------------------------------------------------------------
    function onWheel(e: WheelEvent): void {
      e.preventDefault()

      onGestureStartRef.current() // cancel any pending debounce timer

      const t = transformRef.current
      const newScale = t.scale * (1 - e.deltaY * 0.001)
      const { baseSX, baseSY } = getBaseCrop()
      transformRef.current = clampTransform(
        {
          ...t,
          scale: newScale,
        },
        baseSX,
        baseSY
      )

      onTransformRef.current({ ...transformRef.current })
      onGestureEndRef.current() // restart debounce timer
    }

    // -----------------------------------------------------------------
    // Keyboard – pan, zoom, reset, undo, redo
    // Requires the overlay to be focused (tabIndex="0" is set in JSX).
    // -----------------------------------------------------------------
    function onKeyDown(e: KeyboardEvent): void {
      const { baseSX, baseSY } = getBaseCrop()
      const t = transformRef.current
      const isMac = typeof navigator !== 'undefined' && navigator.platform.startsWith('Mac')
      const ctrl = isMac ? e.metaKey : e.ctrlKey

      // Undo / redo – delegate to component-level handlers
      if (ctrl && !e.shiftKey && e.key === 'z') {
        e.preventDefault()
        onUndoRef.current?.()
        return
      }
      if (ctrl && ((e.shiftKey && e.key === 'z') || e.key === 'y')) {
        e.preventDefault()
        onRedoRef.current?.()
        return
      }

      let newTransform: ImageTransform | null = null

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault()
          newTransform = { ...t, panX: t.panX - PAN_STEP }
          break
        case 'ArrowRight':
          e.preventDefault()
          newTransform = { ...t, panX: t.panX + PAN_STEP }
          break
        case 'ArrowUp':
          e.preventDefault()
          newTransform = { ...t, panY: t.panY + PAN_STEP }
          break
        case 'ArrowDown':
          e.preventDefault()
          newTransform = { ...t, panY: t.panY - PAN_STEP }
          break
        case '+':
        case '=':
          e.preventDefault()
          newTransform = { ...t, scale: t.scale * ZOOM_STEP }
          break
        case '-':
          e.preventDefault()
          newTransform = { ...t, scale: t.scale / ZOOM_STEP }
          break
        case '0':
        case 'r':
        case 'R':
          e.preventDefault()
          newTransform = { panX: 0, panY: 0, scale: 1 }
          break
      }

      if (newTransform) {
        onGestureStartRef.current()
        transformRef.current = clampTransform(newTransform, baseSX, baseSY)
        onTransformRef.current({ ...transformRef.current })
        onGestureEndRef.current()
      }
    }

    overlay.addEventListener('pointerdown', onPointerDown)
    overlay.addEventListener('pointermove', onPointerMove)
    overlay.addEventListener('pointerup', onPointerUp)
    overlay.addEventListener('pointercancel', onPointerUp)
    overlay.addEventListener('wheel', onWheel, { passive: false })
    overlay.addEventListener('keydown', onKeyDown)

    return () => {
      overlay.removeEventListener('pointerdown', onPointerDown)
      overlay.removeEventListener('pointermove', onPointerMove)
      overlay.removeEventListener('pointerup', onPointerUp)
      overlay.removeEventListener('pointercancel', onPointerUp)
      overlay.removeEventListener('wheel', onWheel)
      overlay.removeEventListener('keydown', onKeyDown)
    }
    // transformRef and cropRef are stable ref objects — this effect only
    // needs to run once to attach listeners
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { overlayRef }
}
