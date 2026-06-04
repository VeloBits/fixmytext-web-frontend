import React from 'react';
import { render, screen } from '@testing-library/react';
import SignupPage from './SignupPage';

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
  userManager: {
    signinRedirect: vi.fn(),
  },
}));

// Mock auth form sub-components to avoid unrelated dependency errors
vi.mock('@/components/auth/LoginForm', () => ({
  LoginForm: () => <div data-testid="login-form">Login Form</div>,
}));
vi.mock('@/components/auth/SignupForm', () => ({
  SignupForm: () => <div data-testid="signup-form">Signup Form</div>,
}));
vi.mock('@/components/auth/SocialButtons', () => ({
  SocialButtons: () => <div data-testid="social-buttons">Social Buttons</div>,
}));

describe('SignupPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAuthenticated = false;
    mockIsLoading = false;
  });

  it('renders the auth page with sign-up tab active', () => {
    render(<SignupPage />);
    // SignupPage renders AuthPage with defaultTab="signup"
    expect(screen.getByRole('tab', { name: 'Sign up' })).toBeInTheDocument();
    expect(screen.getByTestId('signup-form')).toBeInTheDocument();
  });

  it('navigates home when already authenticated', async () => {
    mockIsAuthenticated = true;
    render(<SignupPage />);
    await vi.waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
    });
  });
});
