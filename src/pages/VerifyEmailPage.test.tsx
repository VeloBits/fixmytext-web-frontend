import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import VerifyEmailPage from './VerifyEmailPage';

const mockNavigate = vi.fn();
const mockVerifyEmail = vi.fn();
const mockResendVerification = vi.fn();
let mockAccessToken: string | null = null;
let mockTokenParam: string | null = 'valid-token';

vi.mock('react-router-dom', () => ({
  Link: ({ children, to, ...props }: { children?: React.ReactNode; to: string; [key: string]: unknown }) => React.createElement('a', { href: to, ...props }, children),
  useNavigate: () => mockNavigate,
  useSearchParams: () => [{ get: (k: string) => (k === 'token' ? mockTokenParam : null) }, vi.fn()],
}));

vi.mock('react-redux', () => ({
  useSelector: vi.fn((fn) => fn({ auth: { accessToken: mockAccessToken } })),
  useDispatch: () => vi.fn(),
}));

vi.mock('../store/api/authApi', () => ({
  useVerifyEmailMutation: () => [mockVerifyEmail, { isLoading: false }],
  useResendVerificationMutation: () => [mockResendVerification, { isLoading: false }],
}));

vi.mock('../constants', () => ({
  ROUTES: { HOME: '/', LOGIN: '/login', VERIFY_EMAIL: '/verify-email' },
}));

describe('VerifyEmailPage', () => {
  const showAlert = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockAccessToken = null;
    mockTokenParam = 'valid-token';
  });

  it('auto-verifies on mount and shows the success state', async () => {
    mockVerifyEmail.mockReturnValue({ unwrap: () => Promise.resolve({}) });
    render(<VerifyEmailPage showAlert={showAlert} />);

    await waitFor(() => {
      expect(mockVerifyEmail).toHaveBeenCalledWith({ token: 'valid-token' });
    });
    expect(await screen.findByText('Email verified')).toBeInTheDocument();
    expect(showAlert).toHaveBeenCalledWith('Email verified — welcome aboard!', 'success');
    expect(screen.getByText('Go to the app')).toHaveAttribute('href', '/');
  });

  it('surfaces the backend error message on failure', async () => {
    mockVerifyEmail.mockReturnValue({
      unwrap: () => Promise.reject({ status: 400, data: { detail: 'Invalid or expired' } }),
    });
    render(<VerifyEmailPage showAlert={showAlert} />);

    expect(await screen.findByText('Verification failed')).toBeInTheDocument();
    expect(screen.getByText('Invalid or expired')).toBeInTheDocument();
  });

  it('shows the missing-token state and does not call verifyEmail', () => {
    mockTokenParam = null;
    render(<VerifyEmailPage showAlert={showAlert} />);
    expect(screen.getByText('Missing verification token')).toBeInTheDocument();
    expect(mockVerifyEmail).not.toHaveBeenCalled();
  });

  it('resend requires auth and redirects to login when signed out', async () => {
    mockTokenParam = null;
    render(<VerifyEmailPage showAlert={showAlert} />);
    await userEvent.click(screen.getByRole('button', { name: /send verification email/i }));
    expect(mockResendVerification).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/login');
    expect(showAlert).toHaveBeenCalledWith(
      'Please sign in to request a new verification email.',
      'warning'
    );
  });

  it('resends successfully when authenticated', async () => {
    mockAccessToken = 'tok';
    mockTokenParam = null;
    mockResendVerification.mockReturnValue({ unwrap: () => Promise.resolve({}) });
    render(<VerifyEmailPage showAlert={showAlert} />);

    await userEvent.click(screen.getByRole('button', { name: /send verification email/i }));

    await waitFor(() => {
      expect(mockResendVerification).toHaveBeenCalled();
      expect(showAlert).toHaveBeenCalledWith(
        'A new verification email has been sent. Check your inbox.',
        'success'
      );
    });
  });

  it('surfaces the 429 cooldown message on resend', async () => {
    mockAccessToken = 'tok';
    mockTokenParam = null;
    mockResendVerification.mockReturnValue({
      unwrap: () =>
        Promise.reject({ status: 429, data: { detail: 'Please wait 60 seconds before ...' } }),
    });
    render(<VerifyEmailPage showAlert={showAlert} />);

    await userEvent.click(screen.getByRole('button', { name: /send verification email/i }));
    await waitFor(() => {
      expect(showAlert).toHaveBeenCalledWith('Please wait 60 seconds before ...', 'warning');
    });
  });
});
