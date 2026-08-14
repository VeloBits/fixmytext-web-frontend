import type { Metadata } from 'next';
import PricingContent from '@/components/PricingContent';

export const metadata: Metadata = {
  title: 'Pricing',
  description:
    'FixMyText is free forever. Upgrade to Pro for unlimited AI tools, or grab a prepaid pass for one-off access. No subscription required.',
  openGraph: {
    title: 'FixMyText Pricing - Free forever, Pro plans available',
    description:
      'Start free with 3 AI uses per day. Go Pro for ₹399/month or grab a prepaid pass starting at ₹29.',
    type: 'website',
  },
};

export default function PricingPage() {
  return <PricingContent />;
}
