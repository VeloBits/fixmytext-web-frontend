import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as Sentry from '@sentry/react';
import { userManager } from './userManager';

// React 19 StrictMode fires useEffect 3+ times per mount via multiple
// doubleInvokeEffectsOnFiber passes. Strategy:
//   - Store the in-flight promise so every subsequent invocation bails early.
//   - Do NOT reset _callbackPromise inside .then() — there's a window between
//     ".then() runs" and "navigate() completes" where doubleInvokeEffectsOnFiber
//     could see null and start another attempt. Keep it truthy until unmount.
//   - On error: reset immediately so the user can retry via "Back to sign in".
//   - Cleanup (= genuine unmount after navigation) resets for future re-logins,
//     but ONLY after the promise has settled; StrictMode cleanups fire before
//     the promise settles and must not reset the guard.
let _callbackPromise: Promise<void> | null = null;
let _callbackSettled = false;

export function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState(false);

  useEffect(() => {
    if (_callbackPromise) return;

    _callbackSettled = false;
    _callbackPromise = userManager
      .signinRedirectCallback()
      .then(() => {
        _callbackSettled = true;
        // Client-side navigation (NOT window.location.replace): a full reload
        // would wipe the just-stored in-memory tokens (H-8). React Router keeps
        // the SPA — and the in-memory user — alive.
        // _callbackPromise intentionally kept non-null here so any StrictMode
        // double-invoke between .then() and unmount sees a truthy guard.
        navigate('/', { replace: true });
      })
      .catch((err) => {
        _callbackSettled = true;
        _callbackPromise = null;
        Sentry.captureException(err);
        console.error('OIDC callback error', err);
        setError(true);
      });

    return () => {
      // StrictMode cleanup fires before the promise settles (_callbackSettled=false)
      // → leave the guard intact so the remount sees a truthy promise and skips.
      // Real unmount fires after navigation (_callbackSettled=true)
      // → reset so a future re-login starts a fresh callback.
      if (_callbackSettled) {
        _callbackPromise = null;
        _callbackSettled = false;
      }
    };
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
