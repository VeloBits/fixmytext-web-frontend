import { createContext, useContext } from 'react';
import type React from 'react';
import { useTheme } from '@/hooks/useTheme';

export type ThemeMode = 'light' | 'dark';

export interface ThemeContextValue {
  /** Current theme mode. */
  mode: ThemeMode;
  /** Switch the active theme mode and persist the preference. */
  setMode: (newMode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // useTheme is a JS hook; cast to the typed interface we enforce here.
  const themeState = useTheme() as ThemeContextValue;

  return <ThemeContext.Provider value={themeState}>{children}</ThemeContext.Provider>;
}

export function useThemeContext(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useThemeContext must be used within a ThemeProvider');
  }
  return ctx;
}
