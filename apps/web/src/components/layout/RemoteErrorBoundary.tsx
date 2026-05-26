import { Component, type ReactNode } from 'react';

interface Props {
  name: string;
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * Catches failures when a Module Federation remote fails to load (network error,
 * version mismatch, deploy lag). Shows a graceful degraded UI rather than
 * crashing the entire shell.
 */
export default class RemoteErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error) {
    // Surface to Sentry if available — import is optional so the boundary works
    // even before Sentry initialises.
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Sentry = require('@sentry/react');
      Sentry.captureException(error, {
        tags: { remote: this.props.name },
      });
    } catch {
      // Sentry not available — ignore
    }
  }

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div
          role="alert"
          className="flex flex-col items-center justify-center min-h-[40vh] gap-4 text-center px-6"
        >
          <p className="text-lg font-medium text-[var(--text-primary)]">
            {this.props.name} is temporarily unavailable
          </p>
          <p className="text-sm text-[var(--text-secondary)]">
            Please refresh the page to try again.
          </p>
          <button
            className="px-4 py-2 rounded-md bg-[var(--accent-violet)] text-white text-sm"
            onClick={() => window.location.reload()}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
