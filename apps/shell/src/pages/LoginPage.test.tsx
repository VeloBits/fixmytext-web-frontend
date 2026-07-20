import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import LoginPage from './LoginPage';

const { mockSigninRedirect, mockNavigate } = vi.hoisted(() => ({
  mockSigninRedirect: vi.fn(),
  mockNavigate: vi.fn(),
}));

vi.mock('@velobits/app-core/auth/userManager', () => ({
  hasAuthHint: vi.fn(() => false), // no persisted session hint in tests
  userManager: { signinRedirect: mockSigninRedirect },
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useSearchParams: () => [new URLSearchParams(window.location.search)],
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
    // No ?returnTo= in the test URL → plain hosted login without OIDC state.
    expect(mockSigninRedirect).toHaveBeenCalledWith(undefined);
    expect(screen.getByTestId('page-skeleton')).toBeInTheDocument();
  });

  it('renders an error state with a Try again button when the redirect fails', async () => {
    mockSigninRedirect.mockRejectedValueOnce(new Error('Keycloak unreachable'));
    render(<LoginPage />);

    // Error card replaces the skeleton.
    expect(
      await screen.findByText(/couldn.t reach sign-in\. please try again/i)
    ).toBeInTheDocument();
    const retry = screen.getByRole('button', { name: /try again/i });
    expect(retry).toBeInTheDocument();

    // Clicking "Try again" re-invokes the redirect; on success the skeleton returns.
    mockSigninRedirect.mockResolvedValueOnce(undefined);
    fireEvent.click(retry);
    expect(mockSigninRedirect).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(screen.getByTestId('page-skeleton')).toBeInTheDocument());
  });

  it('returns to the guest home when restored from the back/forward cache', () => {
    render(<LoginPage />);
    expect(mockNavigate).not.toHaveBeenCalled();

    // Browser Back from Keycloak = bfcache restore = pageshow with persisted=true.
    const restore = new Event('pageshow');
    Object.defineProperty(restore, 'persisted', { value: true });
    fireEvent(window, restore);

    expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
  });

  it('does not navigate away on a normal (non-restored) pageshow', () => {
    render(<LoginPage />);

    const initialShow = new Event('pageshow');
    Object.defineProperty(initialShow, 'persisted', { value: false });
    fireEvent(window, initialShow);

    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
