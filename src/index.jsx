import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from './store/store';
import App from './App';
import ErrorBoundary from './components/layout/ErrorBoundary';
import { initVisitorId } from './hooks/useFingerprint';

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

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <Provider store={store}>
        <App />
      </Provider>
    </ErrorBoundary>
  </React.StrictMode>
);
