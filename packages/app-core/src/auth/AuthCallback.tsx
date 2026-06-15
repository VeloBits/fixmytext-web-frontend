import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { userManager } from './userManager';

export function AuthCallback() {
  const navigate = useNavigate();

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
        console.error('OIDC callback error', err);
        navigate('/login', { replace: true });
      });
  }, [navigate]);

  return (
    <div className="flex h-screen items-center justify-center">
      <p className="text-muted-foreground">Signing in…</p>
    </div>
  );
}
