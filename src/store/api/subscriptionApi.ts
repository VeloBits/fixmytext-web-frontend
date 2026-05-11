import { createApi } from '@reduxjs/toolkit/query/react';
import type { components } from '../../types/openapi';
import { baseQueryWithRetry } from './baseQuery';

type SubscriptionStatus = components['schemas']['SubscriptionStatus'];
type RazorpayProOrderResponse = components['schemas']['RazorpayProOrderResponse'];
type RazorpayProVerifyRequest = components['schemas']['RazorpayProVerifyRequest'];

export const subscriptionApi = createApi({
  reducerPath: 'subscriptionApi',
  baseQuery: baseQueryWithRetry,
  tagTypes: ['Subscription'],
  endpoints: (builder) => ({
    getSubscriptionStatus: builder.query<SubscriptionStatus, void>({
      query: () => '/api/v1/subscription/status',
      providesTags: ['Subscription'],
    }),

    // Razorpay: create order for Pro upgrade (one-time payment)
    createProCheckout: builder.mutation<RazorpayProOrderResponse, void>({
      query: () => ({ url: '/api/v1/subscription/checkout', method: 'POST' }),
    }),

    // Razorpay: verify Pro payment
    verifyProPayment: builder.mutation<unknown, RazorpayProVerifyRequest>({
      query: (body) => ({ url: '/api/v1/subscription/verify', method: 'POST', body }),
      invalidatesTags: ['Subscription'],
    }),

    // Cancel Pro subscription
    cancelSubscription: builder.mutation<unknown, void>({
      query: () => ({ url: '/api/v1/subscription/cancel', method: 'POST' }),
      invalidatesTags: ['Subscription'],
    }),
  }),
});

export const {
  useGetSubscriptionStatusQuery,
  useCreateProCheckoutMutation,
  useVerifyProPaymentMutation,
  useCancelSubscriptionMutation,
} = subscriptionApi;
