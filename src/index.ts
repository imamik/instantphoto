// ---------------------------------------------------------------------------
// @instantphoto/react – public API
// ---------------------------------------------------------------------------

export { PolaroidFrame } from './components/PolaroidFrame'
export { PolaroidImageEditor } from './components/PolaroidImageEditor'

export { FRAME_SPECS, FILM_PROFILES, PRINT_DPI, getFrameInsets } from './presets/profiles'

export { batchProcess } from './utils/batchProcess'
export type { BatchItem, BatchProcessOptions } from './utils/batchProcess'

export type {
  // Frame / film identifiers
  FrameType,
  FilmType,
  // Data shapes
  FrameSpec,
  FilmProfile,
  // Capture / export
  CaptureTarget,
  ExportFormat,
  CaptureOptions,
  CaptureFn,
  // Interactive transform
  ImageTransform,
  // Settings snapshot
  PolaroidSettings,
  // Components
  PolaroidFrameProps,
  PolaroidImageEditorProps,
} from './types'
