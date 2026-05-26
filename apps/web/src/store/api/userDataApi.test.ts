import {
  userDataApi,
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
} from './userDataApi';

describe('userDataApi', () => {
  it('has reducerPath "userDataApi"', () => {
    expect(userDataApi.reducerPath).toBe('userDataApi');
  });

  it('has a reducer function', () => {
    expect(typeof userDataApi.reducer).toBe('function');
  });

  it('has middleware function', () => {
    expect(typeof userDataApi.middleware).toBe('function');
  });

  it('defines all expected endpoints', () => {
    const names = Object.keys(userDataApi.endpoints);
    const expected = [
      'getPreferences',
      'updatePreferences',
      'getGamification',
      'updateGamification',
      'getTemplates',
      'createTemplate',
      'updateTemplate',
      'deleteTemplate',
      'getUiSettings',
      'updateUiSettings',
      'getFavorites',
      'addFavorite',
      'removeFavorite',
      'getToolStats',
      'getDiscoveredTools',
      'getSpinHistory',
      'getPipelines',
      'createPipeline',
      'updatePipeline',
      'deletePipeline',
    ];
    for (const name of expected) {
      expect(names).toContain(name);
    }
  });

  it('exports all hooks', () => {
    expect(typeof useGetPreferencesQuery).toBe('function');
    expect(typeof useUpdatePreferencesMutation).toBe('function');
    expect(typeof useGetGamificationQuery).toBe('function');
    expect(typeof useUpdateGamificationMutation).toBe('function');
    expect(typeof useGetTemplatesQuery).toBe('function');
    expect(typeof useCreateTemplateMutation).toBe('function');
    expect(typeof useUpdateTemplateMutation).toBe('function');
    expect(typeof useDeleteTemplateMutation).toBe('function');
    expect(typeof useGetUiSettingsQuery).toBe('function');
    expect(typeof useUpdateUiSettingsMutation).toBe('function');
    expect(typeof useGetFavoritesQuery).toBe('function');
    expect(typeof useAddFavoriteMutation).toBe('function');
    expect(typeof useRemoveFavoriteMutation).toBe('function');
    expect(typeof useGetToolStatsQuery).toBe('function');
    expect(typeof useGetDiscoveredToolsQuery).toBe('function');
    expect(typeof useGetSpinHistoryQuery).toBe('function');
    expect(typeof useGetPipelinesQuery).toBe('function');
  });
});
