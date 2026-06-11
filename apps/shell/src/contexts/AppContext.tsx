import { createContext, useContext, useMemo } from 'react';
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
  useGetMeQuery(undefined, { skip: !accessToken });
  const gamification = useGamification() as unknown as GamificationContextValue;
  const subscription = useSubscription({ showAlert }) as unknown as SubscriptionContextValue;

  const value = useMemo(
    () => ({ user, isAuthenticated, gamification, subscription }),
    [user, isAuthenticated, gamification, subscription]
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
