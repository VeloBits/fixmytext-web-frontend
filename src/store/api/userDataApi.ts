import { createApi } from '@reduxjs/toolkit/query/react';
import type { components } from '../../types/openapi';
import { baseQueryWithRetry } from './baseQuery';

type PreferencesResponse = components['schemas']['PreferencesResponse'];
type PreferencesUpdate = components['schemas']['PreferencesUpdate'];
type GamificationResponse = components['schemas']['GamificationResponse'];
type GamificationUpdate = components['schemas']['GamificationUpdate'];
type TemplateResponse = components['schemas']['TemplateResponse'];
type TemplateCreate = components['schemas']['TemplateCreate'];
type TemplateUpdate = components['schemas']['TemplateUpdate'];
type UiSettingsResponse = components['schemas']['UiSettingsResponse'];
type UiSettingsUpdate = components['schemas']['UiSettingsUpdate'];
type FavoritesResponse = components['schemas']['FavoritesResponse'];
type ToolStatsResponse = components['schemas']['ToolStatsResponse'];
type DiscoveredToolsResponse = components['schemas']['DiscoveredToolsResponse'];
type SpinHistoryResponse = components['schemas']['SpinHistoryResponse'];
type PipelineResponse = components['schemas']['PipelineResponse'];
type PipelineCreate = components['schemas']['PipelineCreate'];
type PipelineUpdate = components['schemas']['PipelineUpdate'];

export interface UpdateTemplateArg extends TemplateUpdate {
  id: string;
}

export interface UpdatePipelineArg extends PipelineUpdate {
  id: string;
}

export const userDataApi = createApi({
  reducerPath: 'userDataApi',
  baseQuery: baseQueryWithRetry,
  tagTypes: [
    'Preferences',
    'Gamification',
    'Templates',
    'UiSettings',
    'Favorites',
    'ToolStats',
    'Pipelines',
    'DiscoveredTools',
    'SpinHistory',
  ],
  endpoints: (builder) => ({
    // Preferences
    getPreferences: builder.query<PreferencesResponse, void>({
      query: () => '/api/v1/user/preferences',
      providesTags: ['Preferences'],
    }),
    updatePreferences: builder.mutation<PreferencesResponse, PreferencesUpdate>({
      query: (body) => ({ url: '/api/v1/user/preferences', method: 'PUT', body }),
      invalidatesTags: ['Preferences'],
    }),

    // Gamification
    getGamification: builder.query<GamificationResponse, void>({
      query: () => '/api/v1/user/gamification',
      providesTags: ['Gamification'],
    }),
    updateGamification: builder.mutation<GamificationResponse, GamificationUpdate>({
      query: (body) => ({ url: '/api/v1/user/gamification', method: 'PUT', body }),
      invalidatesTags: ['Gamification'],
    }),

    // Templates
    getTemplates: builder.query<TemplateResponse[], void>({
      query: () => '/api/v1/user/templates',
      providesTags: ['Templates'],
    }),
    createTemplate: builder.mutation<TemplateResponse, TemplateCreate>({
      query: (body) => ({ url: '/api/v1/user/templates', method: 'POST', body }),
      invalidatesTags: ['Templates'],
    }),
    updateTemplate: builder.mutation<TemplateResponse, UpdateTemplateArg>({
      query: ({ id, ...body }) => ({ url: `/api/v1/user/templates/${id}`, method: 'PUT', body }),
      invalidatesTags: ['Templates'],
    }),
    deleteTemplate: builder.mutation<void, string>({
      query: (id) => ({ url: `/api/v1/user/templates/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Templates'],
    }),

    // UI Settings (keybindings, tool_view, panel_sizes)
    getUiSettings: builder.query<UiSettingsResponse, void>({
      query: () => '/api/v1/user/ui-settings',
      providesTags: ['UiSettings'],
    }),
    updateUiSettings: builder.mutation<UiSettingsResponse, UiSettingsUpdate>({
      query: (body) => ({ url: '/api/v1/user/ui-settings', method: 'PUT', body }),
      invalidatesTags: ['UiSettings'],
    }),

    // Favorites
    getFavorites: builder.query<FavoritesResponse, void>({
      query: () => '/api/v1/user/favorites',
      providesTags: ['Favorites'],
    }),
    addFavorite: builder.mutation<void, string>({
      query: (toolId) => ({ url: `/api/v1/user/favorites/${toolId}`, method: 'POST' }),
      invalidatesTags: ['Favorites'],
    }),
    removeFavorite: builder.mutation<void, string>({
      query: (toolId) => ({ url: `/api/v1/user/favorites/${toolId}`, method: 'DELETE' }),
      invalidatesTags: ['Favorites'],
    }),

    // Tool Stats (lifetime per-tool usage)
    getToolStats: builder.query<ToolStatsResponse, void>({
      query: () => '/api/v1/user/tool-stats',
      providesTags: ['ToolStats'],
    }),

    // Discovered tools (from dedicated table)
    getDiscoveredTools: builder.query<DiscoveredToolsResponse, void>({
      query: () => '/api/v1/user/discovered-tools',
      providesTags: ['DiscoveredTools'],
    }),

    // Spin history
    getSpinHistory: builder.query<SpinHistoryResponse, void>({
      query: () => '/api/v1/user/spin-history',
      providesTags: ['SpinHistory'],
    }),

    // Pipelines
    getPipelines: builder.query<PipelineResponse[], void>({
      query: () => '/api/v1/user/pipelines',
      providesTags: ['Pipelines'],
    }),
    createPipeline: builder.mutation<PipelineResponse, PipelineCreate>({
      query: (body) => ({ url: '/api/v1/user/pipelines', method: 'POST', body }),
      invalidatesTags: ['Pipelines'],
    }),
    updatePipeline: builder.mutation<PipelineResponse, UpdatePipelineArg>({
      query: ({ id, ...body }) => ({ url: `/api/v1/user/pipelines/${id}`, method: 'PUT', body }),
      invalidatesTags: ['Pipelines'],
    }),
    deletePipeline: builder.mutation<void, string>({
      query: (id) => ({ url: `/api/v1/user/pipelines/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Pipelines'],
    }),
  }),
});

export const {
  useGetPreferencesQuery,
  useUpdatePreferencesMutation,
  useGetGamificationQuery,
  useUpdateGamificationMutation,
  useGetTemplatesQuery,
  useCreateTemplateMutation,
  useUpdateTemplateMutation,
  useDeleteTemplateMutation,
  useGetUiSettingsQuery,
  useUpdateUiSettingsMutation,
  useGetFavoritesQuery,
  useAddFavoriteMutation,
  useRemoveFavoriteMutation,
  useGetToolStatsQuery,
  useGetDiscoveredToolsQuery,
  useGetSpinHistoryQuery,
  useGetPipelinesQuery,
  useCreatePipelineMutation,
  useUpdatePipelineMutation,
  useDeletePipelineMutation,
} = userDataApi;
