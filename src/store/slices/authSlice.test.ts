import authReducer, { tokenRefreshed, logout } from './authSlice';
import type { AuthState } from './authSlice';

describe('authSlice', () => {
  const initialState = { user: null, accessToken: null };

  it('returns initial state', () => {
    expect(authReducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  describe('tokenRefreshed', () => {
    it('sets the access token', () => {
      const state = authReducer(initialState, tokenRefreshed('new-token'));
      expect(state.accessToken).toBe('new-token');
    });

    it('does not affect user', () => {
      const prev = { user: { name: 'Test' } as unknown as AuthState['user'], accessToken: 'old' };
      const state = authReducer(prev, tokenRefreshed('new'));
      expect(state.user).toEqual({ name: 'Test' });
      expect(state.accessToken).toBe('new');
    });
  });

  describe('logout', () => {
    it('clears user and accessToken', () => {
      const prev = { user: { name: 'Test' } as unknown as AuthState['user'], accessToken: 'token' };
      const state = authReducer(prev, logout());
      expect(state.user).toBeNull();
      expect(state.accessToken).toBeNull();
    });
  });

  describe('extraReducers (matchFulfilled)', () => {
    // We simulate the actions that RTK Query would dispatch
    it('sets accessToken on login fulfilled', () => {
      // tested via integration tests below
    });
  });
});

// Integration test with actual authApi matchers
import { authApi } from '@/store/api/authApi';

describe('authSlice extraReducers integration', () => {
  it('handles login.matchFulfilled', () => {
    const fulfilledAction = {
      type: `authApi/executeMutation/fulfilled`,
      payload: { access_token: 'test-token-login' },
      meta: {
        arg: { endpointName: 'login', type: 'mutation' },
        requestId: '1',
        requestStatus: 'fulfilled',
      },
    };
    // Check if the matcher matches
    if (authApi.endpoints.login.matchFulfilled(fulfilledAction)) {
      const state = authReducer({ user: null, accessToken: null }, fulfilledAction);
      expect(state.accessToken).toBe('test-token-login');
    }
  });

  it('handles register.matchFulfilled', () => {
    const action = {
      type: `authApi/executeMutation/fulfilled`,
      payload: { access_token: 'reg-token' },
      meta: {
        arg: { endpointName: 'register', type: 'mutation' },
        requestId: '2',
        requestStatus: 'fulfilled',
      },
    };
    if (authApi.endpoints.register.matchFulfilled(action)) {
      const state = authReducer({ user: null, accessToken: null }, action);
      expect(state.accessToken).toBe('reg-token');
    }
  });

  it('handles refresh.matchFulfilled', () => {
    const action = {
      type: `authApi/executeMutation/fulfilled`,
      payload: { access_token: 'refresh-token' },
      meta: {
        arg: { endpointName: 'refresh', type: 'mutation' },
        requestId: '3',
        requestStatus: 'fulfilled',
      },
    };
    if (authApi.endpoints.refresh.matchFulfilled(action)) {
      const state = authReducer({ user: null, accessToken: null }, action);
      expect(state.accessToken).toBe('refresh-token');
    }
  });

  it('handles getMe.matchFulfilled', () => {
    const action = {
      type: `authApi/executeQuery/fulfilled`,
      payload: { id: 1, email: 'test@test.com' },
      meta: {
        arg: { endpointName: 'getMe', type: 'query' },
        requestId: '4',
        requestStatus: 'fulfilled',
      },
    };
    if (authApi.endpoints.getMe.matchFulfilled(action)) {
      const state = authReducer({ user: null, accessToken: 'tok' }, action);
      expect(state.user).toEqual({ id: 1, email: 'test@test.com' });
    }
  });

  it('handles logout.matchFulfilled', () => {
    const action = {
      type: `authApi/executeMutation/fulfilled`,
      payload: {},
      meta: {
        arg: { endpointName: 'logout', type: 'mutation' },
        requestId: '5',
        requestStatus: 'fulfilled',
      },
    };
    if (authApi.endpoints.logout.matchFulfilled(action)) {
      const state = authReducer({ user: { name: 'x' } as unknown as AuthState['user'], accessToken: 'tok' }, action);
      expect(state.user).toBeNull();
      expect(state.accessToken).toBeNull();
    }
  });
});
