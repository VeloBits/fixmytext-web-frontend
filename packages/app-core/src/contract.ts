// Module Federation host<->remote contract.
//
// These prop types define the interface between the shell (host) and the
// editor/analytics remotes. They are pure types (erased at build), so importing
// them from app-core carries no runtime/singleton cost. The shell's
// federation.d.ts ambient module declarations and each remote's exposed page
// component are both typed against these.

import type {
  FavoritesContextValue,
  GamificationContextValue,
  PersonaContextValue,
  SubscriptionContextValue,
  User,
} from './types/context';
import type { AlertLevel } from './types/alert';

// `gamification` is deliberately optional AND nullable: the shell passes null
// while the VITE_GAMIFICATION_ENABLED kill switch is off (Phase A of the
// gamification removal), and the hard-delete phase can then drop the key
// entirely without another breaking contract change.

export interface EditorPageProps {
  mode: string;
  setMode: (mode: string) => void;
  showAlert: (message: string, type: string) => void;
  persona: PersonaContextValue;
  favorites: FavoritesContextValue;
  gamification?: GamificationContextValue | null;
  user: User | null;
  isAuthenticated: boolean;
  subscription: SubscriptionContextValue;
}

export interface AnalyticsPageProps {
  persona: PersonaContextValue;
  favorites: FavoritesContextValue;
  gamification?: GamificationContextValue | null;
  user: User | null;
  isAuthenticated: boolean;
  showAlert: (message: string, type: AlertLevel) => void;
  mode: string;
  setMode: (mode: string) => void;
  subscription: SubscriptionContextValue;
}
