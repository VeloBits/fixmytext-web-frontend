import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import * as Sentry from '@sentry/react';
import { userManager } from '@velobits/app-core/auth/userManager';
import PageSkeleton from '@/components/layout/PageSkeleton';
import '@/assets/css/auth.css';

// Same rule AuthCallback enforces on the way back: only same-origin
// router-relative paths may ride along as the post-login destination.
function isSafeReturnTo(p: string | null): p is string {
  return (
    typeof p === 'string' &&
    p.startsWith('/') &&
    !p.startsWith('//') &&
    !p.startsWith('/\\') &&
    !p.includes('://')
  );
}

export function LoginPage() {
  const [error, setError] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // Depend on the extracted string, not the params object, so the redirect
  // effect never re-fires from a mere object-identity change.
  const returnTo = searchParams.get('returnTo');

  // Kick off the redirect to Keycloak's hosted login. If Keycloak is
  // unreachable the promise rejects — surface an error card with a retry
  // instead of stranding the user on a skeleton forever.
  const redirect = useCallback(() => {
    setError(false);
    userManager
      .signinRedirect(isSafeReturnTo(returnTo) ? { state: { returnTo } } : undefined)
      .catch((err) => {
        Sentry.captureException(err);
        console.error('signinRedirect (login) failed', err);
        setError(true);
      });
  }, [returnTo]);

  useEffect(() => {
    redirect();
  }, [redirect]);

  // Browser Back from the Keycloak page restores this page from the
  // back/forward cache: effects don't re-run, so the redirect above never
  // re-fires and the skeleton would sit frozen forever. pageshow with
  // persisted=true is exactly that restore — the user backed out of
  // sign-in, so return them to the guest home instead of re-trapping them.
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

export default LoginPage;
