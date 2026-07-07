import { useEffect } from 'react';
import { userManager } from './userManager';

export function AuthCallback() {
  useEffect(() => {
    userManager
      .signinRedirectCallback()
      .then(() => {
        window.location.replace('/');
      })
      .catch((err) => {
        console.error('OIDC callback error', err);
        window.location.replace('/login');
      });
  }, []);

  return (
    <div className="flex h-screen items-center justify-center">
      <p className="text-muted-foreground">Signing in…</p>
    </div>
  );
}
