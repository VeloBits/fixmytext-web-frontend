import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { useOidcAuth } from '@/auth/useOidcAuth';
import type { RootState } from '@/store/store';
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
 * `showAlert` is required and is used to report the outcome of resend
 * requests — the banner itself stays minimal.
 */
export interface EmailVerificationBannerProps {
  showAlert: (message: string, type: AlertLevel) => void;
}

export default function EmailVerificationBanner({ showAlert }: EmailVerificationBannerProps) {
  const user = useSelector((s: RootState) => s.auth.user);
  const { isAuthenticated } = useOidcAuth();

  // TODO: resend-verification endpoint removed in Keycloak migration. Email verification is now handled by Keycloak.
  const [isLoading] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    try {
      const until = Number(localStorage.getItem(DISMISSAL_KEY) || 0);
      return until > Date.now();
    } catch {
      return false;
    }
  });
  const [cooldownUntil] = useState(0);
  const [, forceTick] = useState(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bannerRef = useRef<HTMLDivElement>(null);

  const isVisible = isAuthenticated && !!user && !user.is_email_verified && !dismissed;
  useChromeOffset(bannerRef, isVisible);

  // Tick once a second while a cooldown is active so the countdown updates.
  useEffect(() => {
    if (cooldownUntil <= Date.now()) {
      if (tickRef.current) clearInterval(tickRef.current);
      tickRef.current = null;
      return;
    }
    tickRef.current = setInterval(() => {
      forceTick((n) => n + 1);
      if (cooldownUntil <= Date.now() && tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
    }, 1000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
      tickRef.current = null;
    };
  }, [cooldownUntil]);

  if (!isVisible) {
    return null;
  }

  const handleResend = async () => {
    // TODO: Email verification resend is now handled by Keycloak.
    // Redirect the user to Keycloak to resend the verification email.
    showAlert('Please check your Keycloak account to resend the verification email.', 'info');
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

  const cooldownSecs = Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000));
  const buttonLabel =
    cooldownSecs > 0 ? `Resend in ${cooldownSecs}s` : isLoading ? 'Sending...' : 'Resend email';

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
          disabled={isLoading || cooldownSecs > 0}
        >
          {buttonLabel}
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
