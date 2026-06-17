import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as Sentry from '@sentry/react';
import { userManager } from './userManager';

export function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState(false);

  useEffect(() => {
    userManager
      .signinRedirectCallback()
      .then(() => {
        // Client-side navigation (NOT window.location.replace): a full reload
        // would wipe the just-stored in-memory tokens (H-8). React Router keeps
        // the SPA — and the in-memory user — alive.
        navigate('/', { replace: true });
      })
      .catch((err) => {
        Sentry.captureException(err);
        console.error('OIDC callback error', err);
        // Don't silently bounce to /login — show an explicit error so the user
        // understands sign-in failed (e.g. expired/invalid state, Keycloak down)
        // rather than being looped back to a login page with no context.
        setError(true);
      });
  }, [navigate]);

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">We couldn&apos;t complete sign-in.</p>
          <button
            type="button"
            className="mt-3 underline"
            onClick={() => navigate('/login', { replace: true })}
          >
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen items-center justify-center">
      <p className="text-muted-foreground">Signing in…</p>
    </div>
  );
}
