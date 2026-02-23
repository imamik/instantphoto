# @instantphoto/react

[![CI](https://img.shields.io/github/actions/workflow/status/imamik/instantphoto/ci.yml?branch=main&label=CI&logo=github)](https://github.com/imamik/instantphoto/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@instantphoto/react?logo=npm&logoColor=white&color=cb0000)](https://www.npmjs.com/package/@instantphoto/react)
[![Coverage](https://img.shields.io/codecov/c/github/imamik/instantphoto?logo=codecov&logoColor=white)](https://codecov.io/gh/imamik/instantphoto)
[![Bundle size](https://img.shields.io/bundlephobia/minzip/@instantphoto/react?label=gzipped&color=22c55e)](https://bundlephobia.com/package/@instantphoto/react)
[![License: MIT](https://img.shields.io/github/license/imamik/instantphoto)](https://github.com/imamik/instantphoto/blob/main/LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18%20%7C%2019-61dafb?logo=react&logoColor=white)](https://react.dev/)

React component library for applying authentic **Polaroid 600** and **Fujifilm Instax** instant-film effects to images — entirely in the browser via WebGL.

- Zero server dependency — runs 100% client-side
- 300 DPI export for print-ready output
- Interactive pan, pinch-to-zoom, and scroll zoom
- Keyboard shortcuts (arrow keys, +/-, R, Ctrl+Z)
- Undo/redo transform history
- Batch processing API
- TypeScript-first, strict types, no `any`

---

## Installation

```bash
bun add @instantphoto/react
```

**Peer dependencies** — install separately if not already present:

```bash
bun add react react-dom   # ^18 or ^19
```

---

## Quick start

```tsx
import { InstantPhotoFrame } from '@instantphoto/react'
import '@instantphoto/react/styles.css'

export function App() {
  return <InstantPhotoFrame src="/my-photo.jpg" />
}
```

---

## Components

### `<InstantPhotoFrame>`

Static display component — renders a photo with film effects on a Polaroid/Instax card. No interactive pan/zoom.

```tsx
import { useState } from 'react'
import { InstantPhotoFrame, type CaptureFn } from '@instantphoto/react'
import '@instantphoto/react/styles.css'

function PhotoCard() {
  const [capture, setCapture] = useState<CaptureFn>()

  return (
    <>
      <InstantPhotoFrame
        src="/photo.jpg"
        frameType="polaroid_600"
        filmType="polaroid"
        width={320}
        onRender={setCapture}
        onError={err => console.error(err)}
      />

      <button onClick={() => capture?.().then(blob => saveAs(blob, 'photo.png'))}>
        Download image
      </button>

      <button onClick={() => capture?.({ target: 'frame' }).then(blob => saveAs(blob, 'frame.png'))}>
        Download with frame
      </button>
    </>
  )
}
```

### `<InstantPhotoImageEditor>`

Interactive editor with pan, pinch-to-zoom, scroll zoom, keyboard shortcuts, and undo/redo.

```tsx
import { useState } from 'react'
import { InstantPhotoImageEditor, type CaptureFn, type InstantPhotoSettings } from '@instantphoto/react'
import '@instantphoto/react/styles.css'

function Editor() {
  const [src, setSrc] = useState<string>()
  const [capture, setCapture] = useState<CaptureFn>()
  const [settings, setSettings] = useState<InstantPhotoSettings>()

  return (
    <>
      <input type="file" onChange={e => setSrc(URL.createObjectURL(e.target.files![0]))} />

      <InstantPhotoImageEditor
        src={src}
        frameType="polaroid_600"
        filmType="polaroid"
        width={480}
        onRender={fn => setCapture(() => fn)}
        onSettingsChange={setSettings}
        onUndo={t => console.log('Undo to', t)}
        onRedo={t => console.log('Redo to', t)}
      />

      <button disabled={!capture} onClick={() => capture?.()}>
        Export
      </button>

      {settings && (
        <pre>{JSON.stringify(settings, null, 2)}</pre>
      )}
    </>
  )
}
```

**Keyboard shortcuts** (click/focus the editor first):

| Key | Action |
|-----|--------|
| `Arrow` keys | Pan |
| `+` / `=` | Zoom in |
| `-` | Zoom out |
| `r` / `R` / `0` | Reset pan & zoom |
| `Ctrl+Z` / `Cmd+Z` | Undo |
| `Ctrl+Y` / `Ctrl+Shift+Z` | Redo |

---

## Props

### Shared props (`InstantPhotoFrame` and `InstantPhotoImageEditor`)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `src` | `string \| HTMLImageElement \| ImageBitmap` | — | Image source. `InstantPhotoImageEditor` makes this optional. |
| `frameType` | `FrameType` | `'polaroid_600'` | Frame format. |
| `filmType` | `FilmType` | `'polaroid'` | Film emulsion profile. |
| `grainAmount` | `number` | film default | Grain intensity 0–1. |
| `grainSizePx` | `number` | `2.08` | Grain particle size in output pixels. |
| `grainColorAmount` | `number` | `1.0` | Colored grain: 0 = monochrome, 1 = subtle color. |
| `halationAmount` | `number` | film default | Bloom/halation intensity 0–1. |
| `vignetteIntensity` | `number` | film default | Vignette intensity 0–1. |
| `chromaticShift` | `number` | film default | Chromatic aberration in source pixels. |
| `saturationDelta` | `number` | film default | Saturation shift –100 to +100. |
| `filmCurveAmount` | `number` | `1.0` | Film color curve blend 0–1. |
| `shadowWideIntensity` | `number` | `0.31` | Large inbound shadow intensity. |
| `seed` | `number` | `0` | Grain seed. `0` = random each render. |
| `width` | `number \| string` | `'100%'` | CSS width of the frame. |
| `className` | `string` | — | Extra CSS class on the frame div. |
| `style` | `CSSProperties` | — | Inline styles on the frame div. |
| `onRender` | `(capture: CaptureFn) => void` | — | Called after each render with a capture function. |
| `onError` | `(error: Error) => void` | — | Called on WebGL or image loading errors. |

### `InstantPhotoImageEditor`-only props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `maxZoom` | `number` | `5` | Maximum zoom factor. |
| `onRenderDelay` | `number` | `600` | Debounce ms before `onRender` fires after a gesture. |
| `liveUpdateDuringGesture` | `boolean` | `true` | Full effects during drag (`true`) or raw preview (`false`). |
| `onTransformChange` | `(transform: ImageTransform) => void` | — | Called on every gesture event with updated pan/zoom. |
| `onSettingsChange` | `(settings: InstantPhotoSettings) => void` | — | Called when transform or effect params change. |
| `onUndo` | `(transform: ImageTransform) => void` | — | Called after keyboard undo is applied. |
| `onRedo` | `(transform: ImageTransform) => void` | — | Called after keyboard redo is applied. |

---

## Frame types

| `FrameType` | Physical format | Canvas size |
|-------------|-----------------|-------------|
| `polaroid_600` | Polaroid 600 (79×79 mm) | 933×933 px |
| `instax_mini` | Fujifilm Instax Mini (46×62 mm) | 543×732 px |
| `instax_square` | Fujifilm Instax Square (62×62 mm) | 732×732 px |
| `instax_wide` | Fujifilm Instax Wide (99×62 mm) | 1169×732 px |

All canvas dimensions are at 300 DPI, so exported images are print-ready at the authentic physical size.

## Film types

| `FilmType` | Description |
|------------|-------------|
| `polaroid` | Polaroid 600 emulation — warm tones, prominent grain, strong vignette |
| `instax` | Fujifilm Instax emulation — cooler tones, lighter grain and vignette |
| `original` | No film emulation — only inbound shadow applied |

---

## Capture API

`onRender` provides a stable `CaptureFn` that can be called at any time:

```ts
type CaptureFn = (options?: CaptureOptions) => Promise<Blob | null>

interface CaptureOptions {
  target?: 'image' | 'frame'   // 'image' = canvas only; 'frame' = full card with border
  format?: 'image/png' | 'image/jpeg' | 'image/webp'
  quality?: number              // 0–1, for JPEG/WebP only
}
```

```ts
// Export just the photo at 300 DPI:
const blob = await capture()

// Export the full frame (white border included):
const blob = await capture({ target: 'frame', format: 'image/jpeg', quality: 0.9 })
```

---

## Batch processing

Process multiple images off-screen with a single shared WebGL pipeline:

```ts
import { batchProcess } from '@instantphoto/react'

const blobs = await batchProcess(
  files.map(f => ({ src: URL.createObjectURL(f) })),
  {
    frameType: 'instax_mini',
    glOptions: { filmType: 'instax' },
    captureOptions: { target: 'frame', format: 'image/jpeg', quality: 0.92 },
    onProgress: (done, total) => setProgress(done / total),
  }
)
```

---

## Settings export

`InstantPhotoSettings` is a serialisable snapshot of all editor parameters at a point in time. Use it to persist or restore editor state, or embed it alongside an exported image:

```ts
import type { InstantPhotoSettings } from '@instantphoto/react'

<InstantPhotoImageEditor
  onSettingsChange={(settings: InstantPhotoSettings) => {
    localStorage.setItem('editor-settings', JSON.stringify(settings))
  }}
/>
```

---

## Browser support

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| WebGL 1.0 | 8+ | 4+ | 5.1+ | 12+ |
| `createImageBitmap` | 50+ | 42+ | 10.1+¹ | 79+ |
| `ResizeObserver` | 64+ | 69+ | 13.1+ | 79+ |
| CSS `aspect-ratio` | 88+ | 89+ | 15+ | 88+ |
| Pointer Events | 55+ | 59+ | 13+ | 12+ |

¹ `imageOrientation: 'flipY'` is not supported in Safari < 17. The library automatically falls back to a canvas-based Y-flip, so rendering is correct on all Safari versions.

**Minimum recommended versions:** Chrome 88, Firefox 89, Safari 15, Edge 88.

---

## Performance tips

- Set `liveUpdateDuringGesture={false}` on low-end or mobile devices for smooth 60fps pan/zoom (uses a lightweight raw-crop preview during gesture, renders full effects on release).
- Use `seed` > 0 for deterministic grain (avoids visual jitter during interactions).
- Use `batchProcess` instead of mounting multiple editors when processing many images.
- The canvas always renders at 300 DPI. On high-DPI displays the CSS scale factor handles visual sharpness — no need to double the canvas size.

---

## Development

```bash
# Install dependencies
bun install

# Run unit tests (watch mode)
bun test

# Run unit tests once with coverage report
bun run test:coverage

# Run Storybook (component explorer)
bun run storybook

# Run E2E tests against a built Storybook
bun run test:e2e

# Build the package
bun run build

# Lint and typecheck
bun run lint
bun run typecheck
```

### Releasing

This package uses [Changesets](https://github.com/changesets/changesets) for versioning and publishing.

```bash
# Document your change (creates a changeset file)
bun run changeset

# Apply pending changesets and bump the version
bun run version

# Build and publish to npm (done automatically by CI on merge to main)
bun run release
```

On every push to `main`, the release workflow either opens a version-bump PR (if there are pending changesets) or publishes to npm when that PR is merged. Add an `NPM_TOKEN` secret in the repository settings for publishing to work.
