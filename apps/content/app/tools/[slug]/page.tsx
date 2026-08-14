import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getAllSlugs, getToolBySlug, getToolsByGroup, TOOL_GROUPS } from '@velobits/tools-registry';
import { WEB_APP_BASE_URL } from '@velobits/api-client';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const tool = getToolBySlug(slug);
  if (!tool) return { title: 'Tool Not Found' };

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://fixmytext.velobits.dev';

  return {
    title: tool.label,
    description: `${tool.description} Free online tool - no install, no signup.`,
    keywords: [...(tool.keywords ?? []), tool.label, 'free online tool', 'text tool'],
    openGraph: {
      title: `${tool.label} - Free Online Text Tool`,
      description: tool.description,
      type: 'website',
      url: `${siteUrl}/tools/${slug}`,
    },
    twitter: {
      card: 'summary',
      title: `${tool.label} - FixMyText`,
      description: tool.description,
    },
    alternates: { canonical: `${siteUrl}/tools/${slug}` },
  };
}

/** Build the JSON-LD SoftwareApplication schema for a single tool. */
function buildJsonLd(slug: string, tool: ReturnType<typeof getToolBySlug>) {
  if (!tool) return null;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://fixmytext.velobits.dev';
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: tool.label,
    description: tool.description,
    applicationCategory: 'UtilitiesApplication',
    operatingSystem: 'Web',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    url: `${siteUrl}/tools/${slug}`,
  };
}

const GROUP_COLORS: Record<string, string> = {
  case: 'violet',
  cleanup: 'teal',
  lines: 'indigo',
  encoding: 'cyan',
  escaping: 'amber',
  hashing: 'orange',
  ciphers: 'rose',
  developer: 'green',
  ai_writing: 'pink',
  ai_content: 'pink',
  language: 'indigo',
  compare: 'sky',
  generate: 'emerald',
  utility: 'amber',
};

export default async function ToolPage({ params }: Props) {
  const { slug } = await params;
  const tool = getToolBySlug(slug);
  if (!tool) notFound();

  const group = TOOL_GROUPS.find((g) => g.id === tool.group);
  const related = getToolsByGroup(tool.group)
    .filter((t) => t.id !== tool.id)
    .slice(0, 6);
  const jsonLd = buildJsonLd(slug, tool);
  const editorUrl = `${WEB_APP_BASE_URL}?tool=${slug}`;
  const accent = `var(--${GROUP_COLORS[tool.group] ?? 'accent'})`;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}

      <div className="min-h-screen bg-[var(--bg)]">
        {/* ── Hero ── */}
        <section className="border-b border-[var(--border)] bg-[var(--surface)]">
          <div className="max-w-3xl mx-auto px-4 py-12">
            {/* Breadcrumb */}
            <nav
              className="flex items-center gap-1.5 text-xs text-[var(--text-3)] mb-6"
              aria-label="Breadcrumb"
            >
              <a href="/tools" className="hover:text-[var(--text)] transition-colors">
                All Tools
              </a>
              <span>/</span>
              <a
                href={`/tools?group=${tool.group}`}
                className="hover:text-[var(--text)] transition-colors"
              >
                {group?.label ?? tool.group}
              </a>
              <span>/</span>
              <span className="text-[var(--text-2)]">{tool.label}</span>
            </nav>

            {/* Icon + title */}
            <div className="flex items-center gap-4 mb-4">
              <div
                className="w-12 h-12 rounded-[var(--r-lg)] flex items-center justify-center text-sm font-bold shrink-0 bg-[var(--surface-2)]"
                style={{ color: accent }}
              >
                {tool.icon}
              </div>
              <div>
                <h1 className="text-3xl font-extrabold text-[var(--text)] tracking-tight">
                  {tool.label}
                </h1>
                <p className="text-sm text-[var(--text-3)] mt-0.5">
                  {group?.label} · Free online tool
                </p>
              </div>
            </div>

            <p className="text-[var(--text-2)] text-base leading-relaxed mb-8">
              {tool.description}. Free to use with no install or signup required.
            </p>

            <a
              href={editorUrl}
              className="inline-flex items-center gap-2.5 px-6 py-3 rounded-[var(--r-lg)] font-semibold text-sm bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors shadow-sm"
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
              Try {tool.label} Free
            </a>
          </div>
        </section>

        {/* ── What it does ── */}
        <section className="max-w-3xl mx-auto px-4 py-10">
          <h2 className="text-lg font-bold text-[var(--text)] mb-3">What does it do?</h2>
          <p className="text-[var(--text-2)] leading-relaxed">
            {tool.description}. This tool runs entirely in your browser - no data is sent to any
            server unless you choose to use the AI-powered features. It is part of the{' '}
            <strong>{group?.label}</strong> category in FixMyText.
          </p>

          {tool.keywords && tool.keywords.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-[var(--text-3)] mb-2 uppercase tracking-wider">
                Also known as
              </h3>
              <div className="flex flex-wrap gap-2">
                {tool.keywords.map((kw) => (
                  <span
                    key={kw}
                    className="px-2.5 py-1 rounded-full text-xs bg-[var(--surface-2)] text-[var(--text-2)] border border-[var(--border)]"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* ── CTA card ── */}
        <section className="max-w-3xl mx-auto px-4 pb-10">
          <div className="rounded-[var(--r-xl)] border border-[var(--border)] bg-[var(--surface)] p-8 text-center">
            <h2 className="text-xl font-bold text-[var(--text)] mb-2">
              Ready to use {tool.label}?
            </h2>
            <p className="text-sm text-[var(--text-2)] mb-5">
              No install, no signup. Open the editor and start transforming text instantly.
            </p>
            <a
              href={editorUrl}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[var(--r-lg)] font-semibold text-sm bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors"
            >
              Open {tool.label} in Editor →
            </a>
          </div>
        </section>

        {/* ── Related tools ── */}
        {related.length > 0 && (
          <section className="max-w-3xl mx-auto px-4 pb-16">
            <h2 className="text-lg font-bold text-[var(--text)] mb-4">
              More {group?.label ?? ''} tools
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {related.map((t) => (
                <a
                  key={t.id}
                  href={`/tools/${t.id}`}
                  className="flex items-center gap-2.5 p-3 rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)] hover:bg-[var(--bg2)] transition-all text-sm text-[var(--text-2)] hover:text-[var(--text)]"
                >
                  <span
                    className="text-[0.65rem] font-bold px-1.5 py-0.5 rounded-sm bg-[var(--surface-2)] shrink-0"
                    style={{ color: accent }}
                  >
                    {t.icon}
                  </span>
                  <span className="truncate font-medium">{t.label}</span>
                </a>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
