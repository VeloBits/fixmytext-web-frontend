import * as Sentry from '@sentry/react';
import { useEffect } from 'react';
import {
  createRoutesFromChildren,
  matchRoutes,
  useLocation,
  useNavigationType,
} from 'react-router-dom';

const FILTERED = '[Filtered]';
const PII_KEYS = /text|prompt|password|token|cookie|authorization/i;

function scrubObject(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [k, PII_KEYS.test(k) ? FILTERED : v])
  );
}

export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: (import.meta.env.VITE_SENTRY_ENVIRONMENT as string) || 'development',
    release: import.meta.env.VITE_SENTRY_RELEASE as string | undefined,
    integrations: [
      Sentry.reactRouterV7BrowserTracingIntegration({
        useEffect,
        useLocation,
        useNavigationType,
        createRoutesFromChildren,
        matchRoutes,
      }),
    ],
    tracesSampleRate:
      import.meta.env.VITE_SENTRY_ENVIRONMENT === 'production' ? 0.1 : 1.0,
    tracePropagationTargets: [
      /^\/api\//,
      new RegExp(`^${(import.meta.env.VITE_API_URL as string) || 'http://localhost:8000'}`),
    ],
    sendDefaultPii: false,
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
      /^chrome-extension:/,
      /^moz-extension:/,
    ],
    beforeSend(event) {
      if (event.request?.data && typeof event.request.data === 'object') {
        event.request.data = scrubObject(
          event.request.data as Record<string, unknown>
        );
      }
      if (event.extra) {
        event.extra = scrubObject(event.extra as Record<string, unknown>);
      }
      return event;
    },
    beforeBreadcrumb(breadcrumb) {
      if (
        breadcrumb.category === 'fetch' ||
        breadcrumb.category === 'xhr'
      ) {
        if (breadcrumb.data) {
          delete breadcrumb.data['body'];
          delete breadcrumb.data['response_body_size'];
        }
        return breadcrumb;
      }
      if (
        breadcrumb.category === 'console' &&
        breadcrumb.level !== 'warning' &&
        breadcrumb.level !== 'error'
      ) {
        return null;
      }
      return breadcrumb;
    },
  });
}
