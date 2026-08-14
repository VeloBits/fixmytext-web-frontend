import '@velobits/design-system/theme.css';
import { initSentry } from '@/lib/sentry';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from '@velobits/app-core/store/store';
import App from './App';
import ErrorBoundary from './components/layout/ErrorBoundary';
import { initVisitorId } from '@velobits/app-core/hooks/useFingerprint';

// Sentry must init before React mounts
initSentry();

// Start fingerprint generation early (async, non-blocking)
initVisitorId();

// Dev-only: stream axe-core violations to the browser console. The import
// is dynamic + gated on import.meta.env.DEV so the package and its
// dependencies are tree-shaken out of production bundles.
if (import.meta.env.DEV) {
  import('@axe-core/react').then(({ default: axe }) => {
    axe(React, ReactDOM, 1000);
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element not found');
const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <Provider store={store}>
        <App />
      </Provider>
    </ErrorBoundary>
  </React.StrictMode>
);

// One-time cleanup of removed features' storage: the gamification blob and
// the guest persona keys (personas were replaced by custom tool groups;
// usePersona and its legacy read are gone, so nothing reads these anymore).
// Deferred to after mount out of caution; drop the whole block in a future
// release once stale tabs have cycled.
setTimeout(() => {
  try {
    localStorage.removeItem('fmx_gamification');
    sessionStorage.removeItem('fmx_guest_persona');
    sessionStorage.removeItem('fmx_guest_persona_owner');
  } catch {
    /* storage unavailable (e.g. blocked third-party context) - ignore */
  }
}, 0);
