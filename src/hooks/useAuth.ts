import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useRefreshMutation, useGetMeQuery } from '../store/api/authApi';
import type { RootState } from '../store/store';
import type { User } from '../store/slices/authSlice';

export interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
}

export function useAuth(): AuthContextValue {
  const { accessToken, user } = useSelector((s: RootState) => s.auth);
  const [refresh] = useRefreshMutation();
  const attempted = useRef(false);

  useEffect(() => {
    if (!accessToken && !attempted.current) {
      attempted.current = true;
      refresh()
        .unwrap()
        .catch(() => {});
    }
    // Effect intentionally runs only once on mount (empty deps array)
  }, []);

  useGetMeQuery(undefined, { skip: !accessToken });

  return { user, isAuthenticated: !!accessToken };
}
