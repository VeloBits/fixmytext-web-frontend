import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ProfileSection from './ProfileSection';
import type { PersonaContextValue, User } from '@velobits/app-core/types/context';

const mockResendVerification = vi.fn();

vi.mock('@velobits/app-core/store/api/authApi', () => ({
  useResendVerificationMutation: () => [mockResendVerification, { isLoading: false }],
}));

vi.mock('@velobits/app-core/constants/tools', () => ({
  PERSONAS: {
    writer: { label: 'Writer', icon: 'W' },
  },
}));

interface RenderProfileOptions {
  user?: Partial<User> | null;
  isAuthenticated?: boolean;
}

function renderProfile({ user, isAuthenticated = true }: RenderProfileOptions = {}) {
  const persona = {
    persona: 'writer',
    setPersona: vi.fn(),
    onboarded: true,
  } as unknown as PersonaContextValue;
  return render(
    <ProfileSection
      user={(user ?? null) as User | null}
      isAuthenticated={isAuthenticated}
      persona={persona}
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

  it('resend button shows Keycloak redirect message', async () => {
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
        persona={
          { persona: 'writer', setPersona: vi.fn(), onboarded: true } as unknown as PersonaContextValue
        }
        mode="dark"
        setMode={vi.fn()}
        showAlert={showAlertLocal}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Resend verification email' }));

    await waitFor(() => {
      expect(showAlertLocal).toHaveBeenCalledWith(
        'Please check your Keycloak account to resend the verification email.',
        'info'
      );
    });
    // No cooldown in new implementation
    expect(screen.getByRole('button', { name: 'Resend verification email' })).not.toBeDisabled();
  });

  it('parses backend 429 "wait N seconds" into a cooldown label', async () => {
    const showAlertLocal = vi.fn();
    render(
      <ProfileSection
        user={
          {
            email: 'x@example.com',
            display_name: 'X',
            is_email_verified: false,
          } as User
        }
        isAuthenticated
        persona={
          { persona: 'writer', setPersona: vi.fn(), onboarded: true } as unknown as PersonaContextValue
        }
        mode="dark"
        setMode={vi.fn()}
        showAlert={showAlertLocal}
      />
    );

    // New behavior: no API call, no 429. Just shows Keycloak message.
    fireEvent.click(screen.getByRole('button', { name: 'Resend verification email' }));
    await waitFor(() => {
      expect(showAlertLocal).toHaveBeenCalledWith(
        'Please check your Keycloak account to resend the verification email.',
        'info'
      );
    });
    // No countdown/cooldown in new Keycloak-based flow
    expect(screen.queryByRole('button', { name: /resend in \d+s/i })).not.toBeInTheDocument();
  });
});

describe('ProfileSection — persona picker (persona prop)', () => {
  it('marks the active persona and calls setPersona from the persona prop', () => {
    const setPersona = vi.fn();
    const showAlert = vi.fn();
    render(
      <ProfileSection
        user={null}
        isAuthenticated={false}
        persona={{ persona: null, setPersona, onboarded: false } as unknown as PersonaContextValue}
        mode="dark"
        setMode={vi.fn()}
        showAlert={showAlert}
      />
    );
    fireEvent.click(screen.getByText('Writer'));
    expect(setPersona).toHaveBeenCalledWith('writer');
    expect(showAlert).toHaveBeenCalledWith('Persona changed to Writer', 'success');
  });
});
