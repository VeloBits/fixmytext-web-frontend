import { useState } from 'react';
import { userManager } from '@velobits/app-core/auth/userManager';

/**
 * Sign-in entry point. H-9: the SPA no longer collects email/password — sign-in
 * happens on Keycloak's hosted login page (which owns the credential and runs
 * MFA / brute-force protection), reached via signinRedirect — the same flow the
 * social buttons use.
 */
export function LoginForm() {
  const [error, setError] = useState<string | null>(null);

  const onSignIn = async () => {
    setError(null);
    try {
      await userManager.signinRedirect();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not start sign-in. Please try again.',
      );
    }
  };

  return (
    <div className="auth-form">
      <p className="auth-redirect-note">
        You&apos;ll sign in securely on the VeloBits account page.
      </p>

      {error && (
        <div className="auth-hint--weak" role="alert">
          {error}
        </div>
      )}

      <button type="button" className="auth-btn--primary" onClick={onSignIn}>
        Sign in
      </button>
    </div>
  );
}
