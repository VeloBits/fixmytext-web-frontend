import { createContext, useContext, useEffect, useMemo } from 'react';
import type React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useOidcAuth } from '@velobits/app-core/auth/useOidcAuth';
import { authApi, useGetMeQuery } from '@velobits/app-core/store/api/authApi';
import { userDataApi } from '@velobits/app-core/store/api/userDataApi';
import { subscriptionApi } from '@velobits/app-core/store/api/subscriptionApi';
import { passesApi } from '@velobits/app-core/store/api/passesApi';
import { historyApi } from '@velobits/app-core/store/api/historyApi';
import { logout as clearAuthUser } from '@velobits/app-core/store/slices/authSlice';
import type { AppDispatch, RootState } from '@velobits/app-core/store/store';
import useToolGroups from '@velobits/app-core/hooks/useToolGroups';
import useFavorites from '@velobits/app-core/hooks/useFavorites';
import useSidebarChips from '@velobits/app-core/hooks/useSidebarChips';
import useSubscription from '@velobits/app-core/hooks/useSubscription';
import { useAlertContext } from './AlertContext';
import type {
  User,
  AppContextValue,
  SubscriptionContextValue,
} from '@velobits/app-core/types/context';

// Re-export the shared context value types so existing `@/contexts/AppContext`
// type imports across the shell keep resolving. The canonical definitions live
// in @velobits/app-core so the federated remotes share them without depending
// on shell source.
export type {
  User,
  ToolGroupsContextValue,
  ToolGroupView,
  FavoritesContextValue,
  SidebarChipsContextValue,
  ToolUsage,
  SubscriptionContextValue,
  AppContextValue,
} from '@velobits/app-core/types/context';

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { showAlert } = useAlertContext();
  const { isAuthenticated, accessToken } = useOidcAuth();
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((s: RootState) => s.auth.user) as User | null;
  // A cross-tab logout (BroadcastChannel → removeUser) or Keycloak-side session
  // end clears the OIDC user but not the Redux identity: signoutRedirect only
  // navigates the tab that initiated it, so a background tab keeps s.auth.user
  // and every user-scoped RTK Query cache — the chrome shows "Sign In" while
  // the profile menu still names the signed-out user. When auth drops while a
  // profile is loaded, purge it all so this tab renders as a true guest and
  // nothing leaks into a later session. All user-scoped queries skip while
  // unauthenticated, so the resets don't trigger unauthenticated refetches.
  useEffect(() => {
    if (isAuthenticated || !user) return;
    dispatch(clearAuthUser());
    dispatch(authApi.util.resetApiState());
    dispatch(userDataApi.util.resetApiState());
    dispatch(subscriptionApi.util.resetApiState());
    dispatch(passesApi.util.resetApiState());
    dispatch(historyApi.util.resetApiState());
  }, [isAuthenticated, user, dispatch]);
  // Trigger /auth/me fetch when authenticated so Redux user state is populated.
  const {
    isError: meFailed,
    error: meError,
    refetch: refetchMe,
  } = useGetMeQuery(undefined, { skip: !accessToken });
  // Signed in but the profile hasn't landed in Redux yet (and the fetch hasn't
  // failed) — identity UI should show loading, not guest. The !meFailed guard
  // keeps a broken /auth/me from wedging consumers in a permanent loading state.
  const userResolving = isAuthenticated && !user && !meFailed;
  // A transiently failing /auth/me (rate-limited 429, 5xx, network drop) is not
  // a sign-out: only a definitive 401/403 settles the identity. Keep refetching
  // in the background so a burst of 429s can't strand a signed-in user in
  // guest-looking chrome — the profile pops in as soon as a poll succeeds.
  const meStatus = (meError as { status?: number | string } | undefined)?.status;
  const meAuthRejected = meStatus === 401 || meStatus === 403;
  useEffect(() => {
    if (!isAuthenticated || user || !meFailed || meAuthRejected) return undefined;
    const id = window.setInterval(() => refetchMe(), 15_000);
    return () => window.clearInterval(id);
  }, [isAuthenticated, user, meFailed, meAuthRejected, refetchMe]);
  const toolGroups = useToolGroups();
  const favorites = useFavorites();
  // Same instance as `toolGroups` on purpose: the chips hook prunes
  // custom_group chips against this exact groups list (delete cascade).
  const sidebarChips = useSidebarChips(toolGroups);
  const subscription = useSubscription({ showAlert }) as unknown as SubscriptionContextValue;

  const value = useMemo(
    () => ({
      user,
      isAuthenticated,
      userResolving,
      toolGroups,
      favorites,
      sidebarChips,
      subscription,
    }),
    [user, isAuthenticated, userResolving, toolGroups, favorites, sidebarChips, subscription]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return ctx;
}
