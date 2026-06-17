import { useEffect } from 'react';
import {
  KEYCLOAK_CLIENT_ID,
  KEYCLOAK_REALM,
  KEYCLOAK_URL,
} from '@velobits/app-core/auth/keycloakConfig';
import '@/assets/css/auth.css';

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
