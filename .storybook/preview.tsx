import type { Preview } from '@storybook/react'
import '../src/components/InstantPhotoFrame/InstantPhotoFrame.css'

const preview: Preview = {
  parameters: {
    backgrounds: {
      default: 'warm gray',
      values: [
        { name: 'warm gray', value: '#e8e4df' },
        { name: 'white',     value: '#ffffff' },
        { name: 'dark',      value: '#2b2b2b' },
        { name: 'light gray', value: '#f5f5f5' },
      ],
    },
    layout: 'centered',
  },
}

export default preview
