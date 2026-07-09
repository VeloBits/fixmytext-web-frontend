import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useOidcAuth } from '@velobits/app-core/auth/useOidcAuth';
import type { AlertLevel } from '@/contexts/AlertContext';
import type { ThemeMode } from '@/contexts/ThemeContext';

export interface NavbarProps {
  showAlert?: (message: string, type: AlertLevel) => void;
  /* Account/appearance data for the mobile menu — on desktop the editor's
     activity-bar avatar menu covers these, but that bar is hidden ≤768px */
  user?: { display_name?: string; email?: string } | null;
  mode?: ThemeMode;
  setMode?: (mode: ThemeMode) => void;
}

export default function Navbar({ showAlert, user, mode, setMode }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { isAuthenticated, logout } = useOidcAuth();

  const handleShare = () => {
    navigator.clipboard
      .writeText(window.location.origin)
      .then(() => showAlert?.('Website link copied to clipboard!', 'success'))
      .catch(() => showAlert?.('Failed to copy link', 'danger'));
  };

  const openSearch = () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
  };

  return (
    <nav className="sticky top-0 z-[200] flex items-center gap-4 h-11 px-5 bg-[var(--titlebar-bg)] border-b border-white/[0.06]">
      {/* Brand */}
      <Link
        className="flex items-center flex-shrink-0 no-underline text-[1.15rem] font-extrabold tracking-[-0.03em] text-[#f0f0f0] font-[var(--font-display)]"
        to="/"
      >
        <span className="bg-gradient-to-br from-[#007acc] to-[#1c8cd9] bg-clip-text text-transparent">
          Fix
        </span>
        MyText
        <span className="inline-block w-px h-[1em] bg-[var(--accent)] ml-0.5 rounded-sm align-text-bottom animate-[blink-cursor_1s_step-end_infinite]" />
      </Link>

      {/* Right section */}
      <div className="flex items-center gap-1.5 ml-auto">
        {/* Search trigger */}
        <button
          className="hidden md:flex items-center gap-2 px-3.5 py-1 rounded-md border border-[#505052] bg-[#3c3c3e] cursor-pointer min-w-[180px] max-w-[280px] transition-colors hover:border-[var(--accent)]"
          onClick={openSearch}
        >
          <span className="text-[0.82rem] text-[#adadad] whitespace-nowrap overflow-hidden text-ellipsis flex-1">
            Search tools...
          </span>
          <kbd className="text-[0.62rem] font-semibold px-1.5 py-0.5 rounded-sm bg-[#2a2a2c] text-[#adadad] border border-[#505052] font-[var(--font-mono)]">
            Ctrl+K
          </kbd>
        </button>

        {/* About */}
        <Link
          className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-md border border-[#505052] bg-[#3c3c3e] text-[#adadad] text-[0.82rem] no-underline whitespace-nowrap transition-all hover:border-[var(--accent)] hover:text-[#e0e0e0] hover:bg-[#454547] active:bg-[#505052]"
          to="/about"
          title="About FixMyText"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="flex-shrink-0"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <span className="font-medium">About</span>
        </Link>

        {/* Share website link */}
        <button
          className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-md border border-[#505052] bg-[#3c3c3e] cursor-pointer text-[#adadad] text-[0.82rem] font-[inherit] whitespace-nowrap no-underline transition-all hover:border-[var(--accent)] hover:text-[#e0e0e0] hover:bg-[#454547] active:bg-[#505052]"
          onClick={handleShare}
          aria-label="Share website link"
          title="Share website link"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="flex-shrink-0"
          >
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
          <span className="font-medium">Share</span>
        </button>

        {/* GitHub */}
        <a
          className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-md border border-[#505052] bg-[#3c3c3e] text-[#adadad] text-[0.82rem] no-underline whitespace-nowrap transition-all hover:border-[var(--accent)] hover:text-[#e0e0e0] hover:bg-[#454547] active:bg-[#505052]"
          href="https://github.com/sojitra-nency/FixMyText"
          target="_blank"
          rel="noopener noreferrer"
          title="Contribute on GitHub"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="flex-shrink-0"
          >
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
          </svg>
          <span className="font-medium">GitHub</span>
        </a>

        {/* Upgrade (when logged in) */}
        {isAuthenticated && (
          <Link
            className="hidden md:flex items-center px-3 py-1 rounded-md border border-[var(--accent)] bg-transparent text-white text-[0.75rem] font-semibold no-underline whitespace-nowrap transition-all hover:bg-[var(--accent)] hover:text-white"
            to="/pricing"
            title="View plans & pricing"
          >
            Upgrade
          </Link>
        )}

        {/* Sign In (when logged out) */}
        {!isAuthenticated && (
          <Link
            className="flex items-center px-3.5 py-1 rounded-md bg-[var(--accent)] text-white text-[0.78rem] font-semibold no-underline whitespace-nowrap transition-colors hover:bg-[var(--accent-hover)]"
            to="/login"
            title="Sign in"
          >
            Sign In
          </Link>
        )}

        {/* Mobile search (opens the Ctrl+K tool palette) */}
        <button
          className="md:hidden w-11 h-11 -my-1 rounded-sm border-none bg-transparent cursor-pointer flex items-center justify-center text-[var(--titlebar-fg)] transition-colors hover:bg-white/[0.08]"
          onClick={openSearch}
          aria-label="Search tools"
        >
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </button>

        {/* Mobile hamburger */}
        <button
          className="md:hidden w-11 h-11 -my-1 rounded-sm border-none bg-transparent cursor-pointer flex items-center justify-center text-[1rem] text-[var(--titlebar-fg)] transition-colors hover:bg-white/[0.08]"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
        >
          {menuOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* Mobile dropdown — tu-mobile-menu class kept for test selectors */}
      {menuOpen && (
        <div className="tu-mobile-menu absolute top-11 left-0 right-0 bg-[var(--surface)] border-b border-[var(--border)] flex flex-col p-1 z-[200] max-h-[calc(100dvh-44px)] overflow-y-auto">
          {/* Account header (signed-in) */}
          {isAuthenticated && (
            <>
              <div className="flex items-center gap-3 px-3 py-2.5">
                <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-[#007acc] to-[#4ec9b0] text-white text-[0.95rem] font-bold">
                  {user?.display_name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[0.85rem] font-semibold text-[var(--text)] truncate">
                    {user?.display_name || 'Account'}
                  </span>
                  <span className="text-[0.72rem] text-[var(--text-3)] truncate">
                    {user?.email || ''}
                  </span>
                </div>
              </div>
              <div className="h-px bg-[var(--border)] mx-2 my-1" />
            </>
          )}
          <Link
            className="tu-mobile-link flex items-center min-h-[44px] px-3 py-1.5 rounded-sm text-[var(--text-2)] no-underline text-[0.82rem] transition-all hover:bg-[var(--list-hover)] hover:text-[var(--text)]"
            to="/"
            onClick={() => setMenuOpen(false)}
          >
            Home
          </Link>
          {isAuthenticated && (
            <Link
              className="tu-mobile-link flex items-center min-h-[44px] px-3 py-1.5 rounded-sm text-[var(--text-2)] no-underline text-[0.82rem] transition-all hover:bg-[var(--list-hover)] hover:text-[var(--text)]"
              to="/dashboard"
              onClick={() => setMenuOpen(false)}
            >
              Dashboard
            </Link>
          )}
          <Link
            className="tu-mobile-link flex items-center min-h-[44px] px-3 py-1.5 rounded-sm text-[var(--text-2)] no-underline text-[0.82rem] transition-all hover:bg-[var(--list-hover)] hover:text-[var(--text)]"
            to="/about"
            onClick={() => setMenuOpen(false)}
          >
            About
          </Link>
          <Link
            className="tu-mobile-link flex items-center min-h-[44px] px-3 py-1.5 rounded-sm text-[var(--text-2)] no-underline text-[0.82rem] transition-all hover:bg-[var(--list-hover)] hover:text-[var(--text)]"
            to="/pricing"
            onClick={() => setMenuOpen(false)}
          >
            Pricing
          </Link>
          <button
            className="tu-mobile-link flex items-center min-h-[44px] px-3 py-1.5 rounded-sm border-none bg-transparent cursor-pointer text-left font-[inherit] text-[var(--text-2)] text-[0.82rem] transition-all hover:bg-[var(--list-hover)] hover:text-[var(--text)]"
            onClick={() => {
              handleShare();
              setMenuOpen(false);
            }}
          >
            Share
          </button>
          <a
            className="tu-mobile-link flex items-center min-h-[44px] px-3 py-1.5 rounded-sm text-[var(--text-2)] no-underline text-[0.82rem] transition-all hover:bg-[var(--list-hover)] hover:text-[var(--text)]"
            href="https://github.com/sojitra-nency/FixMyText"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setMenuOpen(false)}
          >
            GitHub
          </a>
          {setMode && (
            <button
              className="tu-mobile-link flex items-center min-h-[44px] px-3 py-1.5 rounded-sm border-none bg-transparent cursor-pointer text-left font-[inherit] text-[var(--text-2)] text-[0.82rem] transition-all hover:bg-[var(--list-hover)] hover:text-[var(--text)]"
              onClick={() => {
                setMode(mode === 'dark' ? 'light' : 'dark');
                setMenuOpen(false);
              }}
            >
              {mode === 'dark' ? 'Light Theme' : 'Dark Theme'}
            </button>
          )}
          {!isAuthenticated && (
            <Link
              className="tu-mobile-link flex items-center min-h-[44px] px-3 py-1.5 rounded-sm text-[var(--text-2)] no-underline text-[0.82rem] transition-all hover:bg-[var(--list-hover)] hover:text-[var(--text)]"
              to="/login"
              onClick={() => setMenuOpen(false)}
            >
              Sign In
            </Link>
          )}
          {isAuthenticated && (
            <>
              <div className="h-px bg-[var(--border)] mx-2 my-1" />
              <button
                className="tu-mobile-link flex items-center min-h-[44px] px-3 py-1.5 rounded-sm border-none bg-transparent cursor-pointer text-left font-[inherit] text-[#f48771] text-[0.82rem] transition-all hover:bg-[var(--list-hover)]"
                onClick={() => {
                  setMenuOpen(false);
                  logout();
                }}
              >
                Sign Out
              </button>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
