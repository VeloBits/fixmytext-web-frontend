'use client';
import { useState } from 'react';
import type { ShareResult } from '@/lib/api';
import type { ToolDefinition } from '@velobits/tools-registry';

interface Props {
  share: ShareResult;
  tool: ToolDefinition | null;
  editorUrl: string;
}

export default function ShareClient({ share, tool, editorUrl }: Props) {
  const [copied, setCopied] = useState(false);

  const lines = share.output_text.split('\n');
  const words = share.output_text.split(/\s+/).filter(Boolean).length;
  const chars = share.output_text.length;
  const createdDate = new Date(share.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const handleCopy = () => {
    navigator.clipboard.writeText(share.output_text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="sh-page min-h-screen bg-[var(--bg)]">
      {/* Hero */}
      <div className="sh-hero relative overflow-hidden py-12 px-4">
        <div className="sh-hero-glow absolute inset-0 bg-gradient-to-b from-[var(--accent-glow)] to-transparent pointer-events-none" />
        <div className="sh-hero-inner relative max-w-3xl mx-auto text-center">
          <div className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-[var(--accent)] text-white mb-4">
            Shared Result
          </div>
          <div className="flex items-center justify-center gap-2 mb-3">
            {tool && (
              <span
                className="text-[0.7rem] font-bold px-2 py-1 rounded-sm"
                style={{
                  color: `var(--${tool.color ?? 'accent'})`,
                  background: 'var(--surface-2)',
                }}
              >
                {tool.icon}
              </span>
            )}
            <h1 className="text-2xl font-extrabold text-[var(--text)]">
              {share.tool_label}
            </h1>
          </div>
          <div className="flex items-center justify-center gap-3 text-sm text-[var(--text-3)] mb-6">
            <span>{createdDate}</span>
            <span className="w-1 h-1 rounded-full bg-[var(--text-3)]" />
            <span>{lines.length} lines</span>
            <span className="w-1 h-1 rounded-full bg-[var(--text-3)]" />
            <span>{words} words</span>
            <span className="w-1 h-1 rounded-full bg-[var(--text-3)]" />
            <span>{chars} chars</span>
          </div>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={handleCopy}
              className={[
                'inline-flex items-center gap-2 px-4 py-2 rounded-[var(--r-lg)] text-sm font-semibold transition-colors',
                copied
                  ? 'bg-[var(--emerald)] text-white'
                  : 'bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] hover:bg-[var(--bg2)]',
              ].join(' ')}
            >
              {copied ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  Copy to Clipboard
                </>
              )}
            </button>
            <a
              href={editorUrl}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--r-lg)] text-sm font-semibold bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
              Try FixMyText
            </a>
          </div>
        </div>
      </div>

      {/* Output card */}
      <div className="max-w-3xl mx-auto px-4 pb-12">
        <div className="rounded-[var(--r-xl)] border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
          {/* macOS-style titlebar */}
          <div className="flex items-center gap-2 px-4 py-3 bg-[var(--surface-2)] border-b border-[var(--border)]">
            <span className="w-3 h-3 rounded-full bg-[#FF5F57]" />
            <span className="w-3 h-3 rounded-full bg-[#FEBC2E]" />
            <span className="w-3 h-3 rounded-full bg-[#28C840]" />
            <span className="flex-1 text-center text-xs text-[var(--text-3)] truncate">
              output.txt — {share.tool_label}
            </span>
            <button
              onClick={handleCopy}
              title="Copy"
              className="text-[var(--text-3)] hover:text-[var(--text)] transition-colors"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="flex overflow-auto max-h-[60vh] font-mono text-xs sm:text-sm leading-relaxed">
            {lines.length > 1 && (
              <div className="hidden sm:block select-none px-3 py-4 text-right text-[var(--text-3)] border-r border-[var(--border)] bg-[var(--surface-2)] min-w-[3rem]">
                {lines.map((_, i) => (
                  <div key={i}>{i + 1}</div>
                ))}
              </div>
            )}
            <pre className="flex-1 min-w-0 p-4 text-[var(--text)] whitespace-pre-wrap break-words overflow-auto">
              {share.output_text}
            </pre>
          </div>

          {/* Status bar */}
          <div className="flex items-center gap-4 px-4 py-2 bg-[var(--accent)] text-white text-xs">
            <span>{lines.length} {lines.length === 1 ? 'line' : 'lines'}</span>
            <span>{words} words</span>
            <span>{chars} chars</span>
            <span className="ml-auto">UTF-8</span>
          </div>
        </div>

        {/* Footer CTA */}
        <div className="mt-6 text-center text-sm text-[var(--text-3)]">
          Transform your text with 254+ tools —{' '}
          <a href={editorUrl} className="text-[var(--accent)] hover:underline font-medium">
            Get started free →
          </a>
        </div>
      </div>
    </div>
  );
}
