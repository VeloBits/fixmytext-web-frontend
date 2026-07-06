import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'FixMyText — Free Online Text Tools',
    template: '%s | FixMyText',
  },
  description:
    '254+ free text transformation tools: case converters, encoders, ciphers, AI writing tools, and more. No signup required.',
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? 'https://fixmytext.velobits.dev'
  ),
  openGraph: {
    siteName: 'FixMyText',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      {/* The share viewer's theme-init script adds `dark` to <body> before
          hydration (see app/share/[id]/layout.tsx) — suppress the resulting
          className mismatch warning. */}
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
