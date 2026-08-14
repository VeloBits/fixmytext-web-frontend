import type { Metadata } from 'next';
import AboutContent from '@/components/About';

export const metadata: Metadata = {
  title: 'About',
  description:
    'FixMyText is a free, open-source text transformation platform with 254+ tools - case converters, encoders, ciphers, AI writing tools, and more. No signup required.',
  openGraph: {
    title: 'About FixMyText',
    description: '254+ free text tools. No install. No sign-up. Just open and type.',
    type: 'website',
  },
};

export default function AboutPage() {
  return <AboutContent />;
}
