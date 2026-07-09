/// <reference types="vite/client" />
import {
  fetchBaseQuery,
  retry,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
  type FetchBaseQueryMeta,
} from '@reduxjs/toolkit/query/react';
import { userManager } from '../../auth/userManager';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

type ExtraHeadersFn = (headers: Headers, api: { getState: () => unknown }) => void;

type RtkBaseQuery = BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError,
  Record<string, unknown>,
  FetchBaseQueryMeta
>;

/**
 * Create a fetchBaseQuery with OIDC token injection via oidc-client-ts.
 * Accepts an optional extraHeaders callback for additional headers.
 */
export function createAuthBaseQuery(extraHeaders?: ExtraHeadersFn): RtkBaseQuery {
  return fetchBaseQuery({
    baseUrl: BASE_URL,
    credentials: 'include',
    prepareHeaders: async (headers, api) => {
      const user = await userManager.getUser();
      if (user?.access_token) {
        headers.set('Authorization', `Bearer ${user.access_token}`);
      }
      if (extraHeaders) extraHeaders(headers, api);
      return headers;
    },
  }) as RtkBaseQuery;
}

const defaultBaseQuery = createAuthBaseQuery();

/** True for safe/idempotent requests (string args are GETs). */
function isIdempotent(args: string | FetchArgs): boolean {
  if (typeof args === 'string') return true;
  const method = (args.method ?? 'GET').toUpperCase();
  return method === 'GET' || method === 'HEAD' || method === 'OPTIONS';
}

/**
 * Creates a baseQueryWithReauth that wraps a given rawBaseQuery.
 * On 401, attempts a silent renew via oidc-client-ts. The refreshed token is
 * available for subsequent requests, but the original request is auto-retried
 * ONLY when it is idempotent — retrying a mutation after reauth can
 * double-submit (the first attempt may have already succeeded), so mutations
 * surface the 401 and the caller re-issues with the fresh token (FE-AUTH-04).
 * Falls back to redirect-to-login if silent renew fails.
 */
function createReauthQuery(rawBaseQuery: RtkBaseQuery): RtkBaseQuery {
  return async (args, api, extraOptions) => {
    let result = await rawBaseQuery(args, api, extraOptions);

    if (
      result.error &&
      (result.error as FetchBaseQueryError & { status?: number }).status === 401
    ) {
      try {
        await userManager.signinSilent();
      } catch {
        // Silent renew failed — redirect to Keycloak login
        await userManager.signinRedirect();
        return result;
      }
      // Retry only safe/idempotent requests; never auto-retry a mutation.
      if (isIdempotent(args)) {
        result = await rawBaseQuery(args, api, extraOptions);
      }
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
  if (
    (_error as FetchBaseQueryError & { status?: number })?.status &&
    (_error as FetchBaseQueryError & { status?: number }).status! < 500
  )
    return false;
  return attempt <= 2;
}

export const baseQueryWithRetry = retry(baseQueryWithReauth, {
  maxRetries: 2,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  retryCondition: retryCondition as any,
}) as RtkBaseQuery & {
  _retryOptions?: { maxRetries: number; retryCondition: (...args: unknown[]) => boolean };
};
