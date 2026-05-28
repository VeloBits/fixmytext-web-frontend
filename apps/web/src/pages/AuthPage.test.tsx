import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AuthPage } from './AuthPage';

const mockNavigate = vi.fn();
let mockIsAuthenticated = false;
let mockIsLoading = false;

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('@/auth/useOidcAuth', () => ({
  useOidcAuth: vi.fn(() => ({
    isAuthenticated: mockIsAuthenticated,
    isLoading: mockIsLoading,
    accessToken: null,
    oidcUser: null,
    login: vi.fn(),
    logout: vi.fn(),
  })),
}));

vi.mock('@/auth/userManager', () => ({
  userManager: { signinRedirect: vi.fn() },
}));

vi.mock('@/components/auth/LoginForm', () => ({
  LoginForm: ({ onSuccess }: { onSuccess?: () => void }) =>
    React.createElement('div', { 'data-testid': 'login-form' },
      React.createElement('button', { 'data-testid': 'trigger-success', onClick: onSuccess }, 'Login')
    ),
}));

vi.mock('@/components/auth/SignupForm', () => ({
  SignupForm: ({ onSuccess }: { onSuccess?: () => void }) =>
    React.createElement('div', { 'data-testid': 'signup-form' },
      React.createElement('button', { 'data-testid': 'trigger-success', onClick: onSuccess }, 'Signup')
    ),
}));

vi.mock('@/components/auth/SocialButtons', () => ({
  SocialButtons: () => React.createElement('div', { 'data-testid': 'social-buttons' }),
}));

describe('AuthPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAuthenticated = false;
    mockIsLoading = false;
  });

  it('renders null when isLoading is true', () => {
    mockIsLoading = true;
    const { container } = render(<AuthPage />);
    expect(container.firstChild).toBeNull();
  });

  it('shows sign-in form by default', () => {
    render(<AuthPage />);
    expect(screen.getByTestId('login-form')).toBeInTheDocument();
  });

  it('shows sign-up form when defaultTab is signup', () => {
    render(<AuthPage defaultTab="signup" />);
    expect(screen.getByTestId('signup-form')).toBeInTheDocument();
  });

  it('switching to signup tab shows signup form', () => {
    render(<AuthPage />);
    fireEvent.click(screen.getByRole('tab', { name: 'Sign up' }));
    expect(screen.getByTestId('signup-form')).toBeInTheDocument();
  });

  it('switching back to signin tab shows login form', () => {
    render(<AuthPage defaultTab="signup" />);
    fireEvent.click(screen.getByRole('tab', { name: 'Sign in' }));
    expect(screen.getByTestId('login-form')).toBeInTheDocument();
  });

  it('handleSuccess navigates to home when login form succeeds', () => {
    render(<AuthPage />);
    fireEvent.click(screen.getByTestId('trigger-success'));
    expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
  });

  it('handleSuccess navigates to home when signup form succeeds', () => {
    render(<AuthPage defaultTab="signup" />);
    fireEvent.click(screen.getByTestId('trigger-success'));
    expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
  });
});
