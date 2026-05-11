/**
 * useAlert — manages stackable toast notifications.
 *
 * Usage:
 *   const { alerts, showAlert, dismissAlert } = useAlert();
 */
import { useState, useCallback, useRef } from 'react';

let nextId = 0;

export function useAlert() {
  const [alerts, setAlerts] = useState([]);
  const timers = useRef({});
  const activeMessages = useRef(new Set());

  const dismissAlert = useCallback((id) => {
    clearTimeout(timers.current[id]);
    delete timers.current[id];
    setAlerts((prev) => {
      const alert = prev.find((a) => a.id === id);
      if (alert) activeMessages.current.delete(`${alert.type}::${alert.msg}`);
      return prev.filter((a) => a.id !== id);
    });
  }, []);

  const showAlert = useCallback(
    (message, type = 'info', options = {}) => {
      // FastAPI 422 responses set `detail` to an array of validation-error
      // objects. Coerce anything non-string to a readable message so React
      // never tries to render an object as a child.
      if (typeof message !== 'string') {
        if (Array.isArray(message)) {
          message = message
            .map((m) => (typeof m === 'string' ? m : m?.msg || JSON.stringify(m)))
            .join('; ');
        } else if (message && typeof message === 'object') {
          message = message.msg || message.message || JSON.stringify(message);
        } else {
          message = String(message);
        }
      }
      const key = `${type}::${message}`;

      // Skip if an identical message+type is already visible
      if (activeMessages.current.has(key)) return -1;

      const id = ++nextId;
      const duration =
        options.duration ?? (type === 'danger' ? 5000 : type === 'warning' ? 4000 : 2500);

      activeMessages.current.add(key);
      setAlerts((prev) => {
        // Cap at 5 visible toasts
        const next = prev.length >= 5 ? prev.slice(1) : prev;
        return [...next, { id, msg: message, type }];
      });

      if (duration > 0) {
        timers.current[id] = setTimeout(() => dismissAlert(id), duration);
      }

      return id;
    },
    [dismissAlert]
  );

  // Backwards compatibility: expose `alert` as the latest alert (for components still using old API)
  const alert = alerts.length > 0 ? alerts[alerts.length - 1] : null;

  return { alert, alerts, showAlert, dismissAlert };
}
