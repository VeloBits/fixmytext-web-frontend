import { createApi } from '@reduxjs/toolkit/query/react';
import type { components } from '@/types/openapi';
import { createAuthBaseQuery } from './baseQuery';

type UserResponse = components['schemas']['UserResponse'];

export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery: createAuthBaseQuery(),
  tagTypes: ['Me'],
  endpoints: (builder) => ({
    getMe: builder.query<UserResponse, void>({
      query: () => '/api/v1/auth/me',
      providesTags: ['Me'],
    }),
  }),
});

export const { useGetMeQuery } = authApi;
