// ---------------------------------------------------------------------------
// @instantphoto/react – public API
// ---------------------------------------------------------------------------

export { InstantPhotoFrame } from './components/InstantPhotoFrame'
export { InstantPhotoImageEditor } from './components/InstantPhotoImageEditor'

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
  InstantPhotoSettings,
  // Components
  InstantPhotoFrameProps,
  InstantPhotoImageEditorProps,
} from './types'
