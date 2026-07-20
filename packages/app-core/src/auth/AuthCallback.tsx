import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as Sentry from '@sentry/react';
import { ErrorResponse } from 'oidc-client-ts';
import { broadcastAuthMessage, hasAuthHint, userManager } from './userManager';

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

/**
 * Accept only same-origin router-relative paths from the OIDC state: must be a
 * string starting with a single "/" (no protocol-relative "//", no "/\\" IE
 * quirk, no absolute URLs). Anything else falls back to "/".
 */
function isSafeReturnTo(p: unknown): p is string {
  return (
    typeof p === 'string' &&
    p.startsWith('/') &&
    !p.startsWith('//') &&
    !p.startsWith('/\\') &&
    !p.includes('://')
  );
}

export function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState(false);

  useEffect(() => {
    if (_callbackPromise) return;

    _callbackSettled = false;
    _callbackPromise = userManager
      .signinRedirectCallback()
      .then((user) => {
        _callbackSettled = true;
        // Notify other open tabs so they silently acquire tokens without a
        // page refresh. Only the initiating tab broadcasts — silent renewals
        // triggered by this message do not re-broadcast, avoiding a loop.
        broadcastAuthMessage({ type: 'user_loaded' });
        // Client-side navigation (NOT window.location.replace): a full reload
        // would wipe the just-stored in-memory tokens (H-8). React Router keeps
        // the SPA — and the in-memory user — alive.
        // _callbackPromise intentionally kept non-null here so any StrictMode
        // double-invoke between .then() and unmount sees a truthy guard.
        const returnTo = (user?.state as { returnTo?: unknown } | undefined)?.returnTo;
        navigate(isSafeReturnTo(returnTo) ? returnTo : '/', { replace: true });
      })
      .catch((err) => {
        _callbackSettled = true;
        _callbackPromise = null;
        // A reloaded/replayed callback URL fails here ("No matching state
        // found in storage") because the state was already consumed by the
        // successful pass. When this browser has a session (auth hint set),
        // bounce home with a FULL page load — unlike the success path there
        // are no in-memory tokens to preserve, and loadUser() short-circuits
        // (and caches null) while on a callback route, so a client-side
        // navigate would land home still looking signed out. The fresh load
        // restores the session silently from the Keycloak SSO cookie.
        if (hasAuthHint()) {
          console.warn('OIDC callback replay detected — recovering via existing session', err);
          window.location.replace(window.location.pathname.replace(/auth\/callback.*/, ''));
          return;
        }
        // Keycloak redirects here with error=access_denied when the user
        // backs out of the login/registration screen. A change of mind, not
        // a failure — land on the guest home instead of an error card. A
        // guest has no session to restore (the hint case returned above), so
        // a client-side navigate is enough.
        if (err instanceof ErrorResponse && err.error === 'access_denied') {
          navigate('/', { replace: true });
          return;
        }
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
