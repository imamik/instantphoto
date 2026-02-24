// ---------------------------------------------------------------------------
// WebGL render pipeline
//
// Three-pass rendering:
//   Pass 1 (blur H): source → fboBlurH   (9-tap Gaussian, horizontal)
//   Pass 2 (blur V): fboBlurH → fboBlurV (9-tap Gaussian, vertical)
//   Pass 3 (main):   source + fboBlurV → canvas (all film effects)
//
// The blur FBOs are sized to the canvas so the kernel radius naturally
// scales with the displayed image size.
// ---------------------------------------------------------------------------

import type { ImageTransform, InstantPhotoGLOptions } from '../types'

// ---------------------------------------------------------------------------
// GL options validation
// ---------------------------------------------------------------------------

/**
 * Clamp all numeric GL option values to their valid ranges.
 * Call this before passing options to `render()` to prevent silent corruption
 * from out-of-range uniforms.
 */
export function clampGLOptions(opts: InstantPhotoGLOptions): InstantPhotoGLOptions {
  const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))
  return {
    ...opts,
    vignetteIntensity:
      opts.vignetteIntensity !== undefined ? clamp(opts.vignetteIntensity, 0, 1) : undefined,
    halationAmount:
      opts.halationAmount !== undefined ? clamp(opts.halationAmount, 0, 1) : undefined,
    grainAmount: opts.grainAmount !== undefined ? clamp(opts.grainAmount, 0, 1) : undefined,
    grainColorAmount:
      opts.grainColorAmount !== undefined ? clamp(opts.grainColorAmount, 0, 1) : undefined,
    grainSizePx: opts.grainSizePx !== undefined ? clamp(opts.grainSizePx, 0.5, 10) : undefined,
    chromaticShift:
      opts.chromaticShift !== undefined ? clamp(opts.chromaticShift, 0, 20) : undefined,
    saturationDelta:
      opts.saturationDelta !== undefined ? clamp(opts.saturationDelta, -100, 100) : undefined,
    filmCurveAmount:
      opts.filmCurveAmount !== undefined ? clamp(opts.filmCurveAmount, 0, 1) : undefined,
    shadowWideIntensity:
      opts.shadowWideIntensity !== undefined ? clamp(opts.shadowWideIntensity, 0, 1) : undefined,
    shadowFineIntensity:
      opts.shadowFineIntensity !== undefined ? clamp(opts.shadowFineIntensity, 0, 1) : undefined,
    seed: clamp(opts.seed, 0, Infinity),
  }
}
import { BLUR_FRAG_SHADER, MAIN_FRAG_SHADER, VERT_SHADER } from './shaders'
import {
  bindQuad,
  compileShader,
  createFbo,
  createQuadBuffer,
  createSourceTexture,
  linkProgram,
  pickRenderTextureType,
  resizeFbo,
  setUniforms,
  uploadImage,
  type Fbo,
} from './webgl'

// ---------------------------------------------------------------------------
// Pipeline state
// ---------------------------------------------------------------------------

export interface Pipeline {
  gl: WebGLRenderingContext
  blurProgram: WebGLProgram
  mainProgram: WebGLProgram
  sourceTex: WebGLTexture
  fboBlurH: Fbo
  fboBlurV: Fbo
  quadBuffer: WebGLBuffer
  canvasWidth: number
  canvasHeight: number
  fboDataType: number
}

// ---------------------------------------------------------------------------
// Initialise
// ---------------------------------------------------------------------------

export function createPipeline(canvas: HTMLCanvasElement): Pipeline | null {
  const gl = canvas.getContext('webgl', {
    premultipliedAlpha: false,
    preserveDrawingBuffer: true,
    antialias: false,
    depth: false,
    stencil: false,
  })
  if (!gl) return null

  try {
    const vert = compileShader(gl, gl.VERTEX_SHADER, VERT_SHADER)
    const blurFrag = compileShader(gl, gl.FRAGMENT_SHADER, BLUR_FRAG_SHADER)
    const mainFrag = compileShader(gl, gl.FRAGMENT_SHADER, MAIN_FRAG_SHADER)

    const blurProgram = linkProgram(gl, vert, blurFrag)
    const mainProgram = linkProgram(gl, vert, mainFrag)

    gl.deleteShader(vert)
    gl.deleteShader(blurFrag)
    gl.deleteShader(mainFrag)

    const sourceTex = createSourceTexture(gl)
    const quadBuffer = createQuadBuffer(gl)
    const fboDataType = pickRenderTextureType(gl)

    const w = canvas.width || 1
    const h = canvas.height || 1

    return {
      gl,
      blurProgram,
      mainProgram,
      sourceTex,
      fboBlurH: createFbo(gl, w, h, fboDataType),
      fboBlurV: createFbo(gl, w, h, fboDataType),
      quadBuffer,
      canvasWidth: w,
      canvasHeight: h,
      fboDataType,
    }
  } catch (err) {
    console.error('[InstantPhotoFrame] WebGL pipeline init failed:', err)
    return null
  }
}

// ---------------------------------------------------------------------------
// Resize FBOs when the canvas dimensions change
// ---------------------------------------------------------------------------

function ensureSize(pipeline: Pipeline, w: number, h: number): void {
  if (pipeline.canvasWidth === w && pipeline.canvasHeight === h) return
  const { gl } = pipeline
  pipeline.fboBlurH = resizeFbo(gl, pipeline.fboBlurH, w, h, pipeline.fboDataType)
  pipeline.fboBlurV = resizeFbo(gl, pipeline.fboBlurV, w, h, pipeline.fboDataType)
  pipeline.canvasWidth = w
  pipeline.canvasHeight = h
}

// ---------------------------------------------------------------------------
// Compute UV crop to centre-fill the canvas aspect ratio
// Returns { offset: [ox, oy], scale: [sx, sy] } such that the visible
// region of the source image maps to the canvas without distortion.
// ---------------------------------------------------------------------------

export function computeCrop(
  srcW: number,
  srcH: number,
  targetAspect: number
): { offset: [number, number]; scale: [number, number] } {
  // Guard against degenerate dimensions to prevent divide-by-zero
  const safeSrcW = Math.max(1, srcW)
  const safeSrcH = Math.max(1, srcH)
  const safeTargetAspect = Math.max(0.001, targetAspect)
  const srcAspect = safeSrcW / safeSrcH

  if (srcAspect > safeTargetAspect) {
    // Source is wider – letterbox horizontally
    const s = safeTargetAspect / srcAspect
    return { offset: [(1 - s) / 2, 0], scale: [s, 1] }
  } else {
    // Source is taller – letterbox vertically
    const s = srcAspect / safeTargetAspect
    return { offset: [0, (1 - s) / 2], scale: [1, s] }
  }
}

// ---------------------------------------------------------------------------
// Render one blur pass
// ---------------------------------------------------------------------------

function renderBlur(
  pipeline: Pipeline,
  srcTex: WebGLTexture,
  srcTexW: number,
  srcTexH: number,
  targetFbo: Fbo,
  direction: [number, number],
  uvOffset: [number, number],
  uvScale: [number, number],
  sampleStepPx: number
): void {
  const { gl, blurProgram, quadBuffer } = pipeline

  gl.bindFramebuffer(gl.FRAMEBUFFER, targetFbo.fbo)
  gl.viewport(0, 0, targetFbo.width, targetFbo.height)
  gl.useProgram(blurProgram)

  gl.activeTexture(gl.TEXTURE0)
  gl.bindTexture(gl.TEXTURE_2D, srcTex)
  const texLoc = gl.getUniformLocation(blurProgram, 'u_tex')
  gl.uniform1i(texLoc, 0)

  setUniforms(gl, blurProgram, {
    u_texelSize: [1 / srcTexW, 1 / srcTexH],
    u_dir: direction,
    u_uvOffset: uvOffset,
    u_uvScale: uvScale,
    u_sampleStepPx: sampleStepPx,
  })

  bindQuad(gl, blurProgram, quadBuffer)
  gl.drawArrays(gl.TRIANGLES, 0, 6)
}

/**
 * Compute blur sample spacing in source-image pixels so the resulting blur
 * radius in output space scales with canvas size (matching Go's proportional
 * blur radii used by bloom/halation).
 */
function computeBlurSampleStepPx(
  direction: [number, number],
  srcTexW: number,
  srcTexH: number,
  targetFbo: Fbo,
  uvScale: [number, number]
): number {
  const minOutDim = Math.max(1, Math.min(targetFbo.width, targetFbo.height))
  // Go uses ~1.5–2.0% min-dimension blur radii across bloom/halation stages.
  const targetRadiusOutPx = minOutDim * 0.018
  const isHorizontal = Math.abs(direction[0]) > Math.abs(direction[1])
  const sourceDim = isHorizontal ? srcTexW : srcTexH
  const targetDim = isHorizontal ? targetFbo.width : targetFbo.height
  const uvAxisScale = isHorizontal ? uvScale[0] : uvScale[1]
  const sourcePxPerOutPx = (sourceDim * uvAxisScale) / Math.max(1, targetDim)
  // 9-tap kernel covers offsets [-4..4], so per-tap step = radius / 4.
  return Math.max(1, (targetRadiusOutPx * sourcePxPerOutPx) / 4)
}

// ---------------------------------------------------------------------------
// Full render pass
// ---------------------------------------------------------------------------

export interface RenderFlags {
  /** Skip source-texture upload when the current source is already resident on GPU. */
  skipUpload?: boolean
  /** Render only the raw source crop (no film effects or shadows). */
  rawPreview?: boolean
}

// ---------------------------------------------------------------------------
// Internal resolved options (all fields required — no undefined)
// ---------------------------------------------------------------------------

interface ResolvedGLOptions {
  filmType: InstantPhotoGLOptions['filmType']
  canvasSize: InstantPhotoGLOptions['canvasSize']
  imageAspect: number
  imageCornerRadiusPx: number
  vignetteIntensity: number
  halationAmount: number
  grainAmount: number
  grainSizePx: number
  grainColorAmount: number
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

function resolveGLOptions(options: InstantPhotoGLOptions): ResolvedGLOptions {
  const isOriginal = options.filmType === 'original'
  const isPolaroid = options.filmType === 'polaroid'
  const seed = options.seed !== 0 ? options.seed : Math.random() * 9999
  return {
    filmType: options.filmType,
    canvasSize: options.canvasSize,
    imageAspect: options.imageAspect,
    imageCornerRadiusPx: options.imageCornerRadiusPx ?? 0,
    vignetteIntensity: options.vignetteIntensity ?? (isOriginal ? 0.0 : isPolaroid ? 0.4 : 0.25),
    halationAmount: options.halationAmount ?? (isOriginal ? 0.0 : isPolaroid ? 0.17 : 0.08),
    grainAmount: options.grainAmount ?? (isOriginal ? 0.0 : isPolaroid ? 0.021 : 0.018),
    grainSizePx: options.grainSizePx ?? 2.08,
    grainColorAmount: options.grainColorAmount ?? 1.0,
    chromaticShift: options.chromaticShift ?? (isOriginal ? 0.0 : isPolaroid ? 1.5 : 1.2),
    saturationDelta: options.saturationDelta ?? (isOriginal ? 0.0 : isPolaroid ? -15.0 : -10.0),
    filmCurveAmount: options.filmCurveAmount ?? (isOriginal ? 0.0 : 1.0),
    shadowWideIntensity: options.shadowWideIntensity ?? 0.31,
    shadowWideStart: options.shadowWideStart ?? 0.02,
    shadowWideEnd: options.shadowWideEnd ?? 0.11,
    shadowFineIntensity: options.shadowFineIntensity ?? 0.3,
    shadowFineStart: options.shadowFineStart ?? 0.003,
    shadowFineEnd: options.shadowFineEnd ?? 0.006,
    seed,
  }
}

export function render(
  pipeline: Pipeline,
  image: ImageBitmap | HTMLImageElement,
  options: InstantPhotoGLOptions,
  imageTransform?: ImageTransform,
  flags: RenderFlags = {}
): void {
  const { gl, mainProgram, quadBuffer } = pipeline
  const { drawingBufferWidth: cw, drawingBufferHeight: ch } = gl
  const rawPreview = flags.rawPreview === true

  // Clamp and resolve all GL options to concrete values
  const resolved = resolveGLOptions(clampGLOptions(options))

  // Ensure FBOs match the current canvas size
  ensureSize(pipeline, cw, ch)

  // Upload the source image unless the caller guarantees the same source
  // texture is already resident on the GPU.
  if (!flags.skipUpload) {
    uploadImage(gl, pipeline.sourceTex, image)
  }

  const srcW = 'naturalWidth' in image ? image.naturalWidth : image.width
  const srcH = 'naturalHeight' in image ? image.naturalHeight : image.height

  // Compute base UV crop to centre-fill the frame's image aspect ratio
  const { offset: baseOffset, scale: baseScale } = computeCrop(srcW, srcH, resolved.imageAspect)

  // Apply optional pan/zoom transform on top of the base crop
  let [uvOffX, uvOffY] = baseOffset
  let [uvSX, uvSY] = baseScale

  if (
    imageTransform &&
    (imageTransform.scale !== 1 || imageTransform.panX !== 0 || imageTransform.panY !== 0)
  ) {
    const s = Math.max(1, imageTransform.scale)
    uvSX = baseScale[0] / s
    uvSY = baseScale[1] / s
    // Maximum pan before a blank edge would appear.
    // This is based on the active UV window in full source space, not the
    // base crop delta, so aspect-ratio crop room remains pannable at scale=1.
    const maxPanX = (1 - uvSX) / 2
    const maxPanY = (1 - uvSY) / 2
    const clampedPanX = Math.max(-maxPanX, Math.min(maxPanX, imageTransform.panX))
    const clampedPanY = Math.max(-maxPanY, Math.min(maxPanY, imageTransform.panY))
    // Centre the zoomed window then shift by pan (subtract: drag right → show left)
    uvOffX = (1 - uvSX) / 2 - clampedPanX
    uvOffY = (1 - uvSY) / 2 - clampedPanY
  }

  const uvOffset: [number, number] = [uvOffX, uvOffY]
  const uvScale: [number, number] = [uvSX, uvSY]

  const isOriginal = resolved.filmType === 'original'
  const isPolaroid = resolved.filmType === 'polaroid'

  if (!rawPreview && !isOriginal) {
    // -----------------------------------------------------------------------
    // Pass 1 – horizontal Gaussian blur
    // -----------------------------------------------------------------------
    renderBlur(
      pipeline,
      pipeline.sourceTex,
      srcW,
      srcH,
      pipeline.fboBlurH,
      [1, 0],
      uvOffset,
      uvScale,
      computeBlurSampleStepPx([1, 0], srcW, srcH, pipeline.fboBlurH, uvScale)
    )

    // -----------------------------------------------------------------------
    // Pass 2 – vertical Gaussian blur
    // -----------------------------------------------------------------------
    // Source is now fboBlurH (already cropped), so no UV crop needed
    renderBlur(
      pipeline,
      pipeline.fboBlurH.texture,
      pipeline.fboBlurH.width,
      pipeline.fboBlurH.height,
      pipeline.fboBlurV,
      [0, 1],
      [0, 0],
      [1, 1],
      computeBlurSampleStepPx(
        [0, 1],
        pipeline.fboBlurH.width,
        pipeline.fboBlurH.height,
        pipeline.fboBlurV,
        [1, 1]
      )
    )
  }

  // -------------------------------------------------------------------------
  // Pass 3 – main effects
  // -------------------------------------------------------------------------
  gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  gl.viewport(0, 0, cw, ch)
  gl.useProgram(mainProgram)

  // Bind source image to unit 0
  gl.activeTexture(gl.TEXTURE0)
  gl.bindTexture(gl.TEXTURE_2D, pipeline.sourceTex)
  gl.uniform1i(gl.getUniformLocation(mainProgram, 'u_image'), 0)

  // Bind blurred texture to unit 1
  gl.activeTexture(gl.TEXTURE1)
  gl.bindTexture(gl.TEXTURE_2D, pipeline.fboBlurV.texture)
  gl.uniform1i(gl.getUniformLocation(mainProgram, 'u_blurred'), 1)

  setUniforms(gl, mainProgram, {
    u_resolution: [cw, ch],
    u_uvOffset: uvOffset,
    u_uvScale: uvScale,
    u_rawPreview: rawPreview ? 1.0 : 0.0,
    u_imageCornerRadiusPx: resolved.imageCornerRadiusPx,
    u_filmType: isPolaroid ? 0.0 : 1.0,
    u_originalOnly: isOriginal ? 1.0 : 0.0,
    u_vignetteIntensity: resolved.vignetteIntensity,
    u_halationAmount: resolved.halationAmount,
    u_grainAmount: resolved.grainAmount,
    u_grainSizePx: resolved.grainSizePx,
    u_grainColorAmount: resolved.grainColorAmount,
    u_chromaticShift: resolved.chromaticShift,
    u_saturationDelta: resolved.saturationDelta,
    u_filmCurveAmount: resolved.filmCurveAmount,
    u_shadowWideIntensity: resolved.shadowWideIntensity,
    u_shadowWideStart: resolved.shadowWideStart,
    u_shadowWideEnd: resolved.shadowWideEnd,
    u_shadowFineIntensity: resolved.shadowFineIntensity,
    u_shadowFineStart: resolved.shadowFineStart,
    u_shadowFineEnd: resolved.shadowFineEnd,
    u_seed: resolved.seed,
  })

  bindQuad(gl, mainProgram, quadBuffer)
  gl.drawArrays(gl.TRIANGLES, 0, 6)
}

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

export function destroyPipeline(pipeline: Pipeline): void {
  const { gl } = pipeline
  gl.deleteProgram(pipeline.blurProgram)
  gl.deleteProgram(pipeline.mainProgram)
  gl.deleteTexture(pipeline.sourceTex)
  gl.deleteTexture(pipeline.fboBlurH.texture)
  gl.deleteFramebuffer(pipeline.fboBlurH.fbo)
  gl.deleteTexture(pipeline.fboBlurV.texture)
  gl.deleteFramebuffer(pipeline.fboBlurV.fbo)
  gl.deleteBuffer(pipeline.quadBuffer)
}
