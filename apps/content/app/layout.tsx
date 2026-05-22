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
      <body>{children}</body>
    </html>
  );
}
