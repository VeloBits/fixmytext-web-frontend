/**
 * Share-viewer layout - applies the visitor's persisted theme before first
 * paint so a share opened from the (dark-themed) app doesn't flash light.
 *
 * The shell app persists the theme choice in localStorage under
 * `fmx_theme_mode` (see apps/shell/src/hooks/useTheme.ts) and both apps are
 * served from the same origin, so the key is readable here. `'dark'` is the
 * fallback to match the shell's default for first-time visitors.
 *
 * The script must stay byte-identical to the sha256 hash allow-listed in
 * next.config.ts (CSP script-src) - update both together.
 */
const themeInitScript =
  "try{if((localStorage.getItem('fmx_theme_mode')||'dark')==='dark')document.body.classList.add('dark')}catch(e){}";

export default function ShareLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      {children}
    </>
  );
}
