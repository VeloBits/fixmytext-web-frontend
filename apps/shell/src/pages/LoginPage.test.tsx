import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import LoginPage from './LoginPage';

const { mockSigninRedirect } = vi.hoisted(() => ({ mockSigninRedirect: vi.fn() }));

vi.mock('@velobits/app-core/auth/userManager', () => ({
  userManager: { signinRedirect: mockSigninRedirect },
}));

vi.mock('@/components/layout/PageSkeleton', () => ({
  default: () => <div data-testid="page-skeleton" />,
}));

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSigninRedirect.mockResolvedValue(undefined);
  });

  it('calls signinRedirect on mount and shows the skeleton', () => {
    render(<LoginPage />);
    expect(mockSigninRedirect).toHaveBeenCalledTimes(1);
    // LoginPage calls signinRedirect() with no arguments (plain hosted login).
    expect(mockSigninRedirect).toHaveBeenCalledWith();
    expect(screen.getByTestId('page-skeleton')).toBeInTheDocument();
  });

  it('renders an error state with a Try again button when the redirect fails', async () => {
    mockSigninRedirect.mockRejectedValueOnce(new Error('Keycloak unreachable'));
    render(<LoginPage />);

    // Error card replaces the skeleton.
    expect(await screen.findByText(/couldn.t reach sign-in\. please try again/i)).toBeInTheDocument();
    const retry = screen.getByRole('button', { name: /try again/i });
    expect(retry).toBeInTheDocument();

    // Clicking "Try again" re-invokes the redirect; on success the skeleton returns.
    mockSigninRedirect.mockResolvedValueOnce(undefined);
    fireEvent.click(retry);
    expect(mockSigninRedirect).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(screen.getByTestId('page-skeleton')).toBeInTheDocument());
  });
});
