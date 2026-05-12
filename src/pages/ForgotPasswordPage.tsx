import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useForgotPasswordMutation } from '../store/api/authApi';
import { ROUTES } from '../constants';
import type { AlertLevel } from '../contexts/AlertContext';
import type { RootState } from '../store/store';

interface ForgotPasswordPageProps {
  showAlert: (message: string, type: AlertLevel) => void;
}

function MailIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  );
}

export default function ForgotPasswordPage({ showAlert }: ForgotPasswordPageProps) {
  const { accessToken } = useSelector((s: RootState) => s.auth);
  const [forgotPassword, { isLoading }] = useForgotPasswordMutation();

  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (accessToken) return <Navigate to={ROUTES.HOME} replace />;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const res = await forgotPassword({ email }).unwrap();
      // TODO(email): remove this dev-only fallback once the email pipeline ships.
      // The backend currently returns the raw token to unblock frontend work;
      // in prod the user will receive a link by email instead.
      const resWithToken = res as { reset_token?: string };
      if (resWithToken?.reset_token) {
        console.info(
          'DEV reset link:',
          `${window.location.origin}${ROUTES.RESET_PASSWORD}?token=${resWithToken.reset_token}`
        );
      }
      setSubmitted(true);
      showAlert('If that email is registered, we have sent a reset link.', 'success');
    } catch (err) {
      const apiErr = err as { status?: number; data?: { detail?: string } };
      if (apiErr?.status === 429) {
        showAlert('Too many attempts. Please try again in a minute.', 'danger');
      } else {
        showAlert(apiErr?.data?.detail || 'Could not send reset link. Please try again.', 'danger');
      }
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2 className="auth-title">Forgot password</h2>
        <p className="auth-subtitle">
          Enter the email associated with your account and we&apos;ll send a secure link to reset
          your password.
        </p>

        {submitted ? (
          <div className="auth-form">
            <div className="auth-info" role="status" aria-live="polite">
              <span className="auth-info__icon">
                <MailIcon />
              </span>
              <div>
                <p>
                  If <strong>{email}</strong> is registered, a reset link is on its way.
                </p>
                <p>
                  The link expires in 15 minutes. Check your spam folder if you don&apos;t see it.
                </p>
              </div>
            </div>
            <Link to={ROUTES.LOGIN} className="auth-btn auth-btn--primary">
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form" noValidate>
            <div className="auth-field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                spellCheck="false"
                required
                autoFocus
              />
            </div>
            <button type="submit" className="auth-btn auth-btn--primary" disabled={isLoading}>
              {isLoading ? (
                <>
                  <span className="auth-btn__spinner" aria-hidden="true" />
                  Sending...
                </>
              ) : (
                'Send reset link'
              )}
            </button>
          </form>
        )}

        <p className="auth-footer">
          Remember your password? <Link to={ROUTES.LOGIN}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
