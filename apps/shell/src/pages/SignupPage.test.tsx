import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import SignupPage from './SignupPage';

const { mockSigninRedirect, mockNavigate } = vi.hoisted(() => ({
  mockSigninRedirect: vi.fn(),
  mockNavigate: vi.fn(),
}));

vi.mock('@velobits/app-core/auth/userManager', () => ({
  hasAuthHint: vi.fn(() => false), // no persisted session hint in tests
  signupUserManager: { signinRedirect: mockSigninRedirect },
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('@/components/layout/PageSkeleton', () => ({
  default: () => <div data-testid="page-skeleton" />,
}));

describe('SignupPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSigninRedirect.mockResolvedValue(undefined);
  });

  it('starts the registration redirect on mount and shows the skeleton', () => {
    render(<SignupPage />);
    expect(mockSigninRedirect).toHaveBeenCalledTimes(1);
    // signupUserManager targets Keycloak's /registrations endpoint, so the
    // call takes no args (no prompt=create — that param is ignored by Keycloak).
    expect(mockSigninRedirect).toHaveBeenCalledWith();
    expect(screen.getByTestId('page-skeleton')).toBeInTheDocument();
  });

  it('renders an error state with a Try again button when the redirect fails', async () => {
    mockSigninRedirect.mockRejectedValueOnce(new Error('Keycloak unreachable'));
    render(<SignupPage />);

    expect(
      await screen.findByText(/couldn.t reach sign-in\. please try again/i)
    ).toBeInTheDocument();
    const retry = screen.getByRole('button', { name: /try again/i });
    expect(retry).toBeInTheDocument();

    // Retry re-invokes the registration redirect.
    mockSigninRedirect.mockResolvedValueOnce(undefined);
    fireEvent.click(retry);
    expect(mockSigninRedirect).toHaveBeenCalledTimes(2);
    expect(mockSigninRedirect).toHaveBeenLastCalledWith();
    await waitFor(() => expect(screen.getByTestId('page-skeleton')).toBeInTheDocument());
  });

  it('returns to the guest home when restored from the back/forward cache', () => {
    render(<SignupPage />);
    expect(mockNavigate).not.toHaveBeenCalled();

    // Browser Back from the Keycloak registration form = bfcache restore.
    const restore = new Event('pageshow');
    Object.defineProperty(restore, 'persisted', { value: true });
    fireEvent(window, restore);

    expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
  });

  it('does not navigate away on a normal (non-restored) pageshow', () => {
    render(<SignupPage />);

    const initialShow = new Event('pageshow');
    Object.defineProperty(initialShow, 'persisted', { value: false });
    fireEvent(window, initialShow);

    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
