import { useEffect } from 'react';
import '@/assets/css/auth.css';

const KEYCLOAK_URL = import.meta.env.VITE_KEYCLOAK_URL ?? 'http://localhost:8080';
const KEYCLOAK_REALM = import.meta.env.VITE_KEYCLOAK_REALM ?? 'fixmytext';
const KEYCLOAK_CLIENT_ID = import.meta.env.VITE_KEYCLOAK_CLIENT_ID ?? 'fixmytext-frontend';

export function ForgotPasswordPage() {
  useEffect(() => {
    const url = new URL(
      `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/login-actions/reset-credentials`,
    );
    url.searchParams.set('client_id', KEYCLOAK_CLIENT_ID);
    window.location.replace(url.toString());
  }, []);

  return (
    <div className="auth-page">
      <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '40vh' }}>
        Redirecting to password reset…
      </p>
    </div>
  );
}

export default ForgotPasswordPage;
