import { useState } from 'react';
import { userManager } from '@velobits/app-core/auth/userManager';

/**
 * Sign-up entry point. H-9: registration happens on Keycloak's hosted page, not
 * in the SPA. `prompt=create` lands the user on Keycloak's registration form
 * (Keycloak 21+); older versions show the login page, which links to "Register".
 * The account is created in Keycloak and JIT-provisioned in the backend on first
 * authenticated request — so the SPA never handles the password.
 */
export function SignupForm() {
  const [error, setError] = useState<string | null>(null);

  const onSignUp = async () => {
    setError(null);
    try {
      await userManager.signinRedirect({ extraQueryParams: { prompt: 'create' } });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not start sign-up. Please try again.',
      );
    }
  };

  return (
    <div className="auth-form">
      <p className="auth-redirect-note">
        Create your account securely on the VeloBits account page.
      </p>

      {error && (
        <div className="auth-hint--weak" role="alert">
          {error}
        </div>
      )}

      <button type="button" className="auth-btn--primary" onClick={onSignUp}>
        Create account
      </button>
    </div>
  );
}
