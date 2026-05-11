import { createApi } from '@reduxjs/toolkit/query/react';
import type { components } from '../../types/openapi';
import { baseQueryWithRetry } from './baseQuery';

type HistoryListResponse = components['schemas']['HistoryListResponse'];
type HistoryResponse = components['schemas']['HistoryResponse'];
type HistoryCreate = components['schemas']['HistoryCreate'];

export interface GetHistoryArg {
  page?: number;
  pageSize?: number;
  toolId?: string;
}

export const historyApi = createApi({
  reducerPath: 'historyApi',
  baseQuery: baseQueryWithRetry,
  tagTypes: ['History'],
  endpoints: (builder) => ({
    // Paginated list
    getHistory: builder.query<HistoryListResponse, GetHistoryArg | void>({
      query: ({ page = 1, pageSize = 25, toolId } = {}) => {
        const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
        if (toolId) params.set('tool_id', toolId);
        return `/api/v1/history?${params}`;
      },
      providesTags: ['History'],
    }),

    // Record new operation
    recordOperation: builder.mutation<HistoryResponse, HistoryCreate>({
      query: (body) => ({ url: '/api/v1/history', method: 'POST', body }),
      invalidatesTags: ['History'],
    }),

    // Delete single entry
    deleteHistoryEntry: builder.mutation<void, string>({
      query: (id) => ({ url: `/api/v1/history/${id}`, method: 'DELETE' }),
      invalidatesTags: ['History'],
    }),

    // Clear all history
    clearHistory: builder.mutation<void, void>({
      query: () => ({ url: '/api/v1/history', method: 'DELETE' }),
      invalidatesTags: ['History'],
    }),
  }),
});

export const {
  useGetHistoryQuery,
  useRecordOperationMutation,
  useDeleteHistoryEntryMutation,
  useClearHistoryMutation,
} = historyApi;
