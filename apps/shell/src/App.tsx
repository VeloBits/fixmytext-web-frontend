import { lazy, Suspense, useEffect } from 'react';
import './assets/css/App.css';
import Alert from './components/layout/Alert';
import EmailVerificationBanner from './components/layout/EmailVerificationBanner';
import Navbar from './components/layout/Navbar';
import OnboardingModal from './components/layout/OnboardingModal';
import PageSkeleton from './components/layout/PageSkeleton';
import RemoteBoundary from './components/layout/RemoteBoundary';
import { BrowserRouter as Router, Routes, Route, useMatch } from 'react-router-dom';
import * as Sentry from '@sentry/react';
import { AuthCallback } from '@velobits/app-core/auth/AuthCallback';
import { SilentCallback } from '@velobits/app-core/auth/SilentCallback';
import { useOidcAuth } from '@velobits/app-core/auth/useOidcAuth';
import { AlertProvider, useAlertContext } from './contexts/AlertContext';
import type { AlertLevel } from './contexts/AlertContext';
import { AppProvider, useAppContext } from './contexts/AppContext';
import { ThemeProvider, useThemeContext } from './contexts/ThemeContext';
import PassPurchaseModal from './components/subscription/PassPurchaseModal';
import { ROUTES } from '@velobits/app-core/constants';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const SignupPage = lazy(() => import('./pages/SignupPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
// In-app (authenticated) marketing pages. Distinct from the public SSR/SEO
// versions in apps/content — these let logged-in users browse the full pass/credit
// catalog and purchase via Razorpay without leaving the SPA. The navbar, editor,
// and dashboard link here ('/about', '/pricing').
const AboutPage = lazy(() => import('./pages/AboutPage'));
const PricingPage = lazy(() => import('./pages/PricingPage'));
// In-app authenticated share view at /app/share/:id. The public, SSR/SEO share page
// is served separately by apps/content at /share/:id.
const SharePage = lazy(() => import('./pages/SharePage'));

// Remote surfaces — loaded from their independently deployed MFE builds.
// No local fallback: if a remote is down, RemoteBoundary shows the error state.
const EditorPage = lazy(() =>
  import('editor-remote/EditorPage').then((m) => ({ default: m.default }))
);

const DashboardPage = lazy(() =>
  import('analytics-remote/AnalyticsPage').then((m) => ({ default: m.default }))
);

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, login } = useOidcAuth();
  if (isLoading) return <PageSkeleton />;
  if (!isAuthenticated) {
    login();
    // login() triggers a full-page redirect to Keycloak; keep the skeleton up
    // until the browser navigates away so there's no white flash.
    return <PageSkeleton />;
  }
  return <>{children}</>;
}

function AppInner() {
  const SentryRoutes = Sentry.withSentryReactRouterV7Routing(Routes);
  const { alerts, showAlert: showAlertCtx, dismissAlert } = useAlertContext();
  const { mode, setMode } = useThemeContext();
  const { user, isAuthenticated, userResolving, gamification, subscription } = useAppContext();
  const { isLoading: authLoading, wasAuthenticated } = useOidcAuth();
  const showAlert = showAlertCtx as (message: string, type: AlertLevel) => void;

  useEffect(() => {
    const handler = (e: CustomEvent<{ message: string; type: string }>) => {
      showAlert(e.detail.message, e.detail.type as Parameters<typeof showAlert>[1]);
    };
    window.addEventListener('rtk-api-error', handler as EventListener);
    return () => window.removeEventListener('rtk-api-error', handler as EventListener);
  }, [showAlert]);

  const handleOnboardingComplete = (personaId: string) => {
    gamification.setPersona(personaId as unknown as Parameters<typeof gamification.setPersona>[0]);
  };

  // A share link is often someone's first visit; the persona picker has no
  // dismiss affordance and its overlay blocks the whole page, so a recipient
  // couldn't even read/copy the share. Onboard them when they enter the editor.
  const isShareView = useMatch(ROUTES.SHARE) !== null;

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
      {!gamification.onboarded && !isShareView && (
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
                  showAlert={showAlert as (message: string, type: string) => void}
                  gamification={gamification}
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
                    gamification={gamification}
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
    <Router basename="/app">
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
