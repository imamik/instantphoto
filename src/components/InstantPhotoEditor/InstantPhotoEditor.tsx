import { useRef } from 'react'

import { InstantPhotoImageEditor } from '../InstantPhotoImageEditor'
import type { InstantPhotoEditorProps } from '../../types'
import './InstantPhotoEditor.css'

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function InstantPhotoEditor({
  onUpload,
  onDelete,
  accept = 'image/*',
  src,
  ...rest
}: InstantPhotoEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const emptyState = onUpload ? (
    <button type="button" className="ipf-upload-btn" onClick={() => fileInputRef.current?.click()}>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
        <circle cx="12" cy="13" r="4" />
      </svg>
      Upload photo
    </button>
  ) : undefined

  const imageOverlay = onDelete ? (
    <button type="button" className="ipf-delete-btn" onClick={onDelete} aria-label="Remove photo">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        aria-hidden="true"
      >
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </button>
  ) : undefined

  return (
    <>
      <InstantPhotoImageEditor
        src={src}
        emptyState={emptyState}
        imageOverlay={imageOverlay}
        {...rest}
      />
      {onUpload && (
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          style={{ display: 'none' }}
          onChange={e => {
            const file = e.target.files?.[0]
            if (!file) return
            // Reset so the same file can be re-selected next time
            e.target.value = ''
            onUpload(file)
          }}
        />
      )}
    </>
  )
}
