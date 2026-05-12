import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ProfileSection from './ProfileSection';
import type { GamificationContextValue, User } from '@/contexts/AppContext';

const mockResendVerification = vi.fn();

vi.mock('@/store/api/authApi', () => ({
  useResendVerificationMutation: () => [mockResendVerification, { isLoading: false }],
}));

vi.mock('@/constants/tools', () => ({
  PERSONAS: {
    writer: { label: 'Writer', icon: 'W' },
  },
}));

interface RenderProfileOptions {
  user?: Partial<User> | null;
  isAuthenticated?: boolean;
}

function renderProfile({ user, isAuthenticated = true }: RenderProfileOptions = {}) {
  const g = { persona: 'writer', setPersona: vi.fn() } as unknown as GamificationContextValue;
  return render(
    <ProfileSection
      user={(user ?? null) as User | null}
      isAuthenticated={isAuthenticated}
      g={g}
      mode="dark"
      setMode={vi.fn()}
      showAlert={vi.fn()}
    />
  );
}

describe('ProfileSection — email verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows "Verified" badge for verified users and omits the verify card', () => {
    renderProfile({
      user: { email: 'a@b.c', display_name: 'A', is_email_verified: true } as Partial<User>,
    });
    expect(screen.getByText('Verified')).toBeInTheDocument();
    expect(screen.queryByText('Verify your email')).not.toBeInTheDocument();
  });

  it('shows "Not verified" badge and a resend card for unverified users', () => {
    renderProfile({
      user: {
        email: 'new@example.com',
        display_name: 'New',
        is_email_verified: false,
      } as Partial<User>,
    });
    expect(screen.getByText('Not verified')).toBeInTheDocument();
    expect(screen.getByText('Verify your email')).toBeInTheDocument();
    // Email appears in the header and inside the verify card copy.
    expect(screen.getAllByText('new@example.com').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Resend verification email' })).toBeInTheDocument();
  });

  it('does not show any verification badge for guest (unauthenticated) users', () => {
    renderProfile({ user: null, isAuthenticated: false });
    expect(screen.queryByText('Verified')).not.toBeInTheDocument();
    expect(screen.queryByText('Not verified')).not.toBeInTheDocument();
    expect(screen.queryByText('Verify your email')).not.toBeInTheDocument();
  });

  it('resend button sends the request and goes into cooldown on success', async () => {
    mockResendVerification.mockReturnValue({ unwrap: () => Promise.resolve({}) });

    const showAlertLocal = vi.fn();
    const user = {
      email: 'x@example.com',
      display_name: 'X',
      is_email_verified: false,
    } as User;
    render(
      <ProfileSection
        user={user}
        isAuthenticated
        g={{ persona: 'writer', setPersona: vi.fn() } as unknown as GamificationContextValue}
        mode="dark"
        setMode={vi.fn()}
        showAlert={showAlertLocal}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Resend verification email' }));

    await waitFor(() => {
      expect(mockResendVerification).toHaveBeenCalled();
      expect(showAlertLocal).toHaveBeenCalledWith(
        'Verification email sent. Check your inbox and spam folder.',
        'success'
      );
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /resend in \d+s/i })).toBeDisabled();
    });
  });

  it('parses backend 429 "wait N seconds" into a cooldown label', async () => {
    mockResendVerification.mockReturnValue({
      unwrap: () =>
        Promise.reject({
          status: 429,
          data: { detail: 'Please wait 30 seconds before requesting another.' },
        }),
    });
    const showAlertLocal = vi.fn();
    render(
      <ProfileSection
        user={{
          email: 'x@example.com',
          display_name: 'X',
          is_email_verified: false,
        } as User}
        isAuthenticated
        g={{ persona: 'writer', setPersona: vi.fn() } as unknown as GamificationContextValue}
        mode="dark"
        setMode={vi.fn()}
        showAlert={showAlertLocal}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Resend verification email' }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /resend in (29|30)s/i })).toBeDisabled();
      expect(showAlertLocal).toHaveBeenCalledWith(
        'Please wait 30 seconds before requesting another.',
        'warning'
      );
    });
  });
});
