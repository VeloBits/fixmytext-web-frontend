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
  useCreatePipelineMutation,
  useUpdatePipelineMutation,
  useDeletePipelineMutation,
} from './userDataApi';

function createStore() {
  return configureStore({
    reducer: { [userDataApi.reducerPath]: userDataApi.reducer },
    middleware: (gDM) => gDM().concat(userDataApi.middleware),
  });
}

const ok200 = () =>
  new Response(JSON.stringify({}), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

function lastRequest(): Request {
  const calls = (fetch as ReturnType<typeof vi.fn>).mock.calls;
  return calls[calls.length - 1]![0] as Request;
}

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
      'getPreferences', 'updatePreferences', 'getGamification', 'updateGamification',
      'getTemplates', 'createTemplate', 'updateTemplate', 'deleteTemplate',
      'getUiSettings', 'updateUiSettings', 'getFavorites', 'addFavorite', 'removeFavorite',
      'getToolStats', 'getDiscoveredTools', 'getSpinHistory',
      'getPipelines', 'createPipeline', 'updatePipeline', 'deletePipeline',
    ];
    for (const name of expected) expect(names).toContain(name);
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
    expect(typeof useCreatePipelineMutation).toBe('function');
    expect(typeof useUpdatePipelineMutation).toBe('function');
    expect(typeof useDeletePipelineMutation).toBe('function');
  });
});

describe('userDataApi endpoint query callbacks', () => {
  let store: ReturnType<typeof createStore>;

  beforeEach(() => {
    store = createStore();
    vi.spyOn(global, 'fetch').mockResolvedValue(ok200());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('getPreferences fetches the preferences URL', async () => {
    await store.dispatch(userDataApi.endpoints.getPreferences.initiate());
    expect(lastRequest().url).toContain('/api/v1/user/preferences');
  });

  it('updatePreferences sends PUT to preferences URL', async () => {
    await store.dispatch(
      userDataApi.endpoints.updatePreferences.initiate({ theme: 'dark' } as never),
    );
    const req = lastRequest();
    expect(req.url).toContain('/api/v1/user/preferences');
    expect(req.method).toBe('PUT');
  });

  it('getGamification fetches the gamification URL', async () => {
    await store.dispatch(userDataApi.endpoints.getGamification.initiate());
    expect(lastRequest().url).toContain('/api/v1/user/gamification');
  });

  it('updateGamification sends PUT to gamification URL', async () => {
    await store.dispatch(
      userDataApi.endpoints.updateGamification.initiate({ xp: 100 } as never),
    );
    const req = lastRequest();
    expect(req.url).toContain('/api/v1/user/gamification');
    expect(req.method).toBe('PUT');
  });

  it('getTemplates fetches the templates URL', async () => {
    await store.dispatch(userDataApi.endpoints.getTemplates.initiate());
    expect(lastRequest().url).toContain('/api/v1/user/templates');
  });

  it('createTemplate sends POST to templates URL', async () => {
    await store.dispatch(
      userDataApi.endpoints.createTemplate.initiate({ name: 'T1', content: 'x' } as never),
    );
    const req = lastRequest();
    expect(req.url).toContain('/api/v1/user/templates');
    expect(req.method).toBe('POST');
  });

  it('updateTemplate sends PUT to /templates/:id', async () => {
    await store.dispatch(
      userDataApi.endpoints.updateTemplate.initiate({ id: 'tmpl-1', name: 'New' } as never),
    );
    const req = lastRequest();
    expect(req.url).toContain('/api/v1/user/templates/tmpl-1');
    expect(req.method).toBe('PUT');
  });

  it('deleteTemplate sends DELETE to /templates/:id', async () => {
    await store.dispatch(userDataApi.endpoints.deleteTemplate.initiate('tmpl-1'));
    const req = lastRequest();
    expect(req.url).toContain('/api/v1/user/templates/tmpl-1');
    expect(req.method).toBe('DELETE');
  });

  it('getUiSettings fetches the ui-settings URL', async () => {
    await store.dispatch(userDataApi.endpoints.getUiSettings.initiate());
    expect(lastRequest().url).toContain('/api/v1/user/ui-settings');
  });

  it('updateUiSettings sends PUT to ui-settings URL', async () => {
    await store.dispatch(
      userDataApi.endpoints.updateUiSettings.initiate({ keybindings: {} } as never),
    );
    const req = lastRequest();
    expect(req.url).toContain('/api/v1/user/ui-settings');
    expect(req.method).toBe('PUT');
  });

  it('getFavorites fetches the favorites URL', async () => {
    await store.dispatch(userDataApi.endpoints.getFavorites.initiate());
    expect(lastRequest().url).toContain('/api/v1/user/favorites');
  });

  it('addFavorite sends POST to /favorites/:toolId', async () => {
    await store.dispatch(userDataApi.endpoints.addFavorite.initiate('tool-abc'));
    const req = lastRequest();
    expect(req.url).toContain('/api/v1/user/favorites/tool-abc');
    expect(req.method).toBe('POST');
  });

  it('removeFavorite sends DELETE to /favorites/:toolId', async () => {
    await store.dispatch(userDataApi.endpoints.removeFavorite.initiate('tool-abc'));
    const req = lastRequest();
    expect(req.url).toContain('/api/v1/user/favorites/tool-abc');
    expect(req.method).toBe('DELETE');
  });

  it('getToolStats fetches the tool-stats URL', async () => {
    await store.dispatch(userDataApi.endpoints.getToolStats.initiate());
    expect(lastRequest().url).toContain('/api/v1/user/tool-stats');
  });

  it('getDiscoveredTools fetches the discovered-tools URL', async () => {
    await store.dispatch(userDataApi.endpoints.getDiscoveredTools.initiate());
    expect(lastRequest().url).toContain('/api/v1/user/discovered-tools');
  });

  it('getSpinHistory fetches the spin-history URL', async () => {
    await store.dispatch(userDataApi.endpoints.getSpinHistory.initiate());
    expect(lastRequest().url).toContain('/api/v1/user/spin-history');
  });

  it('getPipelines fetches the pipelines URL', async () => {
    await store.dispatch(userDataApi.endpoints.getPipelines.initiate());
    expect(lastRequest().url).toContain('/api/v1/user/pipelines');
  });

  it('createPipeline sends POST to pipelines URL', async () => {
    await store.dispatch(
      userDataApi.endpoints.createPipeline.initiate({ name: 'P1', steps: [] } as never),
    );
    const req = lastRequest();
    expect(req.url).toContain('/api/v1/user/pipelines');
    expect(req.method).toBe('POST');
  });

  it('updatePipeline sends PUT to /pipelines/:id', async () => {
    await store.dispatch(
      userDataApi.endpoints.updatePipeline.initiate({ id: 'pipe-1', name: 'Updated' } as never),
    );
    const req = lastRequest();
    expect(req.url).toContain('/api/v1/user/pipelines/pipe-1');
    expect(req.method).toBe('PUT');
  });

  it('deletePipeline sends DELETE to /pipelines/:id', async () => {
    await store.dispatch(userDataApi.endpoints.deletePipeline.initiate('pipe-1'));
    const req = lastRequest();
    expect(req.url).toContain('/api/v1/user/pipelines/pipe-1');
    expect(req.method).toBe('DELETE');
  });
});
