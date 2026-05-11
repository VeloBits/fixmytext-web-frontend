import { createApi } from '@reduxjs/toolkit/query/react';
import type { components } from '../../types/openapi';
import { baseQueryWithReauth } from './baseQuery';

type ShareCreate = components['schemas']['ShareCreate'];
type ShareResponse = components['schemas']['ShareResponse'];
type SharedResultView = components['schemas']['SharedResultView'];

export const shareApi = createApi({
  reducerPath: 'shareApi',
  baseQuery: baseQueryWithReauth,
  endpoints: (builder) => ({
    createShare: builder.mutation<ShareResponse, ShareCreate>({
      query: (body) => ({ url: '/api/v1/share', method: 'POST', body }),
    }),
    getShare: builder.query<SharedResultView, string>({
      query: (id) => `/api/v1/share/${id}`,
    }),
  }),
});

export const { useCreateShareMutation, useGetShareQuery } = shareApi;
