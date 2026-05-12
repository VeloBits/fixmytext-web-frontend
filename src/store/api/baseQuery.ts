/// <reference types="vite/client" />
import {
  fetchBaseQuery,
  retry,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
  type FetchBaseQueryMeta,
} from '@reduxjs/toolkit/query/react';
import type { RootState } from '@/store/store';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/** Maximum number of token refresh attempts before forcing logout. */
const MAX_REFRESH_RETRIES = 1;

type ExtraHeadersFn = (headers: Headers, api: { getState: () => unknown }) => void;

type RtkBaseQuery = BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError,
  Record<string, unknown>,
  FetchBaseQueryMeta
>;

// Simple mutex — no external dependency
let refreshPromise: Promise<boolean> | null = null;
let retryCount = 0;

/**
 * Create a fetchBaseQuery with auth token injection.
 * Accepts an optional extraHeaders callback for additional headers.
 */
export function createAuthBaseQuery(extraHeaders?: ExtraHeadersFn): RtkBaseQuery {
  return fetchBaseQuery({
    baseUrl: BASE_URL,
    credentials: 'include',
    prepareHeaders: (headers, api) => {
      const token = (api.getState() as RootState).auth.accessToken;
      if (token) headers.set('Authorization', `Bearer ${token}`);
      if (extraHeaders) extraHeaders(headers, api);
      return headers;
    },
  }) as RtkBaseQuery;
}

const defaultBaseQuery = createAuthBaseQuery();

/**
 * Creates a baseQueryWithReauth that wraps a given rawBaseQuery.
 * On 401, refreshes the token once and retries.
 */
function createReauthQuery(rawBaseQuery: RtkBaseQuery): RtkBaseQuery {
  return async (args, api, extraOptions) => {
    let result = await rawBaseQuery(args, api, extraOptions);

    // Skip reauth for auth endpoints to avoid infinite loops
    const url = typeof args === 'string' ? args : (args as FetchArgs)?.url;
    const isAuthEndpoint =
      url &&
      (url.includes('/auth/refresh') ||
        url.includes('/auth/login') ||
        url.includes('/auth/register'));

    if (result.error && (result.error as FetchBaseQueryError & { status?: number }).status === 401 && !isAuthEndpoint) {
      // Only attempt refresh if we haven't exceeded the retry limit
      if (!refreshPromise && retryCount < MAX_REFRESH_RETRIES) {
        retryCount++;
        refreshPromise = Promise.resolve(
          defaultBaseQuery({ url: '/api/v1/auth/refresh', method: 'POST' }, api, extraOptions)
        )
          .then((refreshResult) => {
            if (refreshResult.data) {
              api.dispatch({
                type: 'auth/tokenRefreshed',
                payload: (refreshResult.data as { access_token: string }).access_token,
              });
              return true;
            } else {
              retryCount = 0;
              api.dispatch({ type: 'auth/logout' });
              return false;
            }
          })
          .finally(() => {
            refreshPromise = null;
          });
      } else if (!refreshPromise) {
        // Max retries exceeded — force logout to prevent infinite refresh loops
        retryCount = 0;
        api.dispatch({ type: 'auth/logout' });
        return result;
      }

      const refreshed = await refreshPromise;
      if (refreshed) {
        // Retry original request with new token
        result = await rawBaseQuery(args, api, extraOptions);
      }
    }

    // Reset retry counter on successful requests
    if (!result.error) {
      retryCount = 0;
    }

    return result;
  };
}

/** Default reauth base query (standard auth headers only) */
export const baseQueryWithReauth = createReauthQuery(defaultBaseQuery);

/** Create a reauth base query with custom extra headers */
export function createBaseQueryWithReauth(extraHeaders: ExtraHeadersFn): RtkBaseQuery {
  return createReauthQuery(createAuthBaseQuery(extraHeaders));
}

/**
 * Reauth base query with automatic retry for transient server errors (5xx).
 * Use this for read-heavy APIs (queries). Mutations should NOT use this.
 */
 
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function retryCondition(_error: any, _args: any, { attempt }: { attempt: number }): boolean {
  if ((_error as FetchBaseQueryError & { status?: number })?.status &&
      (_error as FetchBaseQueryError & { status?: number }).status! < 500) return false;
  return attempt <= 2;
}

export const baseQueryWithRetry = retry(baseQueryWithReauth, {
  maxRetries: 2,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  retryCondition: retryCondition as any,
}) as RtkBaseQuery & { _retryOptions?: { maxRetries: number; retryCondition: (...args: unknown[]) => boolean } };
