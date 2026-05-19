import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { userManager } from '@/auth/userManager';
import { useOidcAuth } from '@/auth/useOidcAuth';

export default function SignupPage() {
  const { isAuthenticated } = useOidcAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    } else {
      // Keycloak self-registration: redirect to Keycloak login page which has a "Register" link
      userManager.signinRedirect();
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="flex h-screen items-center justify-center">
      <p className="text-muted-foreground">Redirecting to sign up…</p>
    </div>
  );
}
