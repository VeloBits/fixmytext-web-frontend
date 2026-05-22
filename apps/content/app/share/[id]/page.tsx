import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getShareResult } from '@/lib/api';
import ShareClient from './ShareClient';
import { getToolBySlug } from '@velobits/tools-registry';
import { WEB_APP_BASE_URL } from '@velobits/api-client';

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * Sprint 5c — The main win: OG cards now work for social sharing.
 *
 * Before (Vite SPA): every /share/{id} URL served a blank shell; Twitter,
 * LinkedIn, and Slack scrapers saw no useful meta → generic preview cards.
 *
 * After (Next.js SSR): generateMetadata() fetches the share record server-side
 * and populates og:title, og:description, and twitter:card with real content
 * from the tool output → rich preview cards on every platform.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const share = await getShareResult(id);

  if (!share) {
    return {
      title: 'Shared Result Not Found',
      description: 'This shared result may have expired or been removed.',
    };
  }

  const tool = getToolBySlug(share.tool_id);
  const preview = share.output_text.slice(0, 160).replace(/\s+/g, ' ').trim();
  const toolName = share.tool_label ?? tool?.label ?? 'Text Tool';
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://fixmytext.velobits.dev';

  return {
    title: `${toolName} — Shared Result`,
    description: preview || `Text transformed with ${toolName} on FixMyText.`,
    openGraph: {
      title: `${toolName} — Shared via FixMyText`,
      description: preview || `Processed with ${toolName}`,
      type: 'website',
      url: `${siteUrl}/share/${id}`,
      siteName: 'FixMyText',
    },
    twitter: {
      card: 'summary',
      title: `${toolName} — Shared via FixMyText`,
      description: preview || `Processed with ${toolName}`,
    },
  };
}

export default async function SharePage({ params }: Props) {
  const { id } = await params;
  const share = await getShareResult(id);

  if (!share) {
    notFound();
  }

  const tool = getToolBySlug(share.tool_id);

  return (
    <ShareClient
      share={share}
      tool={tool ?? null}
      editorUrl={`${WEB_APP_BASE_URL}?tool=${share.tool_id}`}
    />
  );
}
