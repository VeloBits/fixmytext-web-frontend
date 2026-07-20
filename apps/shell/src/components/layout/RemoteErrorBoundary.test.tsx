import { render, screen, fireEvent } from '@testing-library/react';
import * as Sentry from '@sentry/react';

vi.mock('@sentry/react', () => ({
  default: { captureException: vi.fn() },
  captureException: vi.fn(),
}));

import RemoteErrorBoundary from './RemoteErrorBoundary';

// Component that throws
function ThrowingChild({ shouldThrow }: { shouldThrow?: boolean }) {
  if (shouldThrow) throw new Error('Remote load failed');
  return <div>Remote content</div>;
}

describe('RemoteErrorBoundary', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.mocked(Sentry.captureException).mockReset();
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('renders children when no error', () => {
    render(
      <RemoteErrorBoundary name="Editor">
        <div>Remote content</div>
      </RemoteErrorBoundary>
    );
    expect(screen.getByText('Remote content')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('renders named fallback when child throws', () => {
    render(
      <RemoteErrorBoundary name="Editor">
        <ThrowingChild shouldThrow />
      </RemoteErrorBoundary>
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/Editor couldn't be loaded/)).toBeInTheDocument();
    expect(screen.getByText(/temporarily unavailable/)).toBeInTheDocument();
  });

  it('reports the error to Sentry tagged with the remote name', () => {
    render(
      <RemoteErrorBoundary name="Analytics">
        <ThrowingChild shouldThrow />
      </RemoteErrorBoundary>
    );
    expect(Sentry.captureException).toHaveBeenCalledWith(expect.any(Error), {
      tags: { remote: 'Analytics' },
    });
  });

  it('still renders the fallback when Sentry itself fails', () => {
    vi.mocked(Sentry.captureException).mockImplementation(() => {
      throw new Error('Sentry unavailable');
    });
    render(
      <RemoteErrorBoundary name="Editor">
        <ThrowingChild shouldThrow />
      </RemoteErrorBoundary>
    );
    expect(screen.getByText(/Editor couldn't be loaded/)).toBeInTheDocument();
  });

  it('reloads the page when "Reload to retry" is clicked', () => {
    const reloadMock = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { reload: reloadMock },
      writable: true,
      configurable: true,
    });

    render(
      <RemoteErrorBoundary name="Editor">
        <ThrowingChild shouldThrow />
      </RemoteErrorBoundary>
    );
    fireEvent.click(screen.getByText('Reload to retry'));
    expect(reloadMock).toHaveBeenCalled();
  });
});
