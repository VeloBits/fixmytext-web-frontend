import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { components } from '@/types/openapi';
import { authApi } from '@/store/api/authApi';

export type User = components['schemas']['UserResponse'];

export interface AuthState {
  user: User | null;
  accessToken: string | null;
}

const initialState: AuthState = { user: null, accessToken: null };

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    tokenRefreshed(state, { payload }: PayloadAction<string>) {
      state.accessToken = payload;
    },
    logout(state) {
      state.user = null;
      state.accessToken = null;
    },
  },
  extraReducers: (builder) => {
    builder.addMatcher(authApi.endpoints.login.matchFulfilled, (state, { payload }) => {
      state.accessToken = payload.access_token;
    });
    builder.addMatcher(authApi.endpoints.register.matchFulfilled, (state, { payload }) => {
      state.accessToken = payload.access_token;
    });
    builder.addMatcher(authApi.endpoints.refresh.matchFulfilled, (state, { payload }) => {
      state.accessToken = payload.access_token;
    });
    builder.addMatcher(authApi.endpoints.getMe.matchFulfilled, (state, { payload }) => {
      state.user = payload;
    });
    builder.addMatcher(authApi.endpoints.logout.matchFulfilled, (state) => {
      state.user = null;
      state.accessToken = null;
    });
  },
});

export const { tokenRefreshed, logout } = authSlice.actions;
export default authSlice.reducer;
