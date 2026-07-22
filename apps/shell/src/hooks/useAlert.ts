/**
 * useAlert — manages stackable toast notifications.
 *
 * Usage:
 *   const { alerts, showAlert, dismissAlert } = useAlert();
 */
import { useState, useCallback, useRef } from 'react';
import type { AlertAction } from '@velobits/app-core/types/alert';

export type AlertType = 'info' | 'success' | 'warning' | 'danger';

export interface AlertItem {
  id: number;
  msg: string;
  type: AlertType;
  /** Optional inline action button (e.g. Undo). */
  action?: AlertAction;
}

export interface ShowAlertOptions {
  duration?: number;
  action?: AlertAction;
}

export interface AlertContextValue {
  alert: AlertItem | null;
  alerts: AlertItem[];
  showAlert: (message: unknown, type?: AlertType, options?: ShowAlertOptions) => number;
  dismissAlert: (id: number) => void;
}

let nextId = 0;

export function useAlert(): AlertContextValue {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const timers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  const activeMessages = useRef(new Set<string>());

  const dismissAlert = useCallback((id: number): void => {
    clearTimeout(timers.current[id]);
    delete timers.current[id];
    setAlerts((prev) => {
      const alert = prev.find((a) => a.id === id);
      if (alert) activeMessages.current.delete(`${alert.type}::${alert.msg}`);
      return prev.filter((a) => a.id !== id);
    });
  }, []);

  const showAlert = useCallback(
    (message: unknown, type: AlertType = 'info', options: ShowAlertOptions = {}): number => {
      // FastAPI 422 responses set `detail` to an array of validation-error
      // objects. Coerce anything non-string to a readable message so React
      // never tries to render an object as a child.
      let msg: string;
      if (typeof message !== 'string') {
        if (Array.isArray(message)) {
          msg = (message as unknown[])
            .map((m) => {
              if (typeof m === 'string') return m;
              const obj = m as Record<string, unknown>;
              return typeof obj?.msg === 'string' ? obj.msg : JSON.stringify(m);
            })
            .join('; ');
        } else if (message && typeof message === 'object') {
          const obj = message as Record<string, unknown>;
          msg =
            typeof obj.msg === 'string'
              ? obj.msg
              : typeof obj.message === 'string'
                ? obj.message
                : JSON.stringify(message);
        } else {
          msg = String(message);
        }
      } else {
        msg = message;
      }
      const key = `${type}::${msg}`;

      // Skip if an identical message+type is already visible
      if (activeMessages.current.has(key)) return -1;

      const id = ++nextId;
      const duration =
        options.duration ?? (type === 'danger' ? 5000 : type === 'warning' ? 4000 : 2500);

      activeMessages.current.add(key);
      setAlerts((prev) => {
        // Cap at 5 visible toasts
        const next = prev.length >= 5 ? prev.slice(1) : prev;
        return [...next, { id, msg, type, action: options.action }];
      });

      if (duration > 0) {
        timers.current[id] = setTimeout(() => dismissAlert(id), duration);
      }

      return id;
    },
    [dismissAlert]
  );

  // Backwards compatibility: expose `alert` as the latest alert (for components still using old API)
  const alert = alerts.length > 0 ? (alerts[alerts.length - 1] ?? null) : null;

  return { alert, alerts, showAlert, dismissAlert };
}
