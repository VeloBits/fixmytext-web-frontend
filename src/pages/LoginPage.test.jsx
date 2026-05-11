import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginPage from './LoginPage';
import { expectNoA11yViolations } from '../test/axeHelper';

const mockNavigate = vi.fn();
const mockLogin = vi.fn();
let mockAccessToken = null;

vi.mock('react-router-dom', () => ({
  Link: ({ children, to, ...props }) => React.createElement('a', { href: to, ...props }, children),
  useNavigate: () => mockNavigate,
  Navigate: ({ to }) => <div data-testid="navigate" data-to={to} />,
}));

vi.mock('react-redux', () => ({
  useSelector: vi.fn((fn) => fn({ auth: { accessToken: mockAccessToken } })),
  useDispatch: () => vi.fn(),
}));

vi.mock('../store/api/authApi', () => ({
  useLoginMutation: () => [mockLogin, { isLoading: false }],
}));

vi.mock('../constants', () => ({
  ROUTES: {
    HOME: '/',
    SIGNUP: '/signup',
    LOGIN: '/login',
    FORGOT_PASSWORD: '/forgot-password',
  },
}));

describe('LoginPage', () => {
  const showAlert = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockAccessToken = null;
  });

  it('renders login form', () => {
    render(<LoginPage showAlert={showAlert} />);
    expect(screen.getByText('Welcome Back')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByText('Sign In')).toBeInTheDocument();
  });

  it('renders sign up link', () => {
    render(<LoginPage showAlert={showAlert} />);
    expect(screen.getByText('Sign up')).toBeInTheDocument();
    expect(screen.getByText('Sign up').closest('a')).toHaveAttribute('href', '/signup');
  });

  it('renders forgot-password link', () => {
    render(<LoginPage showAlert={showAlert} />);
    const link = screen.getByText('Forgot password?');
    expect(link).toBeInTheDocument();
    expect(link.closest('a')).toHaveAttribute('href', '/forgot-password');
  });

  it('redirects when already authenticated', () => {
    mockAccessToken = 'token123';
    render(<LoginPage showAlert={showAlert} />);
    expect(screen.getByTestId('navigate')).toHaveAttribute('data-to', '/');
  });

  it('updates email and password fields', () => {
    render(<LoginPage showAlert={showAlert} />);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
    expect(screen.getByLabelText('Email')).toHaveValue('test@example.com');
    expect(screen.getByLabelText('Password')).toHaveValue('password123');
  });

  it('toggles password visibility', () => {
    render(<LoginPage showAlert={showAlert} />);
    const passwordInput = screen.getByLabelText('Password');
    expect(passwordInput).toHaveAttribute('type', 'password');
    fireEvent.click(screen.getByLabelText('Show password'));
    expect(passwordInput).toHaveAttribute('type', 'text');
    fireEvent.click(screen.getByLabelText('Hide password'));
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('toggles remember me checkbox', () => {
    render(<LoginPage showAlert={showAlert} />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).not.toBeChecked();
    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();
  });

  it('submits form successfully', async () => {
    mockLogin.mockReturnValue({ unwrap: () => Promise.resolve({}) });
    render(<LoginPage showAlert={showAlert} />);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'pass1234' } });
    fireEvent.submit(screen.getByText('Sign In').closest('form'));
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'pass1234',
        remember_me: false,
      });
      expect(showAlert).toHaveBeenCalledWith('Logged in successfully', 'success');
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('shows error on login failure', async () => {
    mockLogin.mockReturnValue({ unwrap: () => Promise.reject({ data: { detail: 'Bad creds' } }) });
    render(<LoginPage showAlert={showAlert} />);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrong' } });
    fireEvent.submit(screen.getByText('Sign In').closest('form'));
    await waitFor(() => {
      expect(showAlert).toHaveBeenCalledWith('Bad creds', 'danger');
    });
  });

  it('shows generic error when no detail', async () => {
    mockLogin.mockReturnValue({ unwrap: () => Promise.reject({}) });
    render(<LoginPage showAlert={showAlert} />);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrong' } });
    fireEvent.submit(screen.getByText('Sign In').closest('form'));
    await waitFor(() => {
      expect(showAlert).toHaveBeenCalledWith(
        'Login failed. Please check your credentials.',
        'danger'
      );
    });
  });

  it('has no axe violations', async () => {
    const { container } = render(<LoginPage showAlert={showAlert} />);
    await expectNoA11yViolations(container);
  });
});
