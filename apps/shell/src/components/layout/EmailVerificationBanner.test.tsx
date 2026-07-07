import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import EmailVerificationBanner from './EmailVerificationBanner';

interface MockAuthState {
  accessToken: string | null;
  user: { email: string; is_email_verified: boolean } | null;
}

let mockState: MockAuthState = {
  accessToken: null,
  user: null,
};

vi.mock('react-redux', () => ({
  useSelector: vi.fn((fn) => fn({ auth: mockState })),
  useDispatch: () => vi.fn(),
}));

vi.mock('@velobits/app-core/auth/useOidcAuth', () => ({
  useOidcAuth: vi.fn().mockReturnValue({
    isAuthenticated: false,
    wasAuthenticated: false,
    isLoading: false,
    accessToken: null,
    oidcUser: null,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}));

import { useOidcAuth } from '@velobits/app-core/auth/useOidcAuth';
const mockUseOidcAuth = vi.mocked(useOidcAuth);

function setAuth({ accessToken = null, user = null }: Partial<MockAuthState> = {}) {
  mockState = { accessToken, user };
  // Keep OIDC in sync with Redux mock state
  mockUseOidcAuth.mockReturnValue({
    isAuthenticated: !!accessToken,
    wasAuthenticated: !!accessToken,
    isLoading: false,
    accessToken,
    oidcUser: null,
    login: vi.fn(),
    logout: vi.fn(),
  });
}

describe('EmailVerificationBanner', () => {
  const showAlert = vi.fn();
  const assignSpy = vi.fn();
  const originalLocation = window.location;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    setAuth(); // resets both mockState and mockUseOidcAuth to unauthenticated
    // Resend now performs a full-page redirect to Keycloak. jsdom's
    // window.location.assign is non-configurable, so swap the whole location
    // object for a stub that records the navigation target.
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: { ...originalLocation, assign: assignSpy },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: originalLocation,
    });
  });

  it('renders nothing when the user is signed out', () => {
    const { container } = render(<EmailVerificationBanner showAlert={showAlert} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when the user is verified', () => {
    setAuth({ accessToken: 'tok', user: { email: 'a@b.c', is_email_verified: true } });
    const { container } = render(<EmailVerificationBanner showAlert={showAlert} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders for unverified authenticated users', () => {
    setAuth({
      accessToken: 'tok',
      user: { email: 'unverified@example.com', is_email_verified: false },
    });
    render(<EmailVerificationBanner showAlert={showAlert} />);
    expect(screen.getByTestId('email-verification-banner')).toBeInTheDocument();
    expect(screen.getByText('unverified@example.com')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Resend email' })).toBeInTheDocument();
  });

  it('resend redirects to the Keycloak reset-credentials action with login_hint', async () => {
    setAuth({
      accessToken: 'tok',
      user: { email: 'u@example.com', is_email_verified: false },
    });

    render(<EmailVerificationBanner showAlert={showAlert} />);
    fireEvent.click(screen.getByRole('button', { name: 'Resend email' }));

    await waitFor(() => expect(assignSpy).toHaveBeenCalledTimes(1));
    const target = String(assignSpy.mock.calls[0]?.[0] ?? '');
    expect(target).toContain('/realms/');
    expect(target).toContain('/login-actions/reset-credentials');
    expect(target).toContain('login_hint=u%40example.com');
    expect(target).toContain('client_id=');
    // Keycloak owns the flow now — no in-app alert is shown on the happy path.
    expect(showAlert).not.toHaveBeenCalled();
  });

  it('resend button has no cooldown / disabled state (Keycloak owns the flow)', () => {
    setAuth({
      accessToken: 'tok',
      user: { email: 'u@example.com', is_email_verified: false },
    });

    render(<EmailVerificationBanner showAlert={showAlert} />);
    const btn = screen.getByRole('button', { name: 'Resend email' });
    expect(btn).not.toBeDisabled();
    // No countdown label in the new implementation.
    expect(screen.queryByRole('button', { name: /resend in \d+s/i })).not.toBeInTheDocument();
  });

  it('dismiss button hides the banner and persists the dismissal', () => {
    setAuth({
      accessToken: 'tok',
      user: { email: 'u@example.com', is_email_verified: false },
    });

    const { container } = render(<EmailVerificationBanner showAlert={showAlert} />);
    fireEvent.click(screen.getByRole('button', { name: /dismiss verification reminder/i }));
    expect(container.firstChild).toBeNull();
    expect(localStorage.getItem('fmt:email-verify-dismissed-until')).toBeTruthy();
  });

  it('respects a persisted dismissal on mount', () => {
    setAuth({
      accessToken: 'tok',
      user: { email: 'u@example.com', is_email_verified: false },
    });
    localStorage.setItem('fmt:email-verify-dismissed-until', String(Date.now() + 30 * 60 * 1000));
    const { container } = render(<EmailVerificationBanner showAlert={showAlert} />);
    expect(container.firstChild).toBeNull();
  });
});
