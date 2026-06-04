// Type declarations for Module Federation remote imports.
// These tell TypeScript what each remote exposes so imports type-check cleanly.
// The actual module loading happens at runtime via the MF runtime.

declare module 'editor-remote/EditorPage' {
  import type { ComponentType } from 'react';
  import type {
    GamificationContextValue,
    SubscriptionContextValue,
    User,
  } from '@/contexts/AppContext';

  interface EditorPageProps {
    mode: string;
    setMode: (mode: string) => void;
    showAlert: (message: string, type: string) => void;
    gamification: GamificationContextValue;
    user: User | null;
    isAuthenticated: boolean;
    subscription: SubscriptionContextValue;
  }

  const EditorPage: ComponentType<EditorPageProps>;
  export default EditorPage;
}

declare module 'analytics-remote/AnalyticsPage' {
  import type { ComponentType } from 'react';
  import type { AlertLevel } from '@/contexts/AlertContext';
  import type {
    GamificationContextValue,
    SubscriptionContextValue,
    User,
  } from '@/contexts/AppContext';

  interface AnalyticsPageProps {
    gamification: GamificationContextValue;
    user: User | null;
    isAuthenticated: boolean;
    showAlert: (message: string, type: AlertLevel) => void;
    mode: string;
    setMode: (mode: string) => void;
    subscription: SubscriptionContextValue;
  }

  const AnalyticsPage: ComponentType<AnalyticsPageProps>;
  export default AnalyticsPage;
}
