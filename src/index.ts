// ---------------------------------------------------------------------------
// @instantphoto/react – public API
// ---------------------------------------------------------------------------

export { InstantPhotoFrame } from './components/InstantPhotoFrame'
export { InstantPhotoImageEditor } from './components/InstantPhotoImageEditor'
export { InstantPhotoEditor } from './components/InstantPhotoEditor'
export { InstantPhotoErrorBoundary } from './components/InstantPhotoErrorBoundary/InstantPhotoErrorBoundary'
export type { InstantPhotoErrorBoundaryProps } from './components/InstantPhotoErrorBoundary/InstantPhotoErrorBoundary'

export {
  FRAME_SPECS,
  FILM_PROFILES,
  PRINT_DPI,
  getFrameInsets,
  registerFrameSpec,
  resolveFrameSpec,
} from './presets/profiles'

export { batchProcess } from './utils/batchProcess'
export type { BatchItem, BatchProcessOptions } from './utils/batchProcess'

export { detectLowEndDevice } from './utils/deviceCapability'

export { useInstantPhotoCapture } from './hooks/useInstantPhotoCapture'

export { clampGLOptions } from './gl/pipeline'

export type {
  // Frame / film identifiers
  FrameType,
  FrameTypeOrSpec,
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
  InstantPhotoEditorProps,
} from './types'
