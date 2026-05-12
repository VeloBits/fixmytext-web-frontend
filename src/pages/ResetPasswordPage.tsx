import { useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useResetPasswordMutation } from '@/store/api/authApi';
import { ROUTES } from '@/constants';
import type { AlertLevel } from '@/contexts/AlertContext';
import type { RootState } from '@/store/store';

interface ResetPasswordPageProps {
  showAlert: (message: string, type: AlertLevel) => void;
}

interface EyeIconProps {
  hidden: boolean;
}

function EyeIcon({ hidden }: EyeIconProps) {
  return hidden ? (
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
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
    </svg>
  ) : (
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
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function AlertIcon() {
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
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

export default function ResetPasswordPage({ showAlert }: ResetPasswordPageProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const { accessToken } = useSelector((s: RootState) => s.auth);
  const [resetPassword, { isLoading }] = useResetPasswordMutation();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const passwordHint = useMemo(() => {
    if (!newPassword) return null;
    if (newPassword.length < 8) {
      return { tone: 'weak', message: `Add ${8 - newPassword.length} more character(s)` };
    }
    if (confirmPassword && confirmPassword !== newPassword) {
      return { tone: 'weak', message: 'Passwords do not match' };
    }
    return { tone: 'ok', message: 'Looks good' };
  }, [newPassword, confirmPassword]);

  if (accessToken) return <Navigate to={ROUTES.HOME} replace />;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      showAlert('Password must be at least 8 characters', 'danger');
      return;
    }
    if (newPassword !== confirmPassword) {
      showAlert('Passwords do not match', 'danger');
      return;
    }
    try {
      await resetPassword({ token, new_password: newPassword }).unwrap();
      showAlert('Password reset successfully. Please sign in.', 'success');
      navigate(ROUTES.LOGIN);
    } catch (err) {
      const apiErr = err as { data?: { detail?: string } };
      showAlert(
        apiErr?.data?.detail || 'Reset link is invalid or has expired. Request a new one.',
        'danger'
      );
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2 className="auth-title">Reset password</h2>
        <p className="auth-subtitle">Choose a new password for your account.</p>

        {!token ? (
          <div className="auth-form">
            <div className="auth-info" role="alert">
              <span className="auth-info__icon">
                <AlertIcon />
              </span>
              <div>
                <p>This link is missing a reset token.</p>
                <p>Request a new reset email to continue.</p>
              </div>
            </div>
            <Link to={ROUTES.FORGOT_PASSWORD} className="auth-btn auth-btn--primary">
              Request a reset link
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form" noValidate>
            <div className="auth-field">
              <label htmlFor="newPassword">New password</label>
              <div className="auth-password-wrapper">
                <input
                  id="newPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  autoFocus
                />
                <button
                  type="button"
                  className="auth-password-toggle"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <EyeIcon hidden={showPassword} />
                </button>
              </div>
              {passwordHint && (
                <p className={`auth-hint auth-hint--${passwordHint.tone}`} aria-live="polite">
                  {passwordHint.message}
                </p>
              )}
            </div>
            <div className="auth-field">
              <label htmlFor="confirmPassword">Confirm new password</label>
              <div className="auth-password-wrapper">
                <input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                />
              </div>
            </div>
            <button type="submit" className="auth-btn auth-btn--primary" disabled={isLoading}>
              {isLoading ? (
                <>
                  <span className="auth-btn__spinner" aria-hidden="true" />
                  Resetting...
                </>
              ) : (
                'Reset password'
              )}
            </button>
          </form>
        )}

        <p className="auth-footer">
          Back to <Link to={ROUTES.LOGIN}>sign in</Link>
        </p>
      </div>
    </div>
  );
}
