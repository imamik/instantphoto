import '../InstantPhotoFrame/InstantPhotoFrame.css'
import './InstantPhotoImageEditor.css'

import { useCallback, useEffect, useRef } from 'react'

import {
  FILM_PROFILES,
  FRAME_SPECS,
  getFrameInsets,
  getImageDisplayCornerRadiusPx,
  getImageCornerRadiusPx,
} from '../../presets/profiles'
import { useContainedWidth } from '../../hooks/useContainedWidth'
import { useInteractiveGL } from '../../hooks/useInteractiveGL'
import { useGestures } from '../../hooks/useGestures'
import { useTransformHistory } from '../../hooks/useTransformHistory'
import { buildFrameCapture, buildImageCapture } from '../../gl/captureUtils'
import type {
  CaptureOptions,
  CaptureFn,
  ImageTransform,
  InstantPhotoImageEditorProps,
  InstantPhotoSettings,
} from '../../types'

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function InstantPhotoImageEditor({
  src,
  emptyState,
  imageOverlay,
  frameType = 'polaroid_600',
  filmType = 'polaroid',
  grainAmount,
  grainSizePx,
  grainColorAmount,
  halationAmount,
  vignetteIntensity,
  chromaticShift,
  saturationDelta,
  filmCurveAmount,
  shadowWideIntensity,
  shadowWideStart,
  shadowWideEnd,
  shadowFineIntensity,
  shadowFineStart,
  shadowFineEnd,
  seed = 0,
  maxZoom = 5,
  onRenderDelay = 600,
  liveUpdateDuringGesture = true,
  width = '100%',
  className,
  style,
  onTransformChange,
  onRender,
  onError,
  onSettingsChange,
  onUndo,
  onRedo,
}: InstantPhotoImageEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const transformRef = useRef<ImageTransform>({ panX: 0, panY: 0, scale: 1 })

  const spec = FRAME_SPECS[frameType]
  const profile = FILM_PROFILES[filmType]
  const insets = getFrameInsets(spec)
  const frameAspect = spec.totalSize[0] / spec.totalSize[1]
  const fittedWidth = useContainedWidth(frameRef, width, frameAspect)

  // Resolve effect values: explicit prop overrides film-profile default
  const resolvedGrain = grainAmount ?? profile.grainAmount
  const resolvedGrainSizePx = grainSizePx ?? 2.08
  const resolvedGrainColorAmount = grainColorAmount ?? 1.0
  const resolvedHalation = halationAmount ?? profile.halationAmount
  const resolvedVignette = vignetteIntensity ?? profile.vignetteIntensity
  const resolvedChromaticShift = chromaticShift ?? profile.chromaticShift
  const resolvedSaturationDelta = saturationDelta ?? profile.saturationDelta
  const resolvedFilmCurveAmount = filmCurveAmount ?? (filmType === 'original' ? 0 : 1)
  const resolvedShadowWideIntensity = shadowWideIntensity ?? 0.31
  const resolvedShadowWideStart = shadowWideStart ?? 0.02
  const resolvedShadowWideEnd = shadowWideEnd ?? 0.11
  const resolvedShadowFineIntensity = shadowFineIntensity ?? 0.3
  const resolvedShadowFineStart = shadowFineStart ?? 0.003
  const resolvedShadowFineEnd = shadowFineEnd ?? 0.006

  // Stable ref to onSettingsChange so the settings effect closure never goes stale
  const onSettingsChangeRef = useRef(onSettingsChange)
  const onUndoRef = useRef(onUndo)
  const onRedoRef = useRef(onRedo)
  useEffect(() => {
    onSettingsChangeRef.current = onSettingsChange
    onUndoRef.current = onUndo
    onRedoRef.current = onRedo
  })

  // -------------------------------------------------------------------------
  // Reset transform when src or frameType changes.
  // This effect intentionally runs BEFORE useInteractiveGL's effects (React
  // runs effects in declaration order) so the new image/frame renders with a
  // clean pan/zoom state.
  // -------------------------------------------------------------------------
  useEffect(() => {
    transformRef.current = { panX: 0, panY: 0, scale: 1 }
  }, [src, frameType])

  // -------------------------------------------------------------------------
  // Stable capture function — only re-created when frameType changes.
  // -------------------------------------------------------------------------
  const captureFn = useCallback<CaptureFn>(
    async ({ target = 'image', format = 'image/png', quality }: CaptureOptions = {}) => {
      const canvas = canvasRef.current
      if (!canvas) return null

      if (target === 'image') {
        return buildImageCapture(canvas, FRAME_SPECS[frameType], format, quality)
      }

      // 'frame': composite canvas + white paper border
      return buildFrameCapture(canvas, FRAME_SPECS[frameType], format, quality)
    },
    [frameType]
  )

  // -------------------------------------------------------------------------
  // GL hook: manages the WebGL pipeline, image loading, and imperative renders
  // -------------------------------------------------------------------------
  const { renderFrame, renderRawFrame, scheduleOnRender, cancelOnRender, cropRef } =
    useInteractiveGL(
      canvasRef,
      src,
      {
        canvasSize: spec.canvasSize,
        filmType,
        imageAspect: insets.imageAspect,
        imageCornerRadiusPx: getImageCornerRadiusPx(spec),
        vignetteIntensity: resolvedVignette,
        halationAmount: resolvedHalation,
        grainAmount: resolvedGrain,
        grainSizePx,
        grainColorAmount,
        chromaticShift: resolvedChromaticShift,
        saturationDelta: resolvedSaturationDelta,
        filmCurveAmount: resolvedFilmCurveAmount,
        shadowWideIntensity: resolvedShadowWideIntensity,
        shadowWideStart: resolvedShadowWideStart,
        shadowWideEnd: resolvedShadowWideEnd,
        shadowFineIntensity: resolvedShadowFineIntensity,
        shadowFineStart: resolvedShadowFineStart,
        shadowFineEnd: resolvedShadowFineEnd,
        seed,
      },
      transformRef,
      { onRender, onError, captureFn, onRenderDelay }
    )

  // -------------------------------------------------------------------------
  // Undo/redo history
  // -------------------------------------------------------------------------
  const transformHistory = useTransformHistory(transformRef)

  // Clear history whenever the source image or frame type changes
  useEffect(() => {
    transformHistory.clear()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, frameType])

  // -------------------------------------------------------------------------
  // Gesture hook: pointer / wheel / pinch / keyboard → transform → GL render
  // -------------------------------------------------------------------------
  const { overlayRef } = useGestures({
    transformRef,
    cropRef,
    maxZoom,
    onGestureStart: cancelOnRender,
    onTransform: t => {
      if (liveUpdateDuringGesture) {
        renderFrame()
      } else {
        // Deferred mode: preview only the raw source crop for speed and to
        // keep the full uncropped source domain available while panning.
        renderRawFrame()
      }
      onTransformChange?.(t)
    },
    onGestureEnd: () => {
      if (!liveUpdateDuringGesture) {
        renderFrame()
      }
      // Record transform checkpoint for undo history when gesture ends
      transformHistory.push(transformRef.current)
      scheduleOnRender()
    },
    onUndo: () => {
      const prev = transformHistory.undo()
      if (prev) {
        transformRef.current = prev
        renderFrame()
        onTransformChange?.(prev)
        onUndoRef.current?.(prev)
        scheduleOnRender()
      }
    },
    onRedo: () => {
      const next = transformHistory.redo()
      if (next) {
        transformRef.current = next
        renderFrame()
        onTransformChange?.(next)
        onRedoRef.current?.(next)
        scheduleOnRender()
      }
    },
  })

  // -------------------------------------------------------------------------
  // Emit onSettingsChange whenever transform or effect params change
  // -------------------------------------------------------------------------
  useEffect(() => {
    const settings: InstantPhotoSettings = {
      frameType,
      filmType,
      transform: { ...transformRef.current },
      grainAmount: resolvedGrain,
      grainSizePx: resolvedGrainSizePx,
      grainColorAmount: resolvedGrainColorAmount,
      halationAmount: resolvedHalation,
      vignetteIntensity: resolvedVignette,
      chromaticShift: resolvedChromaticShift,
      saturationDelta: resolvedSaturationDelta,
      filmCurveAmount: resolvedFilmCurveAmount,
      shadowWideIntensity: resolvedShadowWideIntensity,
      shadowWideStart: resolvedShadowWideStart,
      shadowWideEnd: resolvedShadowWideEnd,
      shadowFineIntensity: resolvedShadowFineIntensity,
      shadowFineStart: resolvedShadowFineStart,
      shadowFineEnd: resolvedShadowFineEnd,
      seed,
    }
    onSettingsChangeRef.current?.(settings)
  }, [
    frameType,
    filmType,
    resolvedGrain,
    resolvedGrainSizePx,
    resolvedGrainColorAmount,
    resolvedHalation,
    resolvedVignette,
    resolvedChromaticShift,
    resolvedSaturationDelta,
    resolvedFilmCurveAmount,
    resolvedShadowWideIntensity,
    resolvedShadowWideStart,
    resolvedShadowWideEnd,
    resolvedShadowFineIntensity,
    resolvedShadowFineStart,
    resolvedShadowFineEnd,
    seed,
  ])

  // CSS custom properties that drive frame layout and paper styling
  const frameVars: React.CSSProperties = {
    '--ipf-frame-aspect': insets.frameAspect,
    '--ipf-paper-color': spec.paperColor,
    '--ipf-corner-radius': `${spec.cornerRadius}px`,
    '--ipf-shadow': spec.shadow,
    '--ipf-inset-top': insets.top,
    '--ipf-inset-left': insets.left,
    '--ipf-inset-right': insets.right,
    '--ipf-inset-bottom': insets.bottom,
    '--ipf-image-corner-radius': `${getImageDisplayCornerRadiusPx(spec)}px`,
    width: typeof fittedWidth === 'number' ? `${fittedWidth}px` : fittedWidth,
  } as React.CSSProperties

  return (
    <div
      ref={frameRef}
      className={`ipf-frame ipf-frame--editor${className ? ` ${className}` : ''}`}
      style={{ ...frameVars, ...style }}
      data-frame-type={frameType}
      data-film-type={filmType}
    >
      <div className="ipf-image-wrap">
        <canvas ref={canvasRef} className="ipf-canvas" />
        {/* tabIndex="0" makes the overlay keyboard-focusable for arrow/zoom/undo shortcuts */}
        <div
          ref={overlayRef}
          className="ipf-gesture-overlay"
          tabIndex={0}
          aria-label="Image editor — drag to pan, scroll or pinch to zoom, arrow keys to nudge, +/- to zoom, R to reset, Ctrl+Z to undo"
        />
        {!src && emptyState && <div className="ipf-empty-state">{emptyState}</div>}
        {src && imageOverlay && <div className="ipf-image-overlay">{imageOverlay}</div>}
      </div>
    </div>
  )
}
