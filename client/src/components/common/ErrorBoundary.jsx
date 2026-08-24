import { Component } from 'react'
import { AlertTriangle } from 'lucide-react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      showDetails: false,
    }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    if (import.meta.env.DEV) {
      console.error('[ErrorBoundary]', error, errorInfo)
    }
  }

  handleReset = () => {
    const { onReset } = this.props
    if (onReset) onReset()
    this.setState({ hasError: false, error: null, showDetails: false })
  }

  toggleDetails = () => {
    this.setState((s) => ({ showDetails: !s.showDetails }))
  }

  render() {
    const { children } = this.props
    const { hasError, error, showDetails } = this.state

    if (!hasError) return children

    return (
      <div className="bg-surface text-on-surface flex min-h-[300px] w-full items-center justify-center p-6">
        <div className="bg-error-container/20 border-outline-variant/30 flex max-w-md w-full flex-col items-center rounded-2xl border p-8 text-center">
          <div className="bg-error-container/30 text-error mb-4 flex h-14 w-14 items-center justify-center rounded-full">
            <AlertTriangle size={28} strokeWidth={1.75} />
          </div>

          <h2 className="text-lg font-semibold tracking-tight">
            Something went wrong
          </h2>
          <p className="text-on-surface-variant mt-1 text-sm">
            An unexpected error occurred. Try reloading or resetting this view.
          </p>

          {error?.message && (
            <button
              type="button"
              onClick={this.toggleDetails}
              className="border-outline-variant/30 text-on-surface-variant hover:bg-surface-container-high mt-4 w-full rounded-lg border px-3 py-2 text-xs transition-colors"
            >
              {showDetails ? 'Hide details' : 'Show details'}
            </button>
          )}

          {showDetails && error?.message && (
            <pre className="bg-surface-container-low border-outline-variant/30 mt-2 max-h-40 w-full overflow-auto rounded-lg border p-3 text-left text-xs whitespace-pre-wrap break-words">
              <code>{error.stack || error.message}</code>
            </pre>
          )}

          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={this.handleReset}
              className="bg-primary text-on-primary hover:bg-primary/90 rounded-full px-5 py-2 text-sm font-medium transition-colors"
            >
              Try again
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="border-outline-variant/30 text-on-surface hover:bg-surface-container-high rounded-full border px-5 py-2 text-sm font-medium transition-colors"
            >
              Reload page
            </button>
          </div>
        </div>
      </div>
    )
  }
}
