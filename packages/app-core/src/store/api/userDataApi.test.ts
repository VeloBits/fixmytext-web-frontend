import { configureStore } from '@reduxjs/toolkit';
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

describe('userDataApi endpoint execution', () => {
  const mockFetch = vi.fn();

  function makeStore() {
    return configureStore({
      reducer: { [userDataApi.reducerPath]: userDataApi.reducer },
      middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(userDataApi.middleware),
    });
  }

  function lastRequest(): Request {
    return mockFetch.mock.calls[mockFetch.mock.calls.length - 1][0] as Request;
  }

  beforeEach(() => {
    mockFetch.mockReset();
    vi.stubGlobal('fetch', mockFetch);
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({}), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each([
    ['getPreferences', '/api/v1/user/preferences'],
    ['getGamification', '/api/v1/user/gamification'],
    ['getTemplates', '/api/v1/user/templates'],
    ['getUiSettings', '/api/v1/user/ui-settings'],
    ['getFavorites', '/api/v1/user/favorites'],
    ['getToolStats', '/api/v1/user/tool-stats'],
    ['getDiscoveredTools', '/api/v1/user/discovered-tools'],
    ['getSpinHistory', '/api/v1/user/spin-history'],
    ['getPipelines', '/api/v1/user/pipelines'],
  ] as const)('%s issues a GET to %s', async (endpointName, path) => {
    const store = makeStore();

    await store.dispatch(userDataApi.endpoints[endpointName].initiate());

    const request = lastRequest();
    expect(request.url).toContain(path);
    expect(request.method).toBe('GET');
  });

  it('updatePreferences issues a PUT to /api/v1/user/preferences', async () => {
    const store = makeStore();

    await store.dispatch(userDataApi.endpoints.updatePreferences.initiate({ theme: 'dark' }));

    const request = lastRequest();
    expect(request.url).toContain('/api/v1/user/preferences');
    expect(request.method).toBe('PUT');
  });

  it('updateGamification issues a PUT to /api/v1/user/gamification', async () => {
    const store = makeStore();

    await store.dispatch(userDataApi.endpoints.updateGamification.initiate({ xp: 10 }));

    const request = lastRequest();
    expect(request.url).toContain('/api/v1/user/gamification');
    expect(request.method).toBe('PUT');
  });

  it('createTemplate issues a POST to /api/v1/user/templates', async () => {
    const store = makeStore();

    await store.dispatch(
      userDataApi.endpoints.createTemplate.initiate({ name: 'Greeting', text: 'Hello there' })
    );

    const request = lastRequest();
    expect(request.url).toContain('/api/v1/user/templates');
    expect(request.method).toBe('POST');
  });

  it('updateTemplate issues a PUT to /api/v1/user/templates/:id', async () => {
    const store = makeStore();

    await store.dispatch(
      userDataApi.endpoints.updateTemplate.initiate({ id: 'tpl-1', name: 'Renamed' })
    );

    const request = lastRequest();
    expect(request.url).toContain('/api/v1/user/templates/tpl-1');
    expect(request.method).toBe('PUT');
  });

  it('deleteTemplate issues a DELETE to /api/v1/user/templates/:id', async () => {
    const store = makeStore();

    await store.dispatch(userDataApi.endpoints.deleteTemplate.initiate('tpl-1'));

    const request = lastRequest();
    expect(request.url).toContain('/api/v1/user/templates/tpl-1');
    expect(request.method).toBe('DELETE');
  });

  it('updateUiSettings issues a PUT to /api/v1/user/ui-settings', async () => {
    const store = makeStore();

    await store.dispatch(userDataApi.endpoints.updateUiSettings.initiate({ tool_view: 'grid' }));

    const request = lastRequest();
    expect(request.url).toContain('/api/v1/user/ui-settings');
    expect(request.method).toBe('PUT');
  });

  it('addFavorite issues a POST to /api/v1/user/favorites/:toolId', async () => {
    const store = makeStore();

    await store.dispatch(userDataApi.endpoints.addFavorite.initiate('uppercase'));

    const request = lastRequest();
    expect(request.url).toContain('/api/v1/user/favorites/uppercase');
    expect(request.method).toBe('POST');
  });

  it('removeFavorite issues a DELETE to /api/v1/user/favorites/:toolId', async () => {
    const store = makeStore();

    await store.dispatch(userDataApi.endpoints.removeFavorite.initiate('uppercase'));

    const request = lastRequest();
    expect(request.url).toContain('/api/v1/user/favorites/uppercase');
    expect(request.method).toBe('DELETE');
  });

  it('createPipeline issues a POST to /api/v1/user/pipelines', async () => {
    const store = makeStore();

    await store.dispatch(
      userDataApi.endpoints.createPipeline.initiate({ name: 'My pipeline', steps: [] })
    );

    const request = lastRequest();
    expect(request.url).toContain('/api/v1/user/pipelines');
    expect(request.method).toBe('POST');
  });

  it('updatePipeline issues a PUT to /api/v1/user/pipelines/:id', async () => {
    const store = makeStore();

    await store.dispatch(
      userDataApi.endpoints.updatePipeline.initiate({ id: 'pipe-1', name: 'Renamed' })
    );

    const request = lastRequest();
    expect(request.url).toContain('/api/v1/user/pipelines/pipe-1');
    expect(request.method).toBe('PUT');
  });

  it('deletePipeline issues a DELETE to /api/v1/user/pipelines/:id', async () => {
    const store = makeStore();

    await store.dispatch(userDataApi.endpoints.deletePipeline.initiate('pipe-1'));

    const request = lastRequest();
    expect(request.url).toContain('/api/v1/user/pipelines/pipe-1');
    expect(request.method).toBe('DELETE');
  });
});
