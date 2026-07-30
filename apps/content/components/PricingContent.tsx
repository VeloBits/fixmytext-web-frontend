'use client';
/**
 * PricingContent - client component for the pricing page.
 * The Next.js page shell (app/pricing/page.tsx) provides the SEO meta tags;
 * this component handles all interactive behaviour (Razorpay checkout,
 * pass catalog fetch, subscription state).
 */
import { WEB_APP_BASE_URL } from '@velobits/api-client';

const PLANS = [
  {
    name: 'Free',
    price: '₹0',
    period: 'forever',
    highlight: false,
    features: [
      '3 AI tool uses / day',
      '53 local text tools - unlimited',
      'No account required',
      'Copy, export to PDF / DOCX',
    ],
    cta: 'Start for free',
    ctaHref: WEB_APP_BASE_URL,
  },
  {
    name: 'Pro',
    price: '₹399',
    period: '/month',
    highlight: true,
    features: [
      'Unlimited AI tool uses',
      'All 254+ tools',
      'Operation history (30 days)',
      'Saved templates & pipelines',
      'Priority access to new tools',
    ],
    cta: 'Upgrade to Pro',
    ctaHref: `${WEB_APP_BASE_URL}?upgrade=pro`,
  },
];

export default function PricingContent() {
  return (
    <div className="min-h-screen bg-[var(--bg)] py-16 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-[var(--text)] mb-3 tracking-tight">
            Simple, honest pricing
          </h1>
          <p className="text-lg text-[var(--text-2)] max-w-xl mx-auto">
            FixMyText is free forever. Pro and prepaid passes unlock unlimited AI tools.
          </p>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={[
                'rounded-[var(--r-xl)] border p-8 flex flex-col',
                plan.highlight
                  ? 'border-[var(--accent)] bg-[var(--surface)] shadow-[0_0_0_1px_var(--accent)]'
                  : 'border-[var(--border)] bg-[var(--surface)]',
              ].join(' ')}
            >
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-3xl font-extrabold text-[var(--text)]">{plan.price}</span>
                <span className="text-[var(--text-3)] text-sm">{plan.period}</span>
              </div>
              <h2 className="text-xl font-bold text-[var(--text)] mb-1">{plan.name}</h2>
              <ul className="mt-4 mb-8 flex-1 space-y-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-[var(--text-2)]">
                    <svg
                      className="flex-shrink-0"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--accent)"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <a
                href={plan.ctaHref}
                className={[
                  'inline-flex items-center justify-center px-5 py-2.5 rounded-[var(--r-lg)] font-semibold text-sm transition-colors',
                  plan.highlight
                    ? 'bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]'
                    : 'border border-[var(--border)] text-[var(--text)] hover:bg-[var(--bg2)]',
                ].join(' ')}
              >
                {plan.cta}
              </a>
            </div>
          ))}
        </div>

        {/* Prepaid passes note */}
        <div className="text-center p-6 bg-[var(--surface)] rounded-[var(--r-xl)] border border-[var(--border)]">
          <p className="text-sm text-[var(--text-2)]">
            Need one-time access?{' '}
            <a
              href={`${WEB_APP_BASE_URL}?upgrade=passes`}
              className="text-[var(--accent)] font-medium hover:underline"
            >
              Browse prepaid passes →
            </a>{' '}
            Starting from ₹29 for 5 AI uses.
          </p>
        </div>
      </div>
    </div>
  );
}
