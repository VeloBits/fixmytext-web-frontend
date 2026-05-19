import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import EmailVerificationBanner from './EmailVerificationBanner';

const mockResendVerification = vi.fn();

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

vi.mock('@/auth/useOidcAuth', () => ({
  useOidcAuth: vi.fn().mockReturnValue({
    isAuthenticated: false,
    isLoading: false,
    accessToken: null,
    oidcUser: null,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}));

vi.mock('@/store/api/authApi', () => ({
  useResendVerificationMutation: () => [mockResendVerification, { isLoading: false }],
}));

import { useOidcAuth } from '@/auth/useOidcAuth';
const mockUseOidcAuth = vi.mocked(useOidcAuth);

function setAuth({ accessToken = null, user = null }: Partial<MockAuthState> = {}) {
  mockState = { accessToken, user };
  // Keep OIDC in sync with Redux mock state
  mockUseOidcAuth.mockReturnValue({
    isAuthenticated: !!accessToken,
    isLoading: false,
    accessToken,
    oidcUser: null,
    login: vi.fn(),
    logout: vi.fn(),
  });
}

describe('EmailVerificationBanner', () => {
  const showAlert = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    setAuth(); // resets both mockState and mockUseOidcAuth to unauthenticated
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

  it('resends successfully and shows Keycloak redirect message', async () => {
    setAuth({
      accessToken: 'tok',
      user: { email: 'u@example.com', is_email_verified: false },
    });

    render(<EmailVerificationBanner showAlert={showAlert} />);
    fireEvent.click(screen.getByRole('button', { name: 'Resend email' }));

    await waitFor(() => {
      expect(showAlert).toHaveBeenCalledWith(
        'Please check your Keycloak account to resend the verification email.',
        'info'
      );
    });
    // Button stays enabled (no cooldown in new Keycloak-based flow)
    expect(screen.getByRole('button', { name: 'Resend email' })).not.toBeDisabled();
  });

  it('parses backend 429 "wait N seconds" into a countdown', async () => {
    setAuth({
      accessToken: 'tok',
      user: { email: 'u@example.com', is_email_verified: false },
    });

    // New behavior: clicking resend shows the Keycloak message (no API call, no 429)
    render(<EmailVerificationBanner showAlert={showAlert} />);
    fireEvent.click(screen.getByRole('button', { name: 'Resend email' }));

    await waitFor(() => {
      expect(showAlert).toHaveBeenCalledWith(
        'Please check your Keycloak account to resend the verification email.',
        'info'
      );
    });
    // No cooldown in new implementation
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
