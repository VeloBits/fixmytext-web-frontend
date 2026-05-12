import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import EmailVerificationBanner from './EmailVerificationBanner';

const mockResendVerification = vi.fn();

let mockState = {
  accessToken: null,
  user: null,
};

vi.mock('react-redux', () => ({
  useSelector: vi.fn((fn) => fn({ auth: mockState })),
  useDispatch: () => vi.fn(),
}));

vi.mock('../../store/api/authApi', () => ({
  useResendVerificationMutation: () => [mockResendVerification, { isLoading: false }],
}));

function setAuth({ accessToken = null, user = null } = {}) {
  mockState = { accessToken, user };
}

describe('EmailVerificationBanner', () => {
  const showAlert = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    setAuth();
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

  it('resends successfully and locks the button into a cooldown', async () => {
    setAuth({
      accessToken: 'tok',
      user: { email: 'u@example.com', is_email_verified: false },
    });
    mockResendVerification.mockReturnValue({ unwrap: () => Promise.resolve({}) });

    render(<EmailVerificationBanner showAlert={showAlert} />);
    fireEvent.click(screen.getByRole('button', { name: 'Resend email' }));

    await waitFor(() => {
      expect(mockResendVerification).toHaveBeenCalled();
      expect(showAlert).toHaveBeenCalledWith(
        'Verification email sent. Check your inbox and spam folder.',
        'success'
      );
    });

    // Button switches to a disabled "Resend in Ns" countdown label.
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /resend in \d+s/i })).toBeDisabled();
    });
  });

  it('parses backend 429 "wait N seconds" into a countdown', async () => {
    setAuth({
      accessToken: 'tok',
      user: { email: 'u@example.com', is_email_verified: false },
    });
    mockResendVerification.mockReturnValue({
      unwrap: () =>
        Promise.reject({
          status: 429,
          data: { detail: 'Please wait 45 seconds before requesting another.' },
        }),
    });

    render(<EmailVerificationBanner showAlert={showAlert} />);
    fireEvent.click(screen.getByRole('button', { name: 'Resend email' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /resend in 4[4-5]s/i })).toBeDisabled();
      expect(showAlert).toHaveBeenCalledWith(
        'Please wait 45 seconds before requesting another.',
        'warning'
      );
    });
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
