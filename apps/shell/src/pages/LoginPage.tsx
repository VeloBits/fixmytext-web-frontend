import { useCallback, useEffect, useState } from 'react';
import * as Sentry from '@sentry/react';
import { userManager } from '@velobits/app-core/auth/userManager';
import PageSkeleton from '@/components/layout/PageSkeleton';
import '@/assets/css/auth.css';

export function LoginPage() {
  const [error, setError] = useState(false);

  // Kick off the redirect to Keycloak's hosted login. If Keycloak is
  // unreachable the promise rejects — surface an error card with a retry
  // instead of stranding the user on a skeleton forever.
  const redirect = useCallback(() => {
    setError(false);
    userManager.signinRedirect().catch((err) => {
      Sentry.captureException(err);
      console.error('signinRedirect (login) failed', err);
      setError(true);
    });
  }, []);

  useEffect(() => {
    redirect();
  }, [redirect]);

  if (error) {
    return (
      <div className="auth-page">
        <div className="auth-card auth-card--status" role="alert">
          <div className="auth-status auth-status--error" aria-hidden="true">
            !
          </div>
          <h1 className="auth-title">Couldn&apos;t reach sign-in</h1>
          <p className="auth-subtitle">Couldn&apos;t reach sign-in. Please try again.</p>
          <button type="button" className="auth-btn auth-btn--primary" onClick={redirect}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  return <PageSkeleton />;
}

export default LoginPage;
