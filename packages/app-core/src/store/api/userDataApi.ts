import { createApi } from '@reduxjs/toolkit/query/react';
import type { components } from '../../types/openapi';
import { baseQueryWithRetry } from './baseQuery';

type PreferencesResponse = components['schemas']['PreferencesResponse'];
type PreferencesUpdate = components['schemas']['PreferencesUpdate'];
type TemplateResponse = components['schemas']['TemplateResponse'];
type TemplateCreate = components['schemas']['TemplateCreate'];
type TemplateUpdate = components['schemas']['TemplateUpdate'];
type UiSettingsResponse = components['schemas']['UiSettingsResponse'];
type UiSettingsUpdate = components['schemas']['UiSettingsUpdate'];
type FavoritesResponse = components['schemas']['FavoritesResponse'];
type ToolGroupsResponse = components['schemas']['ToolGroupsResponse'];
type ToolGroupResponse = components['schemas']['ToolGroupResponse'];
type ToolGroupCreate = components['schemas']['ToolGroupCreate'];
type ToolStatsResponse = components['schemas']['ToolStatsResponse'];
type SpinHistoryResponse = components['schemas']['SpinHistoryResponse'];

export interface UpdateTemplateArg extends TemplateUpdate {
  id: string;
}

export interface RenameToolGroupArg {
  id: string;
  name: string;
}

export interface ToolGroupItemArg {
  groupId: string;
  toolId: string;
}

export interface SetToolGroupToolsArg {
  groupId: string;
  /** Full ordered list — array position becomes sort_order (covers reorder,
   * bulk add, and bulk remove in one idempotent call). */
  toolIds: string[];
}

export const userDataApi = createApi({
  reducerPath: 'userDataApi',
  baseQuery: baseQueryWithRetry,
  tagTypes: [
    'Preferences',
    'Templates',
    'UiSettings',
    'Favorites',
    'ToolGroups',
    'ToolStats',
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

    // Tool Groups (user-created named groups of tools)
    getToolGroups: builder.query<ToolGroupsResponse, void>({
      query: () => '/api/v1/user/tool-groups',
      providesTags: ['ToolGroups'],
    }),
    createToolGroup: builder.mutation<ToolGroupResponse, ToolGroupCreate>({
      query: (body) => ({ url: '/api/v1/user/tool-groups', method: 'POST', body }),
      invalidatesTags: ['ToolGroups'],
    }),
    renameToolGroup: builder.mutation<ToolGroupResponse, RenameToolGroupArg>({
      query: ({ id, name }) => ({
        url: `/api/v1/user/tool-groups/${id}`,
        method: 'PUT',
        body: { name },
      }),
      invalidatesTags: ['ToolGroups'],
    }),
    deleteToolGroup: builder.mutation<void, string>({
      query: (id) => ({ url: `/api/v1/user/tool-groups/${id}`, method: 'DELETE' }),
      invalidatesTags: ['ToolGroups'],
    }),
    addToolToGroup: builder.mutation<void, ToolGroupItemArg>({
      query: ({ groupId, toolId }) => ({
        url: `/api/v1/user/tool-groups/${groupId}/tools/${toolId}`,
        method: 'POST',
      }),
      invalidatesTags: ['ToolGroups'],
    }),
    removeToolFromGroup: builder.mutation<void, ToolGroupItemArg>({
      query: ({ groupId, toolId }) => ({
        url: `/api/v1/user/tool-groups/${groupId}/tools/${toolId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['ToolGroups'],
    }),
    setToolGroupTools: builder.mutation<ToolGroupResponse, SetToolGroupToolsArg>({
      query: ({ groupId, toolIds }) => ({
        url: `/api/v1/user/tool-groups/${groupId}/tools`,
        method: 'PUT',
        body: { tool_ids: toolIds },
      }),
      invalidatesTags: ['ToolGroups'],
    }),
    reorderToolGroups: builder.mutation<ToolGroupsResponse, string[]>({
      query: (groupIds) => ({
        url: '/api/v1/user/tool-groups/order',
        method: 'PUT',
        body: { group_ids: groupIds },
      }),
      invalidatesTags: ['ToolGroups'],
    }),

    // Tool Stats (lifetime per-tool usage)
    getToolStats: builder.query<ToolStatsResponse, void>({
      query: () => '/api/v1/user/tool-stats',
      providesTags: ['ToolStats'],
    }),

    // Spin history
    getSpinHistory: builder.query<SpinHistoryResponse, void>({
      query: () => '/api/v1/user/spin-history',
      providesTags: ['SpinHistory'],
    }),
  }),
});

export const {
  useGetPreferencesQuery,
  useUpdatePreferencesMutation,
  useGetTemplatesQuery,
  useCreateTemplateMutation,
  useUpdateTemplateMutation,
  useDeleteTemplateMutation,
  useGetUiSettingsQuery,
  useUpdateUiSettingsMutation,
  useGetFavoritesQuery,
  useAddFavoriteMutation,
  useRemoveFavoriteMutation,
  useGetToolGroupsQuery,
  useCreateToolGroupMutation,
  useRenameToolGroupMutation,
  useDeleteToolGroupMutation,
  useAddToolToGroupMutation,
  useRemoveToolFromGroupMutation,
  useSetToolGroupToolsMutation,
  useReorderToolGroupsMutation,
  useGetToolStatsQuery,
  useGetSpinHistoryQuery,
} = userDataApi;
