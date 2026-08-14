import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as Sentry from '@sentry/react';
import { signupUserManager } from '@velobits/app-core/auth/userManager';
import PageSkeleton from '@/components/layout/PageSkeleton';
import '@/assets/css/auth.css';

export function SignupPage() {
  const [error, setError] = useState(false);
  const navigate = useNavigate();

  // Kick off the redirect to Keycloak's hosted registration form via the
  // dedicated `/registrations` endpoint (signupUserManager). If Keycloak is
  // unreachable the promise rejects - surface an error card with a retry
  // instead of stranding the user on a skeleton forever.
  const redirect = useCallback(() => {
    setError(false);
    signupUserManager.signinRedirect().catch((err) => {
      Sentry.captureException(err);
      console.error('signinRedirect (signup) failed', err);
      setError(true);
    });
  }, []);

  useEffect(() => {
    redirect();
  }, [redirect]);

  // Browser Back from the Keycloak registration form restores this page from
  // the back/forward cache: effects don't re-run, so the redirect above never
  // re-fires and the skeleton would sit frozen forever. pageshow with
  // persisted=true is exactly that restore - the user backed out of
  // sign-up, so return them to the guest home instead of re-trapping them.
  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) navigate('/', { replace: true });
    };
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, [navigate]);

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

export default SignupPage;
