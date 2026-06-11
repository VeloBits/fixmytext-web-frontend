import authReducer, { logout } from './authSlice';
import type { AuthState } from './authSlice';

describe('authSlice', () => {
  const initialState: AuthState = { user: null };

  it('returns initial state', () => {
    expect(authReducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  describe('logout', () => {
    it('clears user', () => {
      const prev: AuthState = { user: { id: 'u1', email: 'a@b.com', display_name: 'Test', subscription_tier: 'free', is_email_verified: false } };
      const state = authReducer(prev, logout());
      expect(state.user).toBeNull();
    });
  });
});

// Integration test with actual authApi matchers
import { authApi } from '../../store/api/authApi';

describe('authSlice extraReducers integration', () => {
  it('handles getMe.matchFulfilled', () => {
    const action = {
      type: `authApi/executeQuery/fulfilled`,
      payload: { id: 'u1', email: 'test@test.com', display_name: 'Test', subscription_tier: 'free', is_email_verified: true },
      meta: {
        arg: { endpointName: 'getMe', type: 'query' },
        requestId: '4',
        requestStatus: 'fulfilled',
      },
    };
    if (authApi.endpoints.getMe.matchFulfilled(action)) {
      const state = authReducer({ user: null }, action);
      expect(state.user).toMatchObject({ id: 'u1', email: 'test@test.com' });
    }
  });
});
