import * as Sentry from '@sentry/react';
import { Component, type ReactNode } from 'react';

interface Props {
  name: string;
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class RemoteErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error) {
    try {
      Sentry.captureException(error, { tags: { remote: this.props.name } });
    } catch {
      // Sentry not available
    }
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '40vh',
            gap: '16px',
            padding: '2rem',
            textAlign: 'center',
          }}
        >
          {/* Disconnect icon */}
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--text-3)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            <line x1="2" y1="2" x2="22" y2="22" />
          </svg>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <p style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--text)' }}>
              {this.props.name} couldn&apos;t be loaded
            </p>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-3)' }}>
              This section is temporarily unavailable. It may be deploying or there&apos;s a network
              issue.
            </p>
          </div>

          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '4px',
              padding: '7px 18px',
              fontSize: '0.875rem',
              fontWeight: 500,
              color: 'var(--button-fg)',
              background: 'var(--button-bg)',
              border: 'none',
              borderRadius: 'var(--r-md)',
              cursor: 'pointer',
            }}
          >
            Reload to retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
