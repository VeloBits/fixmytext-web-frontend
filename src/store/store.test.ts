import { store } from './store';

describe('store', () => {
  it('is a valid Redux store with getState and dispatch', () => {
    expect(typeof store.getState).toBe('function');
    expect(typeof store.dispatch).toBe('function');
  });

  it('has auth slice in state', () => {
    const state = store.getState();
    expect(state).toHaveProperty('auth');
    expect(state.auth).toEqual({ user: null, accessToken: null });
  });

  it('has all API reducer paths in state', () => {
    const state = store.getState();
    expect(state).toHaveProperty('textApi');
    expect(state).toHaveProperty('authApi');
    expect(state).toHaveProperty('userDataApi');
    expect(state).toHaveProperty('subscriptionApi');
    expect(state).toHaveProperty('passesApi');
    expect(state).toHaveProperty('historyApi');
    expect(state).toHaveProperty('shareApi');
  });
});
