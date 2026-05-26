/**
 * JS mirror of the @theme tokens in theme.css.
 * Use these for programmatic access (e.g. chart colors, canvas drawing).
 * For styling, prefer the CSS variables or Tailwind utilities.
 */
export const tokens = {
  color: {
    accent: '#007acc',
    accentHover: '#1c8cd9',
    violet: '#c586c0',
    cyan: '#4ec9b0',
    emerald: '#4ec9b0',
    amber: '#dcdcaa',
    rose: '#f44747',
    teal: '#4ec9b0',
    indigo: '#569cd6',
    purple: '#c586c0',
    orange: '#ce9178',
    green: '#6a9955',
    yellow: '#d7ba7d',
  },
  radius: {
    sm: '4px',
    md: '6px',
    lg: '8px',
    xl: '10px',
    pill: '999px',
  },
  font: {
    display: "'Segoe UI', system-ui, -apple-system, sans-serif",
    mono: "'JetBrains Mono', 'Cascadia Code', 'Fira Code', 'Consolas', monospace",
  },
  transition: {
    base: '0.12s ease',
  },
} as const;

export type TokenColor = keyof typeof tokens.color;
