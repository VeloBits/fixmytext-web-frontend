/**
 * @deprecated Use `useOidcAuth` from `@/auth/useOidcAuth` directly.
 * This re-export exists for backward compatibility during the Keycloak migration.
 */
import { useSelector } from 'react-redux';
import { useGetMeQuery } from '@/store/api/authApi';
import { useOidcAuth } from '@/auth/useOidcAuth';
import type { RootState } from '@/store/store';
import type { User } from '@/store/slices/authSlice';

export interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
}

export function useAuth(): AuthContextValue {
  const { isAuthenticated, accessToken } = useOidcAuth();
  const user = useSelector((s: RootState) => s.auth.user);

  // Trigger /auth/me fetch when authenticated so the Redux user is populated
  useGetMeQuery(undefined, { skip: !accessToken });

  return { user, isAuthenticated };
}
