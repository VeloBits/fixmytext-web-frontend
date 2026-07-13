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

// One-time cleanup of the removed gamification feature's localStorage blob.
// ORDERING: usePersona's state initializer still reads this key as a legacy
// persona fallback during the FIRST render, so the removal is deferred until
// after React has mounted (setTimeout 0 runs after the synchronous render
// pass above). Once the legacy read in usePersona is dropped, this cleanup
// can be dropped with it in a future release.
setTimeout(() => {
  try {
    localStorage.removeItem('fmx_gamification');
  } catch {
    /* storage unavailable (e.g. blocked third-party context) — ignore */
  }
}, 0);
