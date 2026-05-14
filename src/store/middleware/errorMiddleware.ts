import { isRejectedWithValue } from '@reduxjs/toolkit';
import type { Middleware } from 'redux';
import * as Sentry from '@sentry/react';

/**
 * Shape of an RTK Query rejected-with-value payload as returned by
 * baseQueryWithReauth. All fields are optional because non-API actions
 * that reach this middleware will have an arbitrary payload shape.
 */
interface RtkErrorPayload {
  status?: number;
  data?: {
    detail?: unknown;
  };
}

/**
 * Global RTK Query error middleware.
 *
 * Only fires for **query** endpoints (GET requests) that fail silently
 * without component-level catch blocks. All mutations are handled
 * locally via .unwrap() + try/catch, so we skip them to avoid duplicates.
 */
export const errorMiddleware: Middleware = (_api) => (next) => (action) => {
  if (isRejectedWithValue(action)) {
    const arg = (action.meta as { arg?: { type?: string; endpointName?: string } } | undefined)?.arg;
    const queryType = arg?.type;
    const endpoint = arg?.endpointName;

    // Skip all mutations — they're handled at the component level
    if (queryType === 'mutation') {
      return next(action);
    }

    // Skip silent query endpoints (token refresh, getMe)
    const silentEndpoints = [
      'refresh',
      'getMe',
      'getPreferences',
      'getGamification',
      'getTemplates',
      'getHistory',
    ];
    if (endpoint !== undefined && silentEndpoints.includes(endpoint)) {
      return next(action);
    }

    // Only fire for unhandled query failures
    const error = action.payload as RtkErrorPayload | undefined;
    const detail = error?.data?.detail;
    const message = typeof detail === 'string' ? detail : 'Something went wrong. Please try again.';

    window.dispatchEvent(
      new CustomEvent('rtk-api-error', {
        detail: { message, type: 'danger', endpoint, status: error?.status },
      })
    );

    // Capture non-401 query errors in Sentry
    const status = (action.payload as RtkErrorPayload | undefined)?.status;
    if (status !== 401 && status !== undefined) {
      Sentry.captureException(new Error(`RTK Query error: ${endpoint ?? 'unknown'} — ${status}`), {
        extra: { endpoint, status },
      });
    }
  }

  return next(action);
};
