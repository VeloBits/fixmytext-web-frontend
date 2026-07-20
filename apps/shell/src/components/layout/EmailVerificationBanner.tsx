import { useLayoutEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { useOidcAuth } from '@velobits/app-core/auth/useOidcAuth';
import { useResendVerificationMutation } from '@velobits/app-core/store/api/authApi';
import type { RootState } from '@velobits/app-core/store/store';
import type { AlertLevel } from '@/contexts/AlertContext';

const DISMISSAL_KEY = 'fmt:email-verify-dismissed-until';
const NAVBAR_HEIGHT = 44; // keep in sync with the navbar's CSS height
const CHROME_VAR = '--app-chrome-offset';

/**
 * Publish the banner's rendered height to the CSS var used by layout rules
 * (`calc(100vh - var(--app-chrome-offset))`). Returns a cleanup function that
 * resets the var to the navbar-only default. Uses ResizeObserver so the
 * offset stays correct when the banner reflows (e.g. the mobile stack).
 */
function useChromeOffset(ref: React.RefObject<HTMLDivElement | null>, isMounted: boolean) {
  useLayoutEffect(() => {
    if (!isMounted || !ref.current) return undefined;
    const root = document.documentElement;
    const apply = () => {
      const h = ref.current?.offsetHeight ?? 0;
      root.style.setProperty(CHROME_VAR, `${NAVBAR_HEIGHT + h}px`);
    };
    apply();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(apply) : null;
    if (ro) ro.observe(ref.current);
    window.addEventListener('resize', apply);
    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener('resize', apply);
      root.style.setProperty(CHROME_VAR, `${NAVBAR_HEIGHT}px`);
    };
  }, [ref, isMounted]);
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

function CloseIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

/**
 * Banner shown to authenticated users whose email is not yet verified.
 *
 * Renders nothing when the user is verified, signed out, still loading, or
 * has dismissed the banner within the soft-cooldown window (1 hour).
 *
 * `showAlert` is required and is used to report a fallback when we can't build
 * the Keycloak verification link — the banner itself stays minimal.
 */
export interface EmailVerificationBannerProps {
  showAlert: (message: string, type: AlertLevel) => void;
}

export default function EmailVerificationBanner({ showAlert }: EmailVerificationBannerProps) {
  const user = useSelector((s: RootState) => s.auth.user);
  const { isAuthenticated } = useOidcAuth();
  const [resendVerification, { isLoading: isResending }] = useResendVerificationMutation();

  const [dismissed, setDismissed] = useState(() => {
    try {
      const until = Number(localStorage.getItem(DISMISSAL_KEY) || 0);
      return until > Date.now();
    } catch {
      return false;
    }
  });
  const bannerRef = useRef<HTMLDivElement>(null);

  const isVisible = isAuthenticated && !!user && !user.is_email_verified && !dismissed;
  useChromeOffset(bannerRef, isVisible);

  if (!isVisible) {
    return null;
  }

  // account-svc owns the resend: with the realm's blocking verify-email
  // requirement disabled, Keycloak's reset-credentials screen is a plain
  // password reset and would NOT re-send the verification link. The endpoint
  // calls Keycloak Admin's send-verify-email for the current user instead —
  // no page navigation, the user stays in the app.
  const handleResend = async () => {
    try {
      await resendVerification().unwrap();
      showAlert(`Verification email sent to ${user?.email}.`, 'success');
    } catch {
      showAlert('Could not send the verification email. Please try again later.', 'danger');
    }
  };

  const handleDismiss = () => {
    try {
      // Soft-dismiss for an hour — production apps don't want to nag users
      // endlessly, but can't let a dismissal stick forever either.
      localStorage.setItem(DISMISSAL_KEY, String(Date.now() + 60 * 60 * 1000));
    } catch {
      /* ignore storage failures (private mode etc.) */
    }
    setDismissed(true);
  };

  return (
    <div
      ref={bannerRef}
      className="verify-banner"
      role="status"
      aria-live="polite"
      data-testid="email-verification-banner"
    >
      <div className="verify-banner__content">
        <span className="verify-banner__icon">
          <MailIcon />
        </span>
        <div className="verify-banner__text">
          <strong>Verify your email</strong>
          <span>
            Link sent to <b>{user.email}</b> — AI tools unlock once you confirm.
          </span>
        </div>
      </div>
      <div className="verify-banner__actions">
        <button
          type="button"
          className="verify-banner__resend"
          onClick={handleResend}
          disabled={isResending}
        >
          {isResending ? 'Sending…' : 'Resend email'}
        </button>
        <button
          type="button"
          className="verify-banner__dismiss"
          onClick={handleDismiss}
          aria-label="Dismiss verification reminder"
          title="Hide for an hour"
        >
          <CloseIcon />
        </button>
      </div>
    </div>
  );
}
