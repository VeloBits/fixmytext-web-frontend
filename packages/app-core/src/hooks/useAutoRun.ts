/**
 * useAutoRun - global "Auto Run" execution-mode preference (2026-08-03).
 *
 * Manual execution is the default: tools run only when the user presses Run
 * (or Ctrl/Cmd+Enter). Enabling Auto Run restores the debounce-driven re-run
 * that used to be unconditional, which can consume usage while the user is
 * still typing.
 *
 * Persistence mirrors useTheme: the DB is authoritative for authenticated
 * users and localStorage is an offline cache; guests get localStorage only.
 * Reading from localStorage in the initial state means the correct mode is
 * live on first paint, before the preferences query resolves - so a page
 * refresh never briefly re-enables auto-run.
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { useGetPreferencesQuery, useUpdatePreferencesMutation } from '../store/api/userDataApi';
import { useOidcAuth } from '../auth/useOidcAuth';

export interface AutoRunValue {
  /** Whether tools re-run automatically after the typing debounce. */
  autoRun: boolean;
  /** Persist a new execution mode (localStorage always, DB when signed in). */
  setAutoRun: (next: boolean) => void;
}

export const AUTO_RUN_KEY = 'fmx_auto_run';

function readCached(): boolean {
  try {
    return localStorage.getItem(AUTO_RUN_KEY) === 'true';
  } catch {
    // Storage blocked (private mode / quota) - fall back to the safe default.
    return false;
  }
}

function writeCached(value: boolean): void {
  try {
    localStorage.setItem(AUTO_RUN_KEY, String(value));
  } catch {
    /* storage full / unavailable - DB copy still wins on next login */
  }
}

export default function useAutoRun(): AutoRunValue {
  const [autoRun, setAutoRunState] = useState<boolean>(readCached);

  const { isAuthenticated } = useOidcAuth();
  const hydrated = useRef(false);

  const { data: prefs } = useGetPreferencesQuery(undefined, { skip: !isAuthenticated });
  const [updatePrefs] = useUpdatePreferencesMutation();

  // Hydrate from the DB on first fetch - it is authoritative for signed-in
  // users, so the mode follows them across devices.
  useEffect(() => {
    if (prefs && !hydrated.current) {
      hydrated.current = true;
      const dbValue = !!prefs.auto_run;
      setAutoRunState(dbValue);
      writeCached(dbValue);
    }
  }, [prefs]);

  // Reset hydration on logout so the next login re-reads the DB.
  useEffect(() => {
    if (!isAuthenticated) hydrated.current = false;
  }, [isAuthenticated]);

  const setAutoRun = useCallback(
    (next: boolean): void => {
      setAutoRunState(next);
      writeCached(next);
      if (isAuthenticated) {
        updatePrefs({ auto_run: next })
          .unwrap()
          .catch(() => {});
      }
    },
    [isAuthenticated, updatePrefs]
  );

  return { autoRun, setAutoRun };
}
