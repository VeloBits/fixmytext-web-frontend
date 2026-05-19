import React from 'react';
import { render, screen } from '@testing-library/react';
import LoginPage from './LoginPage';

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

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAuthenticated = false;
  });

  it('renders redirecting message', () => {
    render(<LoginPage />);
    expect(screen.getByText(/Redirecting to login/i)).toBeInTheDocument();
  });

  it('navigates home when already authenticated', async () => {
    mockIsAuthenticated = true;
    render(<LoginPage />);
    // useEffect with navigate('/') should fire
    await vi.waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });
});
