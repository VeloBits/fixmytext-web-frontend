import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useResendVerificationMutation, useVerifyEmailMutation } from '../store/api/authApi';
import { useSelector } from 'react-redux';
import { ROUTES } from '../constants';
import type { AlertLevel } from '../contexts/AlertContext';
import type { RootState } from '../store/store';

interface VerifyEmailPageProps {
  showAlert: (message: string, type: AlertLevel) => void;
}

const STATES = {
  IDLE: 'idle',
  VERIFYING: 'verifying',
  SUCCESS: 'success',
  FAILED: 'failed',
  MISSING: 'missing',
};

function CheckIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg
      width="20"
      height="20"
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

export default function VerifyEmailPage({ showAlert }: VerifyEmailPageProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const { accessToken } = useSelector((s: RootState) => s.auth);

  const [verifyEmail, { isLoading: verifying }] = useVerifyEmailMutation();
  const [resendVerification, { isLoading: resending }] = useResendVerificationMutation();

  const [state, setState] = useState(token ? STATES.VERIFYING : STATES.MISSING);
  const [errorMessage, setErrorMessage] = useState('');
  const attempted = useRef(false);

  // Auto-verify exactly once on mount.
  useEffect(() => {
    if (!token || attempted.current) return;
    attempted.current = true;
    (async () => {
      try {
        await verifyEmail({ token }).unwrap();
        setState(STATES.SUCCESS);
        showAlert('Email verified — welcome aboard!', 'success');
      } catch (err) {
        const apiErr = err as { data?: { detail?: string } };
        setState(STATES.FAILED);
        setErrorMessage(
          apiErr?.data?.detail ||
            'This verification link is invalid or has expired. Please request a new one.'
        );
      }
    })();
  }, [token, verifyEmail, showAlert]);

  const handleResend = async () => {
    if (!accessToken) {
      showAlert('Please sign in to request a new verification email.', 'warning');
      navigate(ROUTES.LOGIN);
      return;
    }
    try {
      await resendVerification().unwrap();
      showAlert('A new verification email has been sent. Check your inbox.', 'success');
    } catch (err) {
      const apiErr = err as { status?: number; data?: { detail?: string } };
      if (apiErr?.status === 429) {
        showAlert(
          apiErr?.data?.detail || 'Please wait a moment before requesting another email.',
          'warning'
        );
      } else {
        showAlert(
          apiErr?.data?.detail || 'Could not send verification email. Try again shortly.',
          'danger'
        );
      }
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card auth-card--status">
        {state === STATES.VERIFYING && (
          <>
            <div className="auth-status auth-status--pending" role="status" aria-live="polite">
              <span className="auth-status__spinner" aria-hidden="true" />
            </div>
            <h2 className="auth-title">Verifying your email</h2>
            <p className="auth-subtitle">This will only take a moment.</p>
          </>
        )}

        {state === STATES.SUCCESS && (
          <>
            <div className="auth-status auth-status--success" role="status" aria-live="polite">
              <CheckIcon />
            </div>
            <h2 className="auth-title">Email verified</h2>
            <p className="auth-subtitle">
              Your account is now fully activated. AI-powered tools are unlocked and ready to use.
            </p>
            <Link to={ROUTES.HOME} className="auth-btn auth-btn--primary">
              Go to the app
            </Link>
          </>
        )}

        {state === STATES.FAILED && (
          <>
            <div className="auth-status auth-status--error" role="alert">
              <AlertIcon />
            </div>
            <h2 className="auth-title">Verification failed</h2>
            <p className="auth-subtitle">{errorMessage}</p>
            <button
              type="button"
              className="auth-btn auth-btn--primary"
              onClick={handleResend}
              disabled={resending || verifying}
            >
              {resending ? (
                <>
                  <span className="auth-btn__spinner" aria-hidden="true" />
                  Sending...
                </>
              ) : (
                'Send a new link'
              )}
            </button>
            <p className="auth-footer">
              Back to <Link to={ROUTES.LOGIN}>sign in</Link>
            </p>
          </>
        )}

        {state === STATES.MISSING && (
          <>
            <div className="auth-status auth-status--error" role="alert">
              <AlertIcon />
            </div>
            <h2 className="auth-title">Missing verification token</h2>
            <p className="auth-subtitle">
              This link doesn&apos;t include a verification token. Request a new one from your
              account or sign-up email.
            </p>
            <button
              type="button"
              className="auth-btn auth-btn--primary"
              onClick={handleResend}
              disabled={resending}
            >
              {resending ? (
                <>
                  <span className="auth-btn__spinner" aria-hidden="true" />
                  Sending...
                </>
              ) : (
                'Send verification email'
              )}
            </button>
            <p className="auth-footer">
              Back to <Link to={ROUTES.LOGIN}>sign in</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
