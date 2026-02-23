import './PolaroidFrame.css'

import { useCallback, useRef } from 'react'

import {
  FILM_PROFILES,
  FRAME_SPECS,
  getFrameInsets,
  getImageDisplayCornerRadiusPx,
  getImageCornerRadiusPx,
} from '../../presets/profiles'
import { useContainedWidth } from '../../hooks/useContainedWidth'
import { usePolaroidGL } from '../../hooks/usePolaroidGL'
import { buildFrameCapture, buildImageCapture } from '../../gl/captureUtils'
import type { CaptureOptions, CaptureFn, PolaroidFrameProps } from '../../types'

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PolaroidFrame({
  src,
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
  width = '100%',
  className,
  style,
  onRender,
  onError,
}: PolaroidFrameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)

  const spec = FRAME_SPECS[frameType]
  const profile = FILM_PROFILES[filmType]
  const insets = getFrameInsets(spec)
  const frameAspect = spec.totalSize[0] / spec.totalSize[1]
  const fittedWidth = useContainedWidth(frameRef, width, frameAspect)

  // Resolve effect values: explicit prop overrides film-profile default
  const resolvedGrain = grainAmount ?? profile.grainAmount
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

  // -------------------------------------------------------------------------
  // Stable capture function.
  //
  // Re-created only when frameType changes because both 'image' and 'frame'
  // captures use the frame spec for rounded-corner geometry.
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
    // frameType determines which spec is used for 'frame' captures
    [frameType]
  )

  usePolaroidGL(
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
    { onRender, onError, captureFn }
  )

  // CSS custom properties that drive frame layout and paper styling
  const frameVars: React.CSSProperties = {
    '--plrd-frame-aspect': insets.frameAspect,
    '--plrd-paper-color': spec.paperColor,
    '--plrd-corner-radius': `${spec.cornerRadius}px`,
    '--plrd-shadow': spec.shadow,
    '--plrd-inset-top': insets.top,
    '--plrd-inset-left': insets.left,
    '--plrd-inset-right': insets.right,
    '--plrd-inset-bottom': insets.bottom,
    '--plrd-image-corner-radius': `${getImageDisplayCornerRadiusPx(spec)}px`,
    width: typeof fittedWidth === 'number' ? `${fittedWidth}px` : fittedWidth,
  } as React.CSSProperties

  // Invisible fallback <img> — only meaningful for URL-string sources
  const fallbackSrc = typeof src === 'string' ? src : undefined

  return (
    <div
      ref={frameRef}
      className={`plrd-frame${className ? ` ${className}` : ''}`}
      style={{ ...frameVars, ...style }}
      data-frame-type={frameType}
      data-film-type={filmType}
    >
      <div className="plrd-image-wrap">
        <canvas ref={canvasRef} className="plrd-canvas" />
        {fallbackSrc && (
          <img src={fallbackSrc} alt="" aria-hidden="true" className="plrd-fallback" />
        )}
      </div>
    </div>
  )
}
