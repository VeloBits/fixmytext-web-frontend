import { createSlice } from '@reduxjs/toolkit';
import type { components } from '../../types/openapi';
import { authApi } from '../../store/api/authApi';
import * as Sentry from '@sentry/react';

export type User = components['schemas']['UserResponse'];

export interface AuthState {
  user: User | null;
}

const initialState: AuthState = { user: null };

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout(state) {
      state.user = null;
      Sentry.setUser(null);
    },
  },
  extraReducers: (builder) => {
    builder.addMatcher(authApi.endpoints.getMe.matchFulfilled, (state, { payload }) => {
      state.user = payload;
      Sentry.setUser({ id: payload.id, email: payload.email });
    });
  },
});

export const { logout } = authSlice.actions;
export default authSlice.reducer;
