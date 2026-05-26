import { lazy, Suspense, useEffect } from 'react';
import './assets/css/App.css';
import Alert from './components/layout/Alert';
import EmailVerificationBanner from './components/layout/EmailVerificationBanner';
import Navbar from './components/layout/Navbar';
import OnboardingModal from './components/layout/OnboardingModal';
import PageSkeleton from './components/layout/PageSkeleton';
import RemoteErrorBoundary from './components/layout/RemoteErrorBoundary';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import * as Sentry from '@sentry/react';
import { AuthCallback } from './auth/AuthCallback';
import { SilentCallback } from './auth/SilentCallback';
import { useOidcAuth } from './auth/useOidcAuth';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const SignupPage = lazy(() => import('./pages/SignupPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));

// Editor and Dashboard are loaded via the federation runtime when separate remote
// builds are deployed (VITE_USE_REMOTES=true). In dev and single-build mode they
// resolve to local imports — same components, zero extra latency, no network hop.
//
// To enable remote loading:
//   VITE_USE_REMOTES=true + ensure remoteEntry-editor.js / remoteEntry-analytics.js
//   are served at the URLs configured in vite.config.ts.
const USE_REMOTES = import.meta.env.VITE_USE_REMOTES === 'true';

const EditorPage = lazy(() => {
  if (USE_REMOTES) {
    return import('editor-remote/EditorPage')
      .then((m) => ({ default: m.default }))
      .catch(() => import('./pages/Home').then((m) => ({ default: m.default })));
  }
  return import('./pages/Home');
});

const DashboardPage = lazy(() => {
  if (USE_REMOTES) {
    return import('analytics-remote/AnalyticsPage')
      .then((m) => ({ default: m.default }))
      .catch(() => import('./pages/DashboardPage').then((m) => ({ default: m.default })));
  }
  return import('./pages/DashboardPage');
});

import { AlertProvider, useAlertContext } from './contexts/AlertContext';
import type { AlertLevel } from './contexts/AlertContext';
import { AppProvider, useAppContext } from './contexts/AppContext';
import { ThemeProvider, useThemeContext } from './contexts/ThemeContext';
import PassPurchaseModal from './components/subscription/PassPurchaseModal';
import { ROUTES } from './constants';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, login } = useOidcAuth();
  if (isLoading) return <PageSkeleton />;
  if (!isAuthenticated) {
    login();
    return null;
  }
  return <>{children}</>;
}

function AppInner() {
  const SentryRoutes = Sentry.withSentryReactRouterV7Routing(Routes);
  const { alerts, showAlert: showAlertCtx, dismissAlert } = useAlertContext();
  const { mode, setMode } = useThemeContext();
  const { user, isAuthenticated, gamification, subscription } = useAppContext();
  // Narrow to the simpler signature used by page components
  const showAlert = showAlertCtx as (message: string, type: AlertLevel) => void;

  // Listen for global RTK Query errors from middleware
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

  return (
    <>
      {!gamification.onboarded && <OnboardingModal onComplete={handleOnboardingComplete} />}

      <Navbar showAlert={showAlert} />
      <EmailVerificationBanner showAlert={showAlert} />
      <Alert alerts={alerts} dismissAlert={dismissAlert} />
      <PassPurchaseModal
        show={subscription.showUpgradeModal}
        onDismiss={subscription.dismissUpgradeModal}
        blockedTool={subscription.blockedTool}
        subscription={subscription}
      />
      <Suspense fallback={<PageSkeleton />}>
        <SentryRoutes>
          <Route
            path={ROUTES.HOME}
            element={
              <RemoteErrorBoundary name="Editor">
                <EditorPage
                  mode={mode}
                  setMode={setMode as (mode: string) => void}
                  showAlert={showAlert as (message: string, type: string) => void}
                  gamification={gamification}
                  user={user}
                  isAuthenticated={isAuthenticated}
                  subscription={subscription}
                />
              </RemoteErrorBoundary>
            }
          />
          <Route path={ROUTES.LOGIN} element={<LoginPage />} />
          <Route path={ROUTES.SIGNUP} element={<SignupPage />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/auth/silent-callback" element={<SilentCallback />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route
            path={ROUTES.DASHBOARD}
            element={
              <ProtectedRoute>
                <RemoteErrorBoundary name="Dashboard">
                  <DashboardPage
                    gamification={gamification}
                    user={user}
                    isAuthenticated={isAuthenticated}
                    showAlert={showAlert}
                    mode={mode}
                    setMode={setMode as (mode: string) => void}
                    subscription={subscription}
                  />
                </RemoteErrorBoundary>
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
