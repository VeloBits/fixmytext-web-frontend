import { createContext, useContext } from 'react';
import type React from 'react';
import { useAlert } from '@/hooks/useAlert';
import type { AlertLevel } from '@velobits/app-core/types/alert';

// Canonical AlertLevel lives in @velobits/app-core (shared with the host<->remote
// contract). Re-exported here so existing `@/contexts/AlertContext` imports work.
export type { AlertLevel };

export interface Alert {
  id: number;
  msg: string;
  type: AlertLevel;
}

export interface AlertContextValue {
  /** The most-recently added alert (backwards-compat shim), or null. */
  alert: Alert | null;
  /** All currently visible alerts (up to 5). */
  alerts: Alert[];
  /**
   * Show a toast notification.
   * Returns the numeric ID of the new alert, or -1 if a duplicate was suppressed.
   */
  showAlert: (message: unknown, type?: AlertLevel, options?: { duration?: number }) => number;
  /** Dismiss an alert by its numeric ID. */
  dismissAlert: (id: number) => void;
}

const AlertContext = createContext<AlertContextValue | null>(null);

export function AlertProvider({ children }: { children: React.ReactNode }) {
  const alertState = useAlert();

  return <AlertContext.Provider value={alertState}>{children}</AlertContext.Provider>;
}

export function useAlertContext(): AlertContextValue {
  const ctx = useContext(AlertContext);
  if (!ctx) {
    throw new Error('useAlertContext must be used within an AlertProvider');
  }
  return ctx;
}
