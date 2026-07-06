import { WEB_APP_BASE_URL } from '@velobits/api-client';

interface Props {
  emoji: string;
  title: string;
  description: string;
}

/**
 * Full-page status screen for the share viewer's non-happy paths
 * (not found / expired / fetch failure). Mirrors the shell SharePage's
 * error states so both share routes speak the same language.
 */
export default function ShareStatusView({ emoji, title, description }: Props) {
  return (
    <div className="sh-page min-h-screen bg-[var(--bg)] flex items-center justify-center px-4">
      <div className="max-w-md text-center">
        <div className="text-5xl mb-4">{emoji}</div>
        <h1 className="text-2xl font-extrabold text-[var(--text)] mb-2">{title}</h1>
        <p className="text-sm text-[var(--text-3)] mb-6">{description}</p>
        <a
          href={WEB_APP_BASE_URL}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--r-lg)] text-sm font-semibold bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
          Try FixMyText
        </a>
      </div>
    </div>
  );
}
