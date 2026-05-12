import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ResetPasswordPage from './ResetPasswordPage';

const mockNavigate = vi.fn();
const mockResetPassword = vi.fn();
let mockAccessToken: string | null = null;
let mockTokenParam: string | null = 'valid-token';

vi.mock('react-router-dom', () => ({
  Link: ({ children, to, ...props }: { children?: React.ReactNode; to: string; [key: string]: unknown }) => React.createElement('a', { href: to, ...props }, children),
  Navigate: ({ to }: { to: string }) => <div data-testid="navigate" data-to={to} />,
  useNavigate: () => mockNavigate,
  useSearchParams: () => [{ get: (k: string) => (k === 'token' ? mockTokenParam : null) }, vi.fn()],
}));

vi.mock('react-redux', () => ({
  useSelector: vi.fn((fn) => fn({ auth: { accessToken: mockAccessToken } })),
  useDispatch: () => vi.fn(),
}));

vi.mock('@/store/api/authApi', () => ({
  useResetPasswordMutation: () => [mockResetPassword, { isLoading: false }],
}));

vi.mock('@/constants', () => ({
  ROUTES: {
    HOME: '/',
    LOGIN: '/login',
    FORGOT_PASSWORD: '/forgot-password',
    RESET_PASSWORD: '/reset-password',
  },
}));

describe('ResetPasswordPage', () => {
  const showAlert = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockAccessToken = null;
    mockTokenParam = 'valid-token';
  });

  it('renders the form when a token is present', () => {
    render(<ResetPasswordPage showAlert={showAlert} />);
    expect(screen.getByRole('heading', { name: /reset password/i })).toBeInTheDocument();
    expect(screen.getByLabelText('New password')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm new password')).toBeInTheDocument();
  });

  it('shows a helpful message when the token is missing', () => {
    mockTokenParam = null;
    render(<ResetPasswordPage showAlert={showAlert} />);
    expect(screen.getByText(/missing a reset token/i)).toBeInTheDocument();
    expect(screen.queryByLabelText('New password')).not.toBeInTheDocument();
  });

  it('redirects authenticated users home', () => {
    mockAccessToken = 'tok';
    render(<ResetPasswordPage showAlert={showAlert} />);
    expect(screen.getByTestId('navigate')).toHaveAttribute('data-to', '/');
  });

  it('rejects short passwords client-side', async () => {
    render(<ResetPasswordPage showAlert={showAlert} />);
    // Drive state bypassing HTML minLength so the JS guard is exercised.
    const newPw = screen.getByLabelText('New password');
    const confirmPw = screen.getByLabelText('Confirm new password');
    newPw.removeAttribute('minLength');
    confirmPw.removeAttribute('minLength');
    fireEvent.change(newPw, { target: { value: 'short' } });
    fireEvent.change(confirmPw, { target: { value: 'short' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Reset password' }).closest('form')!);
    await waitFor(() => {
      expect(showAlert).toHaveBeenCalledWith('Password must be at least 8 characters', 'danger');
    });
    expect(mockResetPassword).not.toHaveBeenCalled();
  });

  it('rejects mismatched passwords', async () => {
    render(<ResetPasswordPage showAlert={showAlert} />);
    fireEvent.change(screen.getByLabelText('New password'), {
      target: { value: 'longenough1' },
    });
    fireEvent.change(screen.getByLabelText('Confirm new password'), {
      target: { value: 'different1' },
    });
    fireEvent.submit(screen.getByRole('button', { name: 'Reset password' }).closest('form')!);
    await waitFor(() => {
      expect(showAlert).toHaveBeenCalledWith('Passwords do not match', 'danger');
    });
    expect(mockResetPassword).not.toHaveBeenCalled();
  });

  it('submits and navigates to login on success', async () => {
    mockResetPassword.mockReturnValue({ unwrap: () => Promise.resolve({}) });
    render(<ResetPasswordPage showAlert={showAlert} />);
    fireEvent.change(screen.getByLabelText('New password'), {
      target: { value: 'brand-new-pw' },
    });
    fireEvent.change(screen.getByLabelText('Confirm new password'), {
      target: { value: 'brand-new-pw' },
    });
    fireEvent.submit(screen.getByRole('button', { name: 'Reset password' }).closest('form')!);
    await waitFor(() => {
      expect(mockResetPassword).toHaveBeenCalledWith({
        token: 'valid-token',
        new_password: 'brand-new-pw',
      });
      expect(showAlert).toHaveBeenCalledWith(
        'Password reset successfully. Please sign in.',
        'success'
      );
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });

  it('surfaces backend error detail (invalid/expired token)', async () => {
    mockResetPassword.mockReturnValue({
      unwrap: () =>
        Promise.reject({ status: 400, data: { detail: 'Invalid or expired reset token' } }),
    });
    render(<ResetPasswordPage showAlert={showAlert} />);
    fireEvent.change(screen.getByLabelText('New password'), {
      target: { value: 'brand-new-pw' },
    });
    fireEvent.change(screen.getByLabelText('Confirm new password'), {
      target: { value: 'brand-new-pw' },
    });
    fireEvent.submit(screen.getByRole('button', { name: 'Reset password' }).closest('form')!);
    await waitFor(() => {
      expect(showAlert).toHaveBeenCalledWith('Invalid or expired reset token', 'danger');
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
