import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

export interface InstantPhotoErrorBoundaryProps {
  /** Fallback UI to render when an error is caught. May be a node or a function receiving the error. */
  fallback?: ReactNode | ((error: Error) => ReactNode)
  /** Called when an error is caught (mirrors `componentDidCatch`). */
  onError?: (error: Error, info: ErrorInfo) => void
  children: ReactNode
}

interface State {
  error: Error | null
}

export class InstantPhotoErrorBoundary extends Component<InstantPhotoErrorBoundaryProps, State> {
  constructor(props: InstantPhotoErrorBoundaryProps) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    this.props.onError?.(error, info)
  }

  render(): ReactNode {
    const { error } = this.state
    const { fallback, children } = this.props

    if (error) {
      if (typeof fallback === 'function') {
        return (fallback as (error: Error) => ReactNode)(error)
      }
      return fallback ?? null
    }

    return children
  }
}
