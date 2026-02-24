# @instantphoto/react

## 0.4.0

### Minor Changes

- Add ErrorBoundary, device detection, capture hook, frame registry, GL options clamping, and AbortSignal support
  - `InstantPhotoErrorBoundary` — React class error boundary for GL render failures
  - `detectLowEndDevice()` — heuristic for low-end/mobile device detection
  - `useInstantPhotoCapture()` — imperative capture hook returning `{ ref, onRender }`
  - `registerFrameSpec(id, spec)` / `resolveFrameSpec(id)` — extensible frame spec registry
  - `clampGLOptions(opts)` — clamps GL option values to valid ranges
  - `FrameTypeOrSpec` union type (`FrameType | FrameSpec`)
  - `batchProcess` now accepts `signal?: AbortSignal` (throws `AbortError` on cancel)
  - `loadImageBitmap` now accepts `signal?: AbortSignal`, 30 s timeout, and CORS error guidance
  - `liveUpdateDuringGesture` auto-detected at mount when omitted in `InstantPhotoImageEditor`
  - `role="application"` + `:focus-visible` outline on gesture overlay for accessibility
  - Visual regression test suite (`e2e/visual.spec.ts`)

## 0.3.0

### Minor Changes

- b8c7b7b: Raise unit test coverage to 94%+ (enforced ≥80% thresholds) and verify bundlephobia configuration.
  - Add 8 new test files covering captureUtils, loadImageBitmap (including Safari Y-flip fallback), batchProcess, hooks, gestures, public API, and mocked-WebGL pipeline paths
  - 215 tests now pass (up from ~60); statements 94.49%, branches 86.03%, functions 96.66%, lines 96.56%
  - Enforce 80% coverage thresholds in vitest config — CI fails if coverage drops
  - Confirm bundlephobia setup: sideEffects, exports map, treeshaking, and peer externals are all correctly configured so the badge in the README reflects real bundle size

## 0.2.0

### Minor Changes

- Rename all public API identifiers from `Polaroid*` to `InstantPhoto*` to match the repository rebrand.

  **Breaking renames:**

  | Before                     | After                          |
  | -------------------------- | ------------------------------ |
  | `PolaroidFrame`            | `InstantPhotoFrame`            |
  | `PolaroidImageEditor`      | `InstantPhotoImageEditor`      |
  | `PolaroidFrameProps`       | `InstantPhotoFrameProps`       |
  | `PolaroidImageEditorProps` | `InstantPhotoImageEditorProps` |
  | `PolaroidSettings`         | `InstantPhotoSettings`         |
  | `PolaroidGLOptions`        | `InstantPhotoGLOptions`        |

  CSS class prefix changed from `plrd-` to `ipf-` and CSS custom properties from `--plrd-*` to `--ipf-*`.

  Film type strings (`'polaroid'`, `'polaroid_600'`) are unchanged.

## 0.1.0

### Minor Changes

**Initial public release**

React component library for applying authentic Polaroid 600 and Fujifilm Instax instant-film effects to images — entirely in the browser via WebGL.

#### Features

- `InstantPhotoFrame` — zero-config WebGL frame renderer with Polaroid 600 and Fujifilm Instax Mini/Square profiles
- `InstantPhotoImageEditor` — interactive editor with pan, pinch-to-zoom, scroll zoom, keyboard shortcuts, and undo/redo
- `onRender` / `CaptureFn` — capture API: export the image or full frame as a print-ready Blob at 300 DPI
- `batchProcess` — process multiple images off-screen with a single shared WebGL pipeline
- Full TypeScript types with strict null-safety
- CSS Module styles with a single opt-in stylesheet (`@instantphoto/react/styles.css`)
- Zero server dependency — runs 100 % client-side
- Supports React 18 and 19
