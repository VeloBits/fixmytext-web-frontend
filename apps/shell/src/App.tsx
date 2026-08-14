import { lazy, Suspense, useEffect, useState } from 'react';
import './assets/css/App.css';
import Alert from './components/layout/Alert';
import EmailVerificationBanner from './components/layout/EmailVerificationBanner';
import Navbar from './components/layout/Navbar';
import OnboardingModal from './components/layout/OnboardingModal';
import PageSkeleton from './components/layout/PageSkeleton';
import RemoteBoundary from './components/layout/RemoteBoundary';
import { BrowserRouter as Router, Routes, Route, useLocation, useMatch } from 'react-router-dom';
import * as Sentry from '@sentry/react';
import { AuthCallback } from '@velobits/app-core/auth/AuthCallback';
import { SilentCallback } from '@velobits/app-core/auth/SilentCallback';
import { useOidcAuth } from '@velobits/app-core/auth/useOidcAuth';
import { attemptSilentRestore, hasAuthHint } from '@velobits/app-core/auth/userManager';
import { AlertProvider, useAlertContext } from './contexts/AlertContext';
import type { AlertLevel } from './contexts/AlertContext';
import type { ShowAlertFn, ShowAlertOptions } from '@velobits/app-core/types/alert';
import { AppProvider, useAppContext } from './contexts/AppContext';
import type { StarterKit } from '@velobits/app-core/types/tools';
import useOnboardingGate from './hooks/useOnboardingGate';
import { ThemeProvider, useThemeContext } from './contexts/ThemeContext';
import PassPurchaseModal from './components/subscription/PassPurchaseModal';
import { ROUTES } from '@velobits/app-core/constants';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const SignupPage = lazy(() => import('./pages/SignupPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
// In-app (authenticated) marketing pages. Distinct from the public SSR/SEO
// versions in apps/content - these let logged-in users browse the full pass/credit
// catalog and purchase via Razorpay without leaving the SPA. The navbar, editor,
// and dashboard link here ('/about', '/pricing').
const AboutPage = lazy(() => import('./pages/AboutPage'));
const PricingPage = lazy(() => import('./pages/PricingPage'));
// In-app authenticated share view at /share/:id. The former public SSR/SEO share
// page (apps/content) is no longer routed on this origin - the shell owns /.
const SharePage = lazy(() => import('./pages/SharePage'));

// Remote surfaces - loaded from their independently deployed MFE builds.
// No local fallback: if a remote is down, RemoteBoundary shows the error state.
const EditorPage = lazy(() =>
  import('editor-remote/EditorPage').then((m) => ({ default: m.default }))
);

const DashboardPage = lazy(() =>
  import('analytics-remote/AnalyticsPage').then((m) => ({ default: m.default }))
);

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, login } = useOidcAuth();
  const location = useLocation();
  // 'idle' → not yet needed; 'trying' → silent restore in flight;
  // 'failed' → no restorable session, a full Keycloak login is required.
  const [restore, setRestore] = useState<'idle' | 'trying' | 'failed'>('idle');

  // When the access token quietly expired (e.g. a minutes-long Razorpay
  // checkout outlived it), first try a silent renew from the Keycloak SSO
  // cookie instead of bouncing through a full-page login - the bounce used to
  // eat the post-purchase ?purchase=… params and their success alert.
  useEffect(() => {
    if (isLoading || isAuthenticated || restore !== 'idle') return;
    if (hasAuthHint()) {
      setRestore('trying');
      void attemptSilentRestore().then((ok) => setRestore(ok ? 'idle' : 'failed'));
    } else {
      setRestore('failed');
    }
  }, [isLoading, isAuthenticated, restore]);

  useEffect(() => {
    if (restore === 'failed' && !isLoading && !isAuthenticated) {
      // Full login round trip; returnTo restores the exact path + query
      // (e.g. /dashboard?tab=subscription&purchase=success&kind=pass).
      void login({ returnTo: location.pathname + location.search });
    }
  }, [restore, isLoading, isAuthenticated, login, location.pathname, location.search]);

  // Reset the restore machine once a session exists again so a later
  // expiry re-runs the silent attempt instead of hard-failing.
  useEffect(() => {
    if (isAuthenticated && restore === 'failed') setRestore('idle');
  }, [isAuthenticated, restore]);

  if (!isAuthenticated) return <PageSkeleton />;
  return <>{children}</>;
}

function AppInner() {
  const SentryRoutes = Sentry.withSentryReactRouterV7Routing(Routes);
  const { alerts, showAlert: showAlertCtx, dismissAlert } = useAlertContext();
  const { mode, setMode } = useThemeContext();
  const { user, isAuthenticated, userResolving, toolGroups, favorites, sidebarChips, subscription } =
    useAppContext();
  const onboarding = useOnboardingGate(toolGroups);
  const { isLoading: authLoading, wasAuthenticated } = useOidcAuth();
  const showAlert = showAlertCtx as (
    message: string,
    type: AlertLevel,
    options?: ShowAlertOptions
  ) => void;

  useEffect(() => {
    const handler = (e: CustomEvent<{ message: string; type: string }>) => {
      showAlert(e.detail.message, e.detail.type as Parameters<typeof showAlert>[1]);
    };
    window.addEventListener('rtk-api-error', handler as EventListener);
    return () => window.removeEventListener('rtk-api-error', handler as EventListener);
  }, [showAlert]);

  const handleOnboardingComplete = (kit: StarterKit | null) => {
    if (kit && kit.toolIds.length > 0) {
      toolGroups.createGroup(kit.groupName, kit.toolIds);
    }
    if (kit) {
      // One-shot: the editor listens and lands on the All view, where the
      // kit's freshly seeded custom group sits pinned at the top of the panel
      // (transient, nothing persisted). Kits stopped carrying a defaultTab
      // when the category tabs became sidebar chips (2026-07-22).
      window.dispatchEvent(new CustomEvent('fmx:onboarding-tab', { detail: { tab: 'view:all' } }));
    }
    onboarding.markSeen();
  };

  // A share link is often someone's first visit; the starter-kit overlay
  // blocks the whole page, so a recipient couldn't even read/copy the share.
  // Onboard them when they enter the editor.
  const isShareView = useMatch(ROUTES.SHARE) !== null;

  // Same blocking problem on auth screens: they render their own status and
  // error cards ("Couldn't reach sign-in" with Retry, callback errors), and
  // the onboarding overlay would sit on top and make those buttons unclickable
  // for a first-time visitor. Onboarding waits until the user is on app content.
  const { pathname } = useLocation();
  const isAuthScreen =
    pathname === ROUTES.LOGIN ||
    pathname === ROUTES.SIGNUP ||
    pathname === ROUTES.FORGOT_PASSWORD ||
    pathname.startsWith('/auth/');

  // A session existed here before this page load (H-8 keeps tokens in memory,
  // so a refresh must silently re-acquire them from the Keycloak SSO cookie,
  // then fetch /auth/me). Until both settle, hold the skeleton instead of
  // painting guest chrome (Sign In button, 'G' avatar) that flips moments
  // later. Genuine guests have no hint and render immediately. The auth
  // callback routes resolve authLoading instantly (loadUser short-circuits),
  // so this never blocks login completion.
  if (wasAuthenticated && (authLoading || userResolving)) {
    return <PageSkeleton />;
  }

  return (
    <>
      {onboarding.resolved && !onboarding.seen && !isShareView && !isAuthScreen && (
        <OnboardingModal onComplete={handleOnboardingComplete} />
      )}

      <Navbar showAlert={showAlert} user={user} mode={mode} setMode={setMode} />
      <EmailVerificationBanner showAlert={showAlert} />
      <Alert alerts={alerts} dismissAlert={dismissAlert} />
      <PassPurchaseModal
        show={subscription.showUpgradeModal}
        onDismiss={subscription.dismissUpgradeModal}
        blockedTool={subscription.blockedTool}
        subscription={subscription}
      />

      {/* Non-remote routes share a single Suspense boundary */}
      <Suspense fallback={<PageSkeleton />}>
        <SentryRoutes>
          <Route
            path={ROUTES.HOME}
            element={
              <RemoteBoundary name="Editor">
                <EditorPage
                  mode={mode}
                  setMode={setMode as (mode: string) => void}
                  showAlert={showAlert as ShowAlertFn}
                  toolGroups={toolGroups}
                  favorites={favorites}
                  sidebarChips={sidebarChips}
                  user={user}
                  isAuthenticated={isAuthenticated}
                  subscription={subscription}
                />
              </RemoteBoundary>
            }
          />
          <Route path={ROUTES.LOGIN} element={<LoginPage />} />
          <Route path={ROUTES.SIGNUP} element={<SignupPage />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/auth/silent-callback" element={<SilentCallback />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path={ROUTES.ABOUT} element={<AboutPage />} />
          <Route
            path={ROUTES.PRICING}
            element={<PricingPage showAlert={showAlert} subscription={subscription} />}
          />
          <Route path={ROUTES.SHARE} element={<SharePage showAlert={showAlert} />} />
          <Route
            path={ROUTES.DASHBOARD}
            element={
              <ProtectedRoute>
                <RemoteBoundary name="Dashboard">
                  <DashboardPage
                    favorites={favorites}
                    user={user}
                    isAuthenticated={isAuthenticated}
                    showAlert={showAlert}
                    mode={mode}
                    setMode={setMode as (mode: string) => void}
                    subscription={subscription}
                  />
                </RemoteBoundary>
              </ProtectedRoute>
            }
          />
        </SentryRoutes>
      </Suspense>
    </>
  );
}

function App() {
  return (
    <Router>
      <AlertProvider>
        <ThemeProvider>
          <AppProvider>
            <AppInner />
          </AppProvider>
        </ThemeProvider>
      </AlertProvider>
    </Router>
  );
}

export default App;
