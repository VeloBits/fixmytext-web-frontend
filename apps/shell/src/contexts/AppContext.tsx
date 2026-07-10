import { createContext, useContext, useEffect, useMemo } from 'react';
import type React from 'react';
import { useSelector } from 'react-redux';
import { useOidcAuth } from '@velobits/app-core/auth/useOidcAuth';
import { useGetMeQuery } from '@velobits/app-core/store/api/authApi';
import type { RootState } from '@velobits/app-core/store/store';
import useGamification from '@velobits/app-core/hooks/useGamification';
import useSubscription from '@velobits/app-core/hooks/useSubscription';
import { useAlertContext } from './AlertContext';
import type {
  User,
  AppContextValue,
  GamificationContextValue,
  SubscriptionContextValue,
} from '@velobits/app-core/types/context';

// Re-export the shared context value types so existing `@/contexts/AppContext`
// type imports across the shell keep resolving. The canonical definitions live
// in @velobits/app-core so the federated remotes share them without depending
// on shell source.
export type {
  User,
  GamificationStreak,
  GamificationDailyQuest,
  GamificationContextValue,
  ToolUsage,
  SubscriptionContextValue,
  AppContextValue,
} from '@velobits/app-core/types/context';

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { showAlert } = useAlertContext();
  const { isAuthenticated, accessToken } = useOidcAuth();
  const user = useSelector((s: RootState) => s.auth.user) as User | null;
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
  const gamification = useGamification() as unknown as GamificationContextValue;
  const subscription = useSubscription({ showAlert }) as unknown as SubscriptionContextValue;

  const value = useMemo(
    () => ({ user, isAuthenticated, userResolving, gamification, subscription }),
    [user, isAuthenticated, userResolving, gamification, subscription]
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
