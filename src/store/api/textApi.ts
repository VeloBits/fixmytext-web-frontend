import { createApi } from '@reduxjs/toolkit/query/react';
import type { components } from '@/types/openapi';
import { createBaseQueryWithReauth } from './baseQuery';
import { getVisitorId } from '@/hooks/useFingerprint';

type TextResponse = components['schemas']['TextResponse'];

export interface TransformTextArg {
  endpoint: string;
  text: string;
  [key: string]: unknown;
}

export const textApi = createApi({
  reducerPath: 'textApi',
  baseQuery: createBaseQueryWithReauth((headers) => {
    // Always send visitor fingerprint for server-side trial tracking
    headers.set('X-Visitor-Id', getVisitorId());
  }),
  endpoints: (builder) => ({
    transformText: builder.mutation<TextResponse, TransformTextArg>({
      query: ({ endpoint, text, ...params }) => ({
        url: endpoint,
        method: 'POST',
        body: { text, ...params },
      }),
    }),
  }),
});

export const { useTransformTextMutation } = textApi;
