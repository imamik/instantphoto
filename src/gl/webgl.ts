// ---------------------------------------------------------------------------
// Low-level WebGL 1 helpers
// ---------------------------------------------------------------------------

export function compileShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string
): WebGLShader {
  const shader = gl.createShader(type)
  if (!shader) throw new Error('gl.createShader returned null')

  gl.shaderSource(shader, source)
  gl.compileShader(shader)

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader) ?? 'unknown error'
    gl.deleteShader(shader)
    throw new Error(`Shader compile error:\n${info}`)
  }

  return shader
}

export function linkProgram(
  gl: WebGLRenderingContext,
  vert: WebGLShader,
  frag: WebGLShader
): WebGLProgram {
  const program = gl.createProgram()
  if (!program) throw new Error('gl.createProgram returned null')

  gl.attachShader(program, vert)
  gl.attachShader(program, frag)
  gl.linkProgram(program)

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program) ?? 'unknown error'
    gl.deleteProgram(program)
    throw new Error(`Program link error:\n${info}`)
  }

  return program
}

// ---------------------------------------------------------------------------
// Framebuffer object helpers
// ---------------------------------------------------------------------------

export interface Fbo {
  fbo: WebGLFramebuffer
  texture: WebGLTexture
  width: number
  height: number
}

interface HalfFloatExt {
  HALF_FLOAT_OES: number
}

function isRenderableTextureType(gl: WebGLRenderingContext, type: number): boolean {
  const prevTex = gl.getParameter(gl.TEXTURE_BINDING_2D) as WebGLTexture | null
  const prevFbo = gl.getParameter(gl.FRAMEBUFFER_BINDING) as WebGLFramebuffer | null

  const texture = gl.createTexture()
  const fbo = gl.createFramebuffer()
  if (!texture || !fbo) {
    if (texture) gl.deleteTexture(texture)
    if (fbo) gl.deleteFramebuffer(fbo)
    return false
  }

  let ok = false
  try {
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 4, 4, 0, gl.RGBA, type, null)

    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0)
    ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE
  } catch {
    ok = false
  }

  gl.bindTexture(gl.TEXTURE_2D, prevTex)
  gl.bindFramebuffer(gl.FRAMEBUFFER, prevFbo)
  gl.deleteTexture(texture)
  gl.deleteFramebuffer(fbo)

  return ok
}

/**
 * Picks the highest-precision renderable texture type for intermediate FBOs.
 *
 * Preference order:
 * 1) half-float (with linear filtering)
 * 2) float (with linear filtering)
 * 3) 8-bit unsigned byte (always available)
 */
export function pickRenderTextureType(gl: WebGLRenderingContext): number {
  const halfFloatExt = gl.getExtension('OES_texture_half_float') as HalfFloatExt | null
  const hasHalfFloatLinear = !!gl.getExtension('OES_texture_half_float_linear')
  const hasHalfFloatColor = !!gl.getExtension('EXT_color_buffer_half_float')
  if (halfFloatExt && hasHalfFloatLinear && hasHalfFloatColor) {
    if (isRenderableTextureType(gl, halfFloatExt.HALF_FLOAT_OES)) {
      return halfFloatExt.HALF_FLOAT_OES
    }
  }

  const hasFloatTex = !!gl.getExtension('OES_texture_float')
  const hasFloatLinear = !!gl.getExtension('OES_texture_float_linear')
  const hasFloatColor = !!gl.getExtension('WEBGL_color_buffer_float')
  if (hasFloatTex && hasFloatLinear && hasFloatColor) {
    if (isRenderableTextureType(gl, gl.FLOAT)) {
      return gl.FLOAT
    }
  }

  return gl.UNSIGNED_BYTE
}

export function createFbo(
  gl: WebGLRenderingContext,
  width: number,
  height: number,
  dataType: number = gl.UNSIGNED_BYTE
): Fbo {
  const texture = gl.createTexture()
  if (!texture) throw new Error('gl.createTexture returned null')

  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, dataType, null)

  const fbo = gl.createFramebuffer()
  if (!fbo) throw new Error('gl.createFramebuffer returned null')

  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0)

  const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER)
  if (status !== gl.FRAMEBUFFER_COMPLETE) {
    throw new Error(`Framebuffer incomplete: 0x${status.toString(16)}`)
  }

  gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  gl.bindTexture(gl.TEXTURE_2D, null)

  return { fbo, texture, width, height }
}

export function resizeFbo(
  gl: WebGLRenderingContext,
  fbo: Fbo,
  width: number,
  height: number,
  dataType: number = gl.UNSIGNED_BYTE
): Fbo {
  gl.deleteTexture(fbo.texture)
  gl.deleteFramebuffer(fbo.fbo)
  return createFbo(gl, width, height, dataType)
}

// ---------------------------------------------------------------------------
// Source-image texture
// ---------------------------------------------------------------------------

export function createSourceTexture(gl: WebGLRenderingContext): WebGLTexture {
  const tex = gl.createTexture()
  if (!tex) throw new Error('gl.createTexture returned null')

  gl.bindTexture(gl.TEXTURE_2D, tex)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.bindTexture(gl.TEXTURE_2D, null)

  return tex
}

export function uploadImage(
  gl: WebGLRenderingContext,
  texture: WebGLTexture,
  image: ImageBitmap | HTMLImageElement | HTMLCanvasElement
): void {
  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image)
  gl.bindTexture(gl.TEXTURE_2D, null)
}

// ---------------------------------------------------------------------------
// Fullscreen quad geometry
// ---------------------------------------------------------------------------

export function createQuadBuffer(gl: WebGLRenderingContext): WebGLBuffer {
  const buf = gl.createBuffer()
  if (!buf) throw new Error('gl.createBuffer returned null')

  gl.bindBuffer(gl.ARRAY_BUFFER, buf)
  // Two triangles covering [-1, 1]
  const verts = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1])
  gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW)
  gl.bindBuffer(gl.ARRAY_BUFFER, null)

  return buf
}

// ---------------------------------------------------------------------------
// Uniform helpers
// ---------------------------------------------------------------------------

export function setUniforms(
  gl: WebGLRenderingContext,
  program: WebGLProgram,
  uniforms: Record<string, number | number[]>
): void {
  for (const [name, value] of Object.entries(uniforms)) {
    const loc = gl.getUniformLocation(program, name)
    if (loc === null) continue
    if (typeof value === 'number') {
      gl.uniform1f(loc, value)
    } else if (value.length === 2) {
      gl.uniform2f(loc, value[0], value[1])
    } else if (value.length === 3) {
      gl.uniform3f(loc, value[0], value[1], value[2])
    } else if (value.length === 4) {
      gl.uniform4f(loc, value[0], value[1], value[2], value[3])
    }
  }
}

// ---------------------------------------------------------------------------
// Bind quad + set a_position attribute
// ---------------------------------------------------------------------------

export function bindQuad(
  gl: WebGLRenderingContext,
  program: WebGLProgram,
  quadBuffer: WebGLBuffer
): void {
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer)
  const pos = gl.getAttribLocation(program, 'a_position')
  gl.enableVertexAttribArray(pos)
  gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0)
}
