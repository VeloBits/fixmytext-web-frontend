/**
 * useTheme — manages light/dark mode.
 * Syncs to DB when authenticated, falls back to localStorage.
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { useGetPreferencesQuery, useUpdatePreferencesMutation } from '@velobits/app-core/store/api/userDataApi';
import { useOidcAuth } from '@velobits/app-core/auth/useOidcAuth';

/** Light or dark theme mode — mirrors ThemeContext.ThemeMode */
type ThemeMode = 'light' | 'dark';

interface ThemeContextValue {
  mode: ThemeMode;
  setMode: (newMode: ThemeMode) => void;
}

const MODE_KEY = 'fmx_theme_mode';

function applyMode(mode: ThemeMode): void {
  if (mode === 'dark') document.body.classList.add('dark');
  else document.body.classList.remove('dark');
}

export function useTheme(): ThemeContextValue {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    const saved = (localStorage.getItem(MODE_KEY) || 'dark') as ThemeMode;
    applyMode(saved);
    return saved;
  });

  const { isAuthenticated } = useOidcAuth();
  const hydrated = useRef(false);

  const { data: prefs } = useGetPreferencesQuery(undefined, { skip: !isAuthenticated });
  const [updatePrefs] = useUpdatePreferencesMutation();

  // Hydrate from DB on first fetch — DB is authoritative for authenticated users
  useEffect(() => {
    if (prefs && !hydrated.current) {
      hydrated.current = true;
      // prefs.theme comes from the API as a string; cast to ThemeMode
      const dbMode = prefs.theme as ThemeMode | undefined;
      if (dbMode && dbMode !== mode) {
        setModeState(dbMode);
        applyMode(dbMode);
        // Keep localStorage as offline cache only
        localStorage.setItem(MODE_KEY, dbMode);
      }
    }
  }, [prefs, mode]);

  // Reset hydration on logout
  useEffect(() => {
    if (!isAuthenticated) hydrated.current = false;
  }, [isAuthenticated]);

  const setMode = useCallback(
    (newMode: ThemeMode): void => {
      setModeState(newMode);
      applyMode(newMode);
      if (isAuthenticated) {
        // Authenticated: DB is source of truth; keep localStorage as offline cache
        localStorage.setItem(MODE_KEY, newMode);
        updatePrefs({ theme: newMode })
          .unwrap()
          .catch(() => {});
      } else {
        // Unauthenticated: localStorage is the only storage
        localStorage.setItem(MODE_KEY, newMode);
      }
    },
    [isAuthenticated, updatePrefs]
  );

  useEffect(() => {
    applyMode(mode);
  }, [mode]);

  return { mode, setMode };
}
