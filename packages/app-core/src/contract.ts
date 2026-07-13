// Module Federation host<->remote contract.
//
// These prop types define the interface between the shell (host) and the
// editor/analytics remotes. They are pure types (erased at build), so importing
// them from app-core carries no runtime/singleton cost. The shell's
// federation.d.ts ambient module declarations and each remote's exposed page
// component are both typed against these.

import type {
  FavoritesContextValue,
  PersonaContextValue,
  SubscriptionContextValue,
  User,
} from './types/context';
import type { AlertLevel } from './types/alert';

export interface EditorPageProps {
  mode: string;
  setMode: (mode: string) => void;
  showAlert: (message: string, type: string) => void;
  persona: PersonaContextValue;
  favorites: FavoritesContextValue;
  user: User | null;
  isAuthenticated: boolean;
  subscription: SubscriptionContextValue;
}

export interface AnalyticsPageProps {
  persona: PersonaContextValue;
  favorites: FavoritesContextValue;
  user: User | null;
  isAuthenticated: boolean;
  showAlert: (message: string, type: AlertLevel) => void;
  mode: string;
  setMode: (mode: string) => void;
  subscription: SubscriptionContextValue;
}
