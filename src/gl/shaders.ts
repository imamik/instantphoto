// ---------------------------------------------------------------------------
// WebGL 1.0 (GLSL ES 1.00) shaders stored as TypeScript string constants.
// Three programs are used:
//   1. BLUR   – separable 9-tap Gaussian; run twice (H then V) into FBOs
//   2. MAIN   – all film effects in a single pass
// Both share the same minimal vertex shader.
// ---------------------------------------------------------------------------

export const VERT_SHADER = /* glsl */ `
attribute vec2 a_position;
varying vec2 v_uv;

void main() {
  // a_position is a [-1, 1] fullscreen quad
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`

// ---------------------------------------------------------------------------
// Gaussian blur (separable 9-tap)
// u_dir = (1,0) for horizontal, (0,1) for vertical
// u_uvOffset / u_uvScale crop the source to the target aspect ratio
// ---------------------------------------------------------------------------

export const BLUR_FRAG_SHADER = /* glsl */ `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform sampler2D u_tex;
uniform vec2 u_texelSize;
uniform vec2 u_dir;
uniform vec2 u_uvOffset;
uniform vec2 u_uvScale;
uniform float u_sampleStepPx;

varying vec2 v_uv;

void main() {
  vec2 base = v_uv * u_uvScale + u_uvOffset;
  vec2 step = u_texelSize * u_dir * max(1.0, u_sampleStepPx);

  vec4 c = vec4(0.0);
  c += texture2D(u_tex, base             ) * 0.22702703;
  c += texture2D(u_tex, base + step*1.0  ) * 0.19459459;
  c += texture2D(u_tex, base - step*1.0  ) * 0.19459459;
  c += texture2D(u_tex, base + step*2.0  ) * 0.12162162;
  c += texture2D(u_tex, base - step*2.0  ) * 0.12162162;
  c += texture2D(u_tex, base + step*3.0  ) * 0.05405405;
  c += texture2D(u_tex, base - step*3.0  ) * 0.05405405;
  c += texture2D(u_tex, base + step*4.0  ) * 0.01621622;
  c += texture2D(u_tex, base - step*4.0  ) * 0.01621622;

  gl_FragColor = c;
}
`

// ---------------------------------------------------------------------------
// Main effects pass – applies every film effect in sequence
// ---------------------------------------------------------------------------

export const MAIN_FRAG_SHADER = /* glsl */ `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform sampler2D u_image;    // Original source image
uniform sampler2D u_blurred;  // Gaussian-blurred version (for halation/bloom)

uniform vec2 u_resolution;    // Canvas physical size in pixels
uniform vec2 u_uvOffset;      // UV crop offset
uniform vec2 u_uvScale;       // UV crop scale
uniform float u_rawPreview;   // 1.0 = raw source preview (no effects)

// Film-type switch: 0.0 = polaroid, 1.0 = instax
uniform float u_filmType;

// Effect parameters (overridable from props)
uniform float u_vignetteIntensity;
uniform float u_halationAmount;
uniform float u_grainAmount;
uniform float u_grainSizePx;
uniform float u_grainColorAmount;
uniform float u_chromaticShift;   // In source-image pixels
uniform float u_saturationDelta;  // Negative = desaturate
uniform float u_filmCurveAmount;  // 0 = no curve, 1 = full film curve
uniform float u_seed;             // Deterministic noise seed
uniform float u_imageCornerRadiusPx; // Rounded corner radius for image area (canvas px)
uniform float u_originalOnly;     // 1.0 = only inbound shadow, no other effects
uniform float u_shadowWideIntensity;
uniform float u_shadowWideStart;
uniform float u_shadowWideEnd;
uniform float u_shadowFineIntensity;
uniform float u_shadowFineStart;
uniform float u_shadowFineEnd;

varying vec2 v_uv;

// ---------------------------------------------------------------------------
// Noise / hash
// ---------------------------------------------------------------------------

float hash(vec2 p) {
  p = fract(p * vec2(443.8975, 441.4236));
  p += dot(p, p.yx + 19.19);
  return fract((p.x + p.y) * p.x);
}

float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float gaussianHash(vec2 p) {
  float u1 = max(hash(p + vec2(37.0, 17.0)), 1e-4);
  float u2 = hash(p + vec2(11.0, 53.0));
  return sqrt(-2.0 * log(u1)) * cos(6.28318530718 * u2);
}

float gaussianValueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = gaussianHash(i);
  float b = gaussianHash(i + vec2(1.0, 0.0));
  float c = gaussianHash(i + vec2(0.0, 1.0));
  float d = gaussianHash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

// ---------------------------------------------------------------------------
// Chromatic aberration – matches Go's applyChromaticAberration16
// R sampled at (+shift, +shift*0.5) pixels, B at (-shift, -shift*0.5).
// Magnitude: localShift = shiftPx * (0.25 + radial * 0.95)  (linear, never zero).
// ---------------------------------------------------------------------------
vec3 chromaticAberration(vec2 uv, float shiftPx) {
  vec2  srcUV    = uv * u_uvScale + u_uvOffset;
  // Drive CA magnitude only from viewport space so pan/zoom never changes
  // the effect strength profile; only sampled image content changes.
  vec2 d = (uv - 0.5) * 2.0;
  float nd = clamp(length(d) / sqrt(2.0), 0.0, 1.0);  // 0=centre, 1=corner

  // Linear magnitude matching Go: localShift = shift * (0.25 + radial * 0.95)
  float localShift = shiftPx * (0.25 + nd * 0.95);

  // Convert using the active viewport scale so CA strength remains stable
  // in output pixels while zoom changes.
  vec2 texelUV = u_uvScale / u_resolution;
  vec2 offset  = localShift * texelUV * vec2(1.0, 0.5);

  float r = texture2D(u_image, srcUV + offset).r;
  float g = texture2D(u_image, srcUV         ).g;
  float b = texture2D(u_image, srcUV - offset).b;
  return vec3(r, g, b);
}

// ---------------------------------------------------------------------------
// Local contrast – approximates Go's applyLocalShadowsHighlights16
// amountShadows=0.6, amountHighlights=0.4  (BT.601 luminance)
// ---------------------------------------------------------------------------
vec3 localContrast(vec3 col) {
  float lum            = dot(col, vec3(0.299, 0.587, 0.114));  // BT.601
  float shadowBoost    = 0.6 * pow(1.0 - lum, 2.0);
  float highlightScale = 1.0 - 0.4 * lum * lum * 0.2;
  return col * highlightScale + shadowBoost * 0.05;
}

// ---------------------------------------------------------------------------
// Bloom – screen blend matching Go's applySoftnessBloom16
// threshold = 180/255, bloomIntensity = 0.495
// ---------------------------------------------------------------------------
vec3 applyBloom(vec3 col, vec3 blurred) {
  float threshold = 0.706;  // 180/255
  float intensity = 0.495;
  vec3  bright    = max(blurred - threshold, 0.0);
  // Screen blend: 1 - (1 - src) * (1 - bloom * intensity)
  return 1.0 - (1.0 - col) * (1.0 - bright * intensity);
}

// ---------------------------------------------------------------------------
// Halation – warm red/orange glow matching Go's channel weighting.
// Uses a soft threshold to keep transitions smooth (no hard contour lines).
// ---------------------------------------------------------------------------
vec3 applyHalation(vec3 col, vec3 blurred, float amount) {
  float threshold = 0.706; // 180/255, same highlight gate as Go
  float knee = 0.14;
  vec3 highlight = smoothstep(
    vec3(threshold - knee),
    vec3(threshold + knee),
    blurred
  );
  vec3 halo = blurred * highlight * vec3(0.9, 0.45, 0.2) * amount * 1.25;
  return clamp(col + halo, 0.0, 1.0);
}

// ---------------------------------------------------------------------------
// Vignette – matches Go's applyVignette16
// Linear falloff starting at 50% of the half-diagonal (never quadratic).
// ---------------------------------------------------------------------------
vec3 applyVignette(vec3 col, vec2 uv, float intensity) {
  // Compute radial distance in pixel space so the vignette stays perfectly
  // round and centered regardless of frame aspect ratio.
  vec2 p = (uv - 0.5) * u_resolution;
  float maxR = max(1.0, 0.5 * length(u_resolution));
  float dist = length(p) / maxR;  // 0=centre, 1=corner
  // Go: mask = 1 - max(0, dist/maxR - 0.5) * intensity (dist already normalized)
  float factor = 1.0 - max(0.0, dist - 0.5) * intensity;
  return col * clamp(factor, 0.0, 1.0);
}

// ---------------------------------------------------------------------------
// Polaroid vintage film curves – matches Go's applyVintageCurves16
// All values normalised from 16-bit [0, 65535].
// ---------------------------------------------------------------------------
vec3 polaroidCurves(vec3 col) {
  float t      = 0.39222;  // 25700/65535
  float margin = 0.01952;  // 1280/65535
  float lo     = t - margin;
  float hi     = t + margin;

  float r = col.r;
  if (r < lo) {
    r = r * 1.05;
  } else if (r > hi) {
    r = r + (1.0 - r) * 0.1;    // Go: r + (65535 - r) * 0.1
  } else {
    float blend = (r - lo) / (2.0 * margin);
    r = mix(r * 1.05, r + (1.0 - r) * 0.1, blend);
  }

  float g = col.g * 0.98 + 0.01952;   // +1280/65535
  float b = col.b * 0.85 + 0.07812;   // +5120/65535

  return clamp(vec3(r, g, b), 0.0, 1.0);
}

// ---------------------------------------------------------------------------
// Instax film curves – matches Go's applyInstaxCurves16
// ---------------------------------------------------------------------------
vec3 instaxCurves(vec3 col) {
  float t1 = 0.78424;  // 51400/65535
  float t2 = 0.19607;  // 12850/65535

  float r = col.r;
  if (r > t1) {
    r = r * 0.95;
  } else if (r > t2) {
    r = r * 1.05;
  }

  float b = col.b * 1.05 + 0.01952;  // +1280/65535

  return clamp(vec3(r, col.g, b), 0.0, 1.0);
}

// ---------------------------------------------------------------------------
// Saturation – matches Go's applySaturation16  (BT.601 luminance)
// factor = 1 + saturationDelta/100  (negative delta → desaturate)
// ---------------------------------------------------------------------------
vec3 applySaturation(vec3 col, float delta) {
  float lum    = dot(col, vec3(0.299, 0.587, 0.114));  // BT.601
  float factor = 1.0 + delta / 100.0;
  return mix(vec3(lum), col, factor);
}

// ---------------------------------------------------------------------------
// Rounded-rect edge distance for the photo area.
// Returns distance to the nearest rounded border in UV units of min dimension.
// ---------------------------------------------------------------------------
float roundedEdgeDist(vec2 uv) {
  float minDim = max(1.0, min(u_resolution.x, u_resolution.y));
  float r = clamp(u_imageCornerRadiusPx, 0.0, 0.5 * minDim);
  if (r <= 0.0) {
    return min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
  }

  vec2 p = uv * u_resolution;
  vec2 halfSize = u_resolution * 0.5;
  vec2 b = max(halfSize - vec2(r), vec2(0.0));
  vec2 q = abs(p - halfSize) - b;
  float sd = length(max(q, vec2(0.0))) + min(max(q.x, q.y), 0.0) - r;

  // Convert signed distance (px) to positive inside-distance in UV units.
  return max(0.0, -sd) / minDim;
}

// ---------------------------------------------------------------------------
// Inbound shadow – matches Go's applyInboundShadow16 (two passes)
// Blends toward the authentic shadow colour {3855,2570,2570}/65535 (dark warm brown).
// ---------------------------------------------------------------------------
vec3 inboundShadow(vec3 col, vec2 uv) {
  // Go uses color.NRGBA64{3855, 2570, 2570, 65535} as the shadow tint
  vec3  shadowColor = vec3(0.05882, 0.03922, 0.03922);
  float edgeDist    = roundedEdgeDist(uv);

  float wideStart = max(0.0, u_shadowWideStart);
  float wideEnd   = max(wideStart + 0.0001, u_shadowWideEnd);
  float fineStart = max(0.0, u_shadowFineStart);
  float fineEnd   = max(fineStart + 0.0001, u_shadowFineEnd);

  float a1 = max(0.0, u_shadowWideIntensity) * (1.0 - smoothstep(wideStart, wideEnd, edgeDist));
  float a2 = max(0.0, u_shadowFineIntensity) * (1.0 - smoothstep(fineStart, fineEnd, edgeDist));

  vec3 result = mix(col,    shadowColor, a1);
  return        mix(result, shadowColor, a2);
}

// ---------------------------------------------------------------------------
// Film grain – organic gaussian grain with clustered structure.
// Matches Go's luma/chroma weighting (strength and channel ratios), but adds
// correlated multi-scale structure so it reads less digital.
// ---------------------------------------------------------------------------
vec3 filmGrain(vec3 col, vec2 uv, float amount) {
  float lum = dot(col, vec3(0.299, 0.587, 0.114));  // BT.601
  vec2 px = uv * u_resolution;
  float grainSizePx = max(0.6, u_grainSizePx);
  float colorAmt = clamp(u_grainColorAmount, 0.0, 1.0);
  vec2 gp = px / grainSizePx;

  float gCoarse = gaussianValueNoise(gp * 0.56 + vec2(u_seed * 0.071, u_seed * 0.113));
  float gMid = gaussianValueNoise(gp * 1.05 + vec2(19.17, 43.29) + u_seed * 0.017);
  float gFine = gaussianValueNoise(gp * 2.05 + vec2(7.1, 11.3) + u_seed * 0.013);
  float n = gCoarse * 0.44 + gMid * 0.36 + gFine * 0.20;
  // Compress tails slightly so occasional gaussian outliers do not sparkle.
  n = n / (1.0 + abs(n) * 0.55);

  float clump = gaussianValueNoise(gp * 0.17 + vec2(3.7, 5.9) + u_seed * 0.005);
  float clumpGain = clamp(1.0 + clump * 0.14, 0.82, 1.18);
  // Keep Go-compatible luma shaping while modulating by clustered grain density.
  float strength = amount * (1.25 - 0.65 * lum) * clumpGain;

  float chromaNR = gaussianValueNoise(gp * 1.15 + vec2(31.7, 9.3) + u_seed * 0.023);
  float chromaNB = gaussianValueNoise(gp * 1.23 + vec2(13.4, 27.8) + u_seed * 0.029);
  chromaNR = chromaNR / (1.0 + abs(chromaNR) * 0.6);
  chromaNB = chromaNB / (1.0 + abs(chromaNB) * 0.6);

  vec3 grain = vec3(n + chromaNR * 0.2 * colorAmt, n, n + chromaNB * 0.2 * colorAmt) * strength;
  return clamp(col + grain, 0.0, 1.0);
}

// ---------------------------------------------------------------------------
// Unified HDR polish – matches Go's applyUnifiedHDRPolish16
// Sequence: shadow boost → highlight rolloff → contrast → lift → gamma.
// ---------------------------------------------------------------------------
vec3 hdrPolish(vec3 col) {
  float hiThresh = 0.8499;   // 55700/65535
  float contrast  = 1.25;
  float liftNorm  = 0.07059; // 18*257/65535 = 4626/65535
  float gamma     = 0.85;

  // 1. Shadow boost: linear, up to 4000/65535 for pure black (matches Go)
  vec3 boosted = col + clamp(1.0 - col / 0.25, 0.0, 1.0) * (4000.0 / 65535.0);

  // 2. Highlight rolloff: quadratic compression above 55700/65535 (matches Go)
  vec3 hiExcess = max(boosted - hiThresh, 0.0);
  vec3 rolled   = boosted - hiExcess * hiExcess / (1.0 - hiThresh) * 0.3;

  // 3. Contrast around 0.5 midpoint
  vec3 contrasted = clamp((rolled - 0.5) * contrast + 0.5, 0.0, 1.0);

  // 4. Lift: shifts black up to liftNorm, white stays at 1 (matches Go)
  vec3 lifted = liftNorm + contrasted * (1.0 - liftNorm);

  // 5. Gamma
  return pow(max(lifted, 0.0), vec3(gamma));
}

// ---------------------------------------------------------------------------
// Output dither for 8-bit display/export quantization.
// Adds sub-LSB luma noise to suppress visible banding in smooth gradients.
// ---------------------------------------------------------------------------
float interleavedGradientNoise(vec2 p) {
  return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715))));
}

vec3 outputDither(vec3 col) {
  float n = interleavedGradientNoise(gl_FragCoord.xy) - 0.5;
  float amp = 0.85 / 255.0;
  return clamp(col + vec3(n * amp), 0.0, 1.0);
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

void main() {
  vec2 srcUV = v_uv * u_uvScale + u_uvOffset;

  if (u_rawPreview > 0.5) {
    vec3 raw = texture2D(u_image, srcUV).rgb;
    gl_FragColor = vec4(raw, 1.0);
    return;
  }

  // "Original" mode: keep source untouched except the two-pass inbound shadow.
  if (u_originalOnly > 0.5) {
    vec3 original = texture2D(u_image, srcUV).rgb;
    original = inboundShadow(original, v_uv);
    original = outputDither(original);
    gl_FragColor = vec4(original, 1.0);
    return;
  }

  // 1. Chromatic aberration
  vec3 col = chromaticAberration(v_uv, u_chromaticShift);

  // 2. Local contrast enhancement
  col = localContrast(col);

  // u_blurred was already rendered from the cropped source in the blur passes.
  // Sample in framebuffer space to avoid applying crop/zoom twice.
  vec3 blurred = texture2D(u_blurred, v_uv).rgb;

  // 3. Bloom
  col = applyBloom(col, blurred);

  // 4. Halation
  col = applyHalation(col, blurred, u_halationAmount);

  // 5. Vignette
  col = applyVignette(col, v_uv, u_vignetteIntensity);

  // 6. Film-type colour curves
  float curveAmt = clamp(u_filmCurveAmount, 0.0, 1.0);
  vec3 curveOut;
  if (u_filmType < 0.5) {
    curveOut = polaroidCurves(col);
  } else {
    curveOut = instaxCurves(col);
  }
  col = mix(col, curveOut, curveAmt);

  // 7. Saturation
  col = applySaturation(col, u_saturationDelta);

  // 8. Inbound shadow (two passes)
  col = inboundShadow(col, v_uv);

  // 9. Film grain
  col = filmGrain(col, v_uv, u_grainAmount);

  // 10. HDR polish
  col = hdrPolish(col);

  // 11. Final quantization dither
  col = outputDither(col);

  gl_FragColor = vec4(col, 1.0);
}
`
