import { createApi } from '@reduxjs/toolkit/query/react';
import type { components } from '../../types/openapi';
import { baseQueryWithRetry } from './baseQuery';

type UserResponse = components['schemas']['UserResponse'];

export const authApi = createApi({
  reducerPath: 'authApi',
  // Reauth + transient retry: a rate-limited (429) or flaky /auth/me must not
  // read as "signed out" — see AppContext's userResolving/guest handling.
  // resendVerification is a mutation, so the retry wrapper skips it.
  baseQuery: baseQueryWithRetry,
  tagTypes: ['Me'],
  endpoints: (builder) => ({
    getMe: builder.query<UserResponse, void>({
      query: () => '/api/v1/auth/me',
      providesTags: ['Me'],
    }),
    resendVerification: builder.mutation<void, void>({
      query: () => ({
        url: '/api/v1/auth/resend-verification',
        method: 'POST',
      }),
    }),
  }),
});

export const { useGetMeQuery, useResendVerificationMutation } = authApi;
