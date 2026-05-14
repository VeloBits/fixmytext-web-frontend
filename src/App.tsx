import { lazy, Suspense, useEffect } from 'react';
import './assets/css/App.css';
import Alert from './components/layout/Alert';
import EmailVerificationBanner from './components/layout/EmailVerificationBanner';
import Navbar from './components/layout/Navbar';
import Home from './pages/Home';
import OnboardingModal from './components/layout/OnboardingModal';
import PageSkeleton from './components/layout/PageSkeleton';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import * as Sentry from '@sentry/react';

const AboutPage = lazy(() => import('./pages/AboutPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const SignupPage = lazy(() => import('./pages/SignupPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const VerifyEmailPage = lazy(() => import('./pages/VerifyEmailPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const PricingPage = lazy(() => import('./pages/PricingPage'));
const SharePage = lazy(() => import('./pages/SharePage'));

import { AlertProvider, useAlertContext } from './contexts/AlertContext';
import type { AlertLevel } from './contexts/AlertContext';
import { AppProvider, useAppContext } from './contexts/AppContext';
import { ThemeProvider, useThemeContext } from './contexts/ThemeContext';
import PassPurchaseModal from './components/subscription/PassPurchaseModal';
import { ROUTES } from './constants';

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
              <Home
                mode={mode}
                setMode={setMode as (mode: string) => void}
                showAlert={showAlert as (message: string, type: string) => void}
                gamification={gamification}
                user={user}
                isAuthenticated={isAuthenticated}
                subscription={subscription}
              />

            }
          />
          <Route path={ROUTES.ABOUT} element={<AboutPage />} />
          <Route path={ROUTES.LOGIN} element={<LoginPage showAlert={showAlert} />} />
          <Route path={ROUTES.SIGNUP} element={<SignupPage showAlert={showAlert} />} />
          <Route
            path={ROUTES.FORGOT_PASSWORD}
            element={<ForgotPasswordPage showAlert={showAlert} />}
          />
          <Route
            path={ROUTES.RESET_PASSWORD}
            element={<ResetPasswordPage showAlert={showAlert} />}
          />
          <Route path={ROUTES.VERIFY_EMAIL} element={<VerifyEmailPage showAlert={showAlert} />} />
          <Route
            path={ROUTES.PRICING}
            element={<PricingPage showAlert={showAlert} subscription={subscription} />}
          />
          <Route
            path={ROUTES.DASHBOARD}
            element={
              <DashboardPage
                gamification={gamification}
                user={user}
                isAuthenticated={isAuthenticated}
                showAlert={showAlert}
                mode={mode}
                setMode={setMode as (mode: string) => void}
                subscription={subscription}
              />
            }
          />
          <Route path={ROUTES.SHARE} element={<SharePage showAlert={showAlert} />} />
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
