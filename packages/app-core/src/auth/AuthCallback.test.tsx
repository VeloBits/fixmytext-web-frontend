import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as Sentry from '@sentry/react';
import { ErrorResponse } from 'oidc-client-ts';
import { AuthCallback } from './AuthCallback';

const { mockNavigate, mockSigninRedirectCallback, mockHasAuthHint, mockBroadcast } = vi.hoisted(
  () => ({
    mockNavigate: vi.fn(),
    mockSigninRedirectCallback: vi.fn(),
    mockHasAuthHint: vi.fn(),
    mockBroadcast: vi.fn(),
  })
);

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

// Overrides the global setup mock: AuthCallback also needs hasAuthHint and
// broadcastAuthMessage, which the shared mock doesn't export.
vi.mock('./userManager', () => ({
  hasAuthHint: mockHasAuthHint,
  broadcastAuthMessage: mockBroadcast,
  userManager: { signinRedirectCallback: mockSigninRedirectCallback },
}));

describe('AuthCallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasAuthHint.mockReturnValue(false); // guest browser by default
  });

  it('broadcasts and navigates home after a successful callback', async () => {
    mockSigninRedirectCallback.mockResolvedValueOnce({});
    render(<AuthCallback />);

    expect(screen.getByText(/signing in/i)).toBeInTheDocument();
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true }));
    expect(mockBroadcast).toHaveBeenCalledWith({ type: 'user_loaded' });
  });

  it('sends a guest to the home page when they cancel on Keycloak (access_denied)', async () => {
    mockSigninRedirectCallback.mockRejectedValueOnce(
      new ErrorResponse({ error: 'access_denied', error_description: 'User cancelled login' })
    );
    render(<AuthCallback />);

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true }));
    // A cancel is a choice, not a failure: no error card, no Sentry noise.
    expect(screen.queryByText(/couldn.t complete sign-in/i)).not.toBeInTheDocument();
    expect(vi.mocked(Sentry.captureException)).not.toHaveBeenCalled();
  });

  it('shows the error card for genuine callback failures', async () => {
    mockSigninRedirectCallback.mockRejectedValueOnce(new Error('invalid grant'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<AuthCallback />);

    expect(await screen.findByText(/couldn.t complete sign-in/i)).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(vi.mocked(Sentry.captureException)).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
