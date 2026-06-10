import type { Metadata } from 'next';
import { TOOLS, TOOL_GROUPS } from '@velobits/tools-registry';
import { WEB_APP_BASE_URL } from '@velobits/api-client';

export const metadata: Metadata = {
  title: 'All Tools',
  description: `Browse all ${TOOLS.length}+ free online text tools — case converters, encoders, ciphers, AI writing tools, developer utilities, and more. No install, no signup.`,
  openGraph: {
    title: `All ${TOOLS.length}+ Free Text Tools — FixMyText`,
    description: 'Case converters, encoders, ciphers, AI writing tools, developer utilities, and more.',
    type: 'website',
  },
};

export default function ToolsPage() {
  const grouped = TOOL_GROUPS.map((group) => ({
    ...group,
    tools: TOOLS.filter((t) => t.group === group.id),
  }));

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {/* Hero */}
      <div className="border-b border-[var(--border)] bg-[var(--surface)] py-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[var(--text)] tracking-tight mb-3">
            {TOOLS.length}+ Free Text Tools
          </h1>
          <p className="text-[var(--text-2)] text-lg max-w-xl mx-auto">
            Every tool runs in your browser. No install, no signup, no cost.
          </p>
        </div>
      </div>

      {/* Tool groups */}
      <div className="max-w-4xl mx-auto px-4 py-12 space-y-12">
        {grouped.map((group) => (
          <section key={group.id}>
            <h2 className="text-xl font-bold text-[var(--text)] mb-4">
              {group.label}
              <span className="ml-2 text-sm font-normal text-[var(--text-3)]">
                {group.tools.length} tools
              </span>
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
              {group.tools.map((tool) => (
                <a
                  key={tool.id}
                  href={`/tools/${tool.id}`}
                  className="flex items-center gap-2.5 p-3 rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)] hover:bg-[var(--bg2)] transition-all"
                >
                  <span
                    className="text-[0.65rem] font-bold px-1.5 py-0.5 rounded-sm bg-[var(--surface-2)] shrink-0 text-[var(--accent)]"
                  >
                    {tool.icon}
                  </span>
                  <span className="text-sm text-[var(--text-2)] font-medium truncate hover:text-[var(--text)]">
                    {tool.label}
                  </span>
                </a>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Bottom CTA */}
      <div className="border-t border-[var(--border)] bg-[var(--surface)] py-10 px-4 text-center">
        <p className="text-[var(--text-2)] mb-4">
          Want to try a tool right now?
        </p>
        <a
          href={WEB_APP_BASE_URL}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-[var(--r-lg)] font-semibold text-sm bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
          Open the Editor
        </a>
      </div>
    </div>
  );
}
