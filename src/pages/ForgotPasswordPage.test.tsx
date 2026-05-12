import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ForgotPasswordPage from './ForgotPasswordPage';

const mockForgotPassword = vi.fn();
let mockAccessToken: string | null = null;

vi.mock('react-router-dom', () => ({
  Link: ({ children, to, ...props }) => React.createElement('a', { href: to, ...props }, children),
  Navigate: ({ to }) => <div data-testid="navigate" data-to={to} />,
}));

vi.mock('react-redux', () => ({
  useSelector: vi.fn((fn) => fn({ auth: { accessToken: mockAccessToken } })),
  useDispatch: () => vi.fn(),
}));

vi.mock('../store/api/authApi', () => ({
  useForgotPasswordMutation: () => [mockForgotPassword, { isLoading: false }],
}));

vi.mock('../constants', () => ({
  ROUTES: {
    HOME: '/',
    LOGIN: '/login',
    FORGOT_PASSWORD: '/forgot-password',
    RESET_PASSWORD: '/reset-password',
  },
}));

describe('ForgotPasswordPage', () => {
  const showAlert = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockAccessToken = null;
  });

  it('renders the form', () => {
    render(<ForgotPasswordPage showAlert={showAlert} />);
    expect(screen.getByRole('heading', { name: /forgot password/i })).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send reset link' })).toBeInTheDocument();
  });

  it('redirects authenticated users home', () => {
    mockAccessToken = 'tok';
    render(<ForgotPasswordPage showAlert={showAlert} />);
    expect(screen.getByTestId('navigate')).toHaveAttribute('data-to', '/');
  });

  it('submits and shows the enumeration-safe success message', async () => {
    mockForgotPassword.mockReturnValue({
      unwrap: () => Promise.resolve({ detail: 'ok', reset_token: 'xyz' }),
    });
    render(<ForgotPasswordPage showAlert={showAlert} />);
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'user@example.com' },
    });
    fireEvent.submit(screen.getByRole('button', { name: 'Send reset link' }).closest('form')!);
    await waitFor(() => {
      expect(mockForgotPassword).toHaveBeenCalledWith({ email: 'user@example.com' });
      expect(showAlert).toHaveBeenCalledWith(
        'If that email is registered, we have sent a reset link.',
        'success'
      );
    });
    // After submission, the form is swapped for the confirmation panel.
    expect(screen.getByText(/reset link is on its way/i)).toBeInTheDocument();
  });

  it('surfaces a 429 rate-limit error distinctly', async () => {
    mockForgotPassword.mockReturnValue({
      unwrap: () => Promise.reject({ status: 429, data: { detail: 'Rate limit' } }),
    });
    render(<ForgotPasswordPage showAlert={showAlert} />);
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'spam@example.com' },
    });
    fireEvent.submit(screen.getByRole('button', { name: 'Send reset link' }).closest('form')!);
    await waitFor(() => {
      expect(showAlert).toHaveBeenCalledWith(
        'Too many attempts. Please try again in a minute.',
        'danger'
      );
    });
  });

  it('shows a generic error on unexpected failure', async () => {
    mockForgotPassword.mockReturnValue({ unwrap: () => Promise.reject({}) });
    render(<ForgotPasswordPage showAlert={showAlert} />);
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'user@example.com' },
    });
    fireEvent.submit(screen.getByRole('button', { name: 'Send reset link' }).closest('form')!);
    await waitFor(() => {
      expect(showAlert).toHaveBeenCalledWith(
        'Could not send reset link. Please try again.',
        'danger'
      );
    });
  });
});
