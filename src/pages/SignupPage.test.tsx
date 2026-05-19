import React from 'react';
import { render, screen } from '@testing-library/react';
import SignupPage from './SignupPage';

const mockNavigate = vi.fn();
let mockIsAuthenticated = false;

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('@/auth/useOidcAuth', () => ({
  useOidcAuth: () => ({ isAuthenticated: mockIsAuthenticated }),
}));

vi.mock('@/auth/userManager', () => ({
  userManager: {
    signinRedirect: vi.fn(),
  },
}));

describe('SignupPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAuthenticated = false;
  });

  it('renders redirecting message', () => {
    render(<SignupPage />);
    expect(screen.getByText(/Redirecting to sign up/i)).toBeInTheDocument();
  });

  it('navigates home when already authenticated', async () => {
    mockIsAuthenticated = true;
    render(<SignupPage />);
    await vi.waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });
});
