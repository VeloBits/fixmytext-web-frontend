import { createApi } from '@reduxjs/toolkit/query/react';
import type { components } from '@/types/openapi';
import { baseQueryWithReauth } from './baseQuery';

type TokenResponse = components['schemas']['TokenResponse'];
type UserResponse = components['schemas']['UserResponse'];
type LoginRequest = components['schemas']['LoginRequest'];
type RegisterRequest = components['schemas']['RegisterRequest'];
type ForgotPasswordRequest = components['schemas']['ForgotPasswordRequest'];
type ForgotPasswordResponse = components['schemas']['ForgotPasswordResponse'];
type ResetPasswordRequest = components['schemas']['ResetPasswordRequest'];
type ResetPasswordResponse = components['schemas']['ResetPasswordResponse'];
type VerifyEmailRequest = components['schemas']['VerifyEmailRequest'];
type VerifyEmailResponse = components['schemas']['VerifyEmailResponse'];
type ResendVerificationResponse = components['schemas']['ResendVerificationResponse'];

export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Me'],
  endpoints: (builder) => ({
    register: builder.mutation<TokenResponse, RegisterRequest>({
      query: (body) => ({ url: '/api/v1/auth/register', method: 'POST', body }),
      invalidatesTags: ['Me'],
    }),
    login: builder.mutation<TokenResponse, LoginRequest>({
      query: (body) => ({ url: '/api/v1/auth/login', method: 'POST', body }),
      invalidatesTags: ['Me'],
    }),
    logout: builder.mutation<void, void>({
      query: () => ({ url: '/api/v1/auth/logout', method: 'POST' }),
    }),
    refresh: builder.mutation<TokenResponse, void>({
      query: () => ({ url: '/api/v1/auth/refresh', method: 'POST' }),
      invalidatesTags: ['Me'],
    }),
    getMe: builder.query<UserResponse, void>({
      query: () => '/api/v1/auth/me',
      providesTags: ['Me'],
    }),
    forgotPassword: builder.mutation<ForgotPasswordResponse, ForgotPasswordRequest>({
      query: (body) => ({ url: '/api/v1/auth/forgot-password', method: 'POST', body }),
    }),
    resetPassword: builder.mutation<ResetPasswordResponse, ResetPasswordRequest>({
      query: (body) => ({ url: '/api/v1/auth/reset-password', method: 'POST', body }),
    }),
    verifyEmail: builder.mutation<VerifyEmailResponse, VerifyEmailRequest>({
      query: (body) => ({ url: '/api/v1/auth/verify-email', method: 'POST', body }),
      // Refetch /me so the UI reflects the new verification status.
      invalidatesTags: ['Me'],
    }),
    resendVerification: builder.mutation<ResendVerificationResponse, void>({
      query: () => ({ url: '/api/v1/auth/resend-verification', method: 'POST' }),
    }),
  }),
});

export const {
  useRegisterMutation,
  useLoginMutation,
  useLogoutMutation,
  useRefreshMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useVerifyEmailMutation,
  useResendVerificationMutation,

  useGetMeQuery,
} = authApi;
