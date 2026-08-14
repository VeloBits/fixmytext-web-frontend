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

// Resend is an account-svc mutation (POST /auth/resend-verification), not a
// Keycloak page navigation - mock the RTK hook so no store Provider is needed.
const mockResendTrigger = vi.fn();
let mockIsResending = false;
vi.mock('@velobits/app-core/store/api/authApi', () => ({
  useResendVerificationMutation: () => [mockResendTrigger, { isLoading: mockIsResending }],
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

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockIsResending = false;
    mockResendTrigger.mockReturnValue({ unwrap: () => Promise.resolve() });
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

  it('resend calls the account-svc mutation and confirms via alert', async () => {
    setAuth({
      accessToken: 'tok',
      user: { email: 'u@example.com', is_email_verified: false },
    });

    render(<EmailVerificationBanner showAlert={showAlert} />);
    fireEvent.click(screen.getByRole('button', { name: 'Resend email' }));

    await waitFor(() => expect(mockResendTrigger).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(showAlert).toHaveBeenCalledWith(expect.stringContaining('u@example.com'), 'success')
    );
  });

  it('resend failure surfaces a danger alert instead of throwing', async () => {
    mockResendTrigger.mockReturnValue({ unwrap: () => Promise.reject(new Error('502')) });
    setAuth({
      accessToken: 'tok',
      user: { email: 'u@example.com', is_email_verified: false },
    });

    render(<EmailVerificationBanner showAlert={showAlert} />);
    fireEvent.click(screen.getByRole('button', { name: 'Resend email' }));

    await waitFor(() =>
      expect(showAlert).toHaveBeenCalledWith(expect.stringContaining('Could not send'), 'danger')
    );
  });

  it('resend button is disabled while the request is in flight', () => {
    mockIsResending = true;
    setAuth({
      accessToken: 'tok',
      user: { email: 'u@example.com', is_email_verified: false },
    });

    render(<EmailVerificationBanner showAlert={showAlert} />);
    expect(screen.getByRole('button', { name: 'Sending…' })).toBeDisabled();
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
