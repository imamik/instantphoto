# @instantphoto/react

## 0.1.0

### Minor Changes

**Initial public release**

React component library for applying authentic Polaroid 600 and Fujifilm Instax instant-film effects to images — entirely in the browser via WebGL.

#### Features

- `PolaroidFrame` — zero-config WebGL frame renderer with Polaroid 600 and Fujifilm Instax Mini/Square profiles
- `PolaroidImageEditor` — interactive editor with pan, pinch-to-zoom, scroll zoom, keyboard shortcuts, and undo/redo
- `captureFrame` / `batchProcess` — programmatic capture API with 300 DPI print-ready export
- `useGestures` — composable gesture hook (pointer, wheel, keyboard)
- Full TypeScript types with strict null-safety
- CSS Module styles with a single opt-in stylesheet (`@instantphoto/react/styles.css`)
- Zero server dependency — runs 100 % client-side
- Supports React 18 and 19
