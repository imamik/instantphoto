# @instantphoto/react

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
- `captureFrame` / `batchProcess` — programmatic capture API with 300 DPI print-ready export
- `useGestures` — composable gesture hook (pointer, wheel, keyboard)
- Full TypeScript types with strict null-safety
- CSS Module styles with a single opt-in stylesheet (`@instantphoto/react/styles.css`)
- Zero server dependency — runs 100 % client-side
- Supports React 18 and 19
