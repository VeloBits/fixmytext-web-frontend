import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useGetPassCatalogQuery } from '@velobits/app-core/store/api/passesApi';
import formatPriceUtil from '@velobits/app-core/utils/formatPrice';
import type { SubscriptionContextValue } from '@velobits/app-core/types/context';
import type { AlertLevel } from '@velobits/app-core/types/alert';
import type { NavigateFunction } from 'react-router-dom';

type SupportedCurrency = 'inr' | 'usd' | 'gbp' | 'eur';

const PRO_PRICES: Record<SupportedCurrency, string> = { inr: '₹399', usd: '$5', gbp: '£4', eur: '€4.50' };
const POPULAR_PASS_IDS = ['day_single', 'day_triple', 'day_all', 'sprint_all'];

interface SubscriptionSectionProps {
  subscription: SubscriptionContextValue;
  showAlert: (msg: string, type?: AlertLevel) => void;
  navigate: NavigateFunction;
  isAuthenticated: boolean;
}

/**
 * Dashboard subscription section.
 * Shows current plan, Pro upgrade card, popular passes, and credit balance.
 */
export default function SubscriptionSection({
  subscription,
  showAlert,
  navigate,
  isAuthenticated,
}: SubscriptionSectionProps) {
  const {
    data: catalog,
    isLoading: catalogLoading,
    error: catalogError,
    refetch,
  } = useGetPassCatalogQuery();
  const [buyingId, setBuyingId] = useState<string | null>(null);

  const passes = useMemo(() => catalog?.passes || [], [catalog?.passes]);
  const symbol = passes[0]?.symbol || '$';
  const currency = (passes[0]?.currency || 'usd') as SupportedCurrency;
  const formatPrice = (price: number) => formatPriceUtil(price, currency, symbol);

  const popularPasses = useMemo(
    () =>
      POPULAR_PASS_IDS.map((id) => passes.find((p) => p.id === id)).filter(
        (p): p is NonNullable<typeof p> => p != null
      ),
    [passes]
  );

  const handleBuy = async (type: string, id: string, toolIds: string[] = []) => {
    if (!isAuthenticated) {
      showAlert?.('Sign in to purchase', 'warning');
      navigate('/login');
      return;
    }
    setBuyingId(id);
    try {
      if (type === 'pass') await subscription.handleBuyPass(id, toolIds);
      else await subscription.handleBuyCredits(id);
    } finally {
      setBuyingId(null);
    }
  };

  const handleUpgrade = () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    subscription.handleUpgrade();
  };

  if (catalogError) {
    return (
      <div className="tu-dash-content">
        <h2 className="tu-dash-title">Subscription</h2>
        <p className="tu-dash-subtitle">Manage your plan and billing</p>
        <div className="error-state">
          <p>Failed to load subscription data</p>
          <button onClick={refetch}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="tu-dash-content">
      <h2 className="tu-dash-title">Subscription</h2>
      <p className="tu-dash-subtitle">Manage your plan and billing</p>

      {/* Current Plan Status */}
      <div className={`tu-sub-plan-card${subscription?.isPro ? ' tu-sub-plan-card--pro' : ''}`}>
        <div className="tu-sub-plan-header">
          <div className="tu-sub-plan-badge-wrap">
            <div
              className={`tu-sub-plan-badge${subscription?.isPro ? ' tu-sub-plan-badge--pro' : ''}`}
            >
              {subscription?.isPro ? (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
              ) : (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              )}
            </div>
            <div className="tu-sub-plan-info">
              <span className="tu-sub-plan-name">
                {subscription?.isPro ? 'Pro Plan' : 'Free Plan'}
              </span>
              <span className="tu-sub-plan-desc">
                {subscription?.isPro
                  ? 'Unlimited access to all tools'
                  : `3 free uses per tool per day${
                      subscription?.totalCredits ? ` · ${subscription.totalCredits} credits` : ''
                    }`}
              </span>
            </div>
          </div>
          {subscription?.isPro && (
            <button
              className="tu-sub-btn tu-sub-btn--secondary"
              onClick={() => {
                if (window.confirm('Cancel your Pro subscription?'))
                  subscription.handleCancelSubscription();
              }}
              disabled={subscription.cancelLoading}
            >
              {subscription.cancelLoading ? 'Cancelling...' : 'Manage Plan'}
            </button>
          )}
        </div>

        {!subscription?.isPro && (
          <div className="tu-sub-plan-stats">
            <div className="tu-sub-stat">
              <span className="tu-sub-stat-val">{subscription?.totalCredits || 0}</span>
              <span className="tu-sub-stat-label">Credits</span>
            </div>
            <div className="tu-sub-stat-divider" />
            <div className="tu-sub-stat">
              <span className="tu-sub-stat-val">3</span>
              <span className="tu-sub-stat-label">Uses/day</span>
            </div>
            <div className="tu-sub-stat-divider" />
            <div className="tu-sub-stat">
              <span className="tu-sub-stat-val">70+</span>
              <span className="tu-sub-stat-label">Tools</span>
            </div>
          </div>
        )}
      </div>

      {/* Pro Upgrade Card */}
      {!subscription?.isPro && (
        <motion.div
          className="tu-sub-pro-card"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <div className="tu-sub-pro-glow" />
          <div className="tu-sub-pro-content">
            <div className="tu-sub-pro-left">
              <div className="tu-sub-pro-title">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
                <span>Go Pro</span>
              </div>
              <p className="tu-sub-pro-desc">
                Unlimited access to every tool. No daily limits. Cancel anytime.
              </p>
              <ul className="tu-sub-pro-perks">
                <li>
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Unlimited uses on all 70+ tools
                </li>
                <li>
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Priority support
                </li>
                <li>
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  30-day money-back guarantee
                </li>
              </ul>
            </div>
            <div className="tu-sub-pro-right">
              <span className="tu-sub-pro-price">
                {PRO_PRICES[currency] || '$5'}
                <small>/mo</small>
              </span>
              <button
                className="tu-sub-btn tu-sub-btn--primary tu-sub-btn--wide"
                onClick={handleUpgrade}
                disabled={subscription?.upgradeLoading}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
                {subscription?.upgradeLoading ? 'Loading...' : 'Upgrade to Pro'}
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Popular Passes */}
      {!subscription?.isPro && (
        <div className="tu-sub-section">
          <div className="tu-sub-section-header">
            <h3 className="tu-sub-section-title">Popular Passes</h3>
            <button className="tu-sub-section-link" onClick={() => navigate('/pricing')}>
              View all plans
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
          </div>

          {catalogLoading ? (
            <div className="tu-sub-loading">
              <span className="tu-pass-spinner" /> Loading plans...
            </div>
          ) : (
            <div className="tu-sub-pass-grid">
              {popularPasses.map((p, i) => (
                <motion.div
                  key={p.id}
                  className="tu-sub-pass-card"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 + i * 0.04 }}
                  whileHover={{ y: -2 }}
                >
                  <span className="tu-sub-pass-name">{p.name}</span>
                  <span className="tu-sub-pass-price">{formatPrice(p.price)}</span>
                  <span className="tu-sub-pass-meta">
                    {p.uses_per_day} uses/day &middot; {p.duration_days}d
                  </span>
                  <button
                    className="tu-sub-btn tu-sub-btn--outline"
                    disabled={buyingId === p.id}
                    onClick={() => handleBuy('pass', p.id)}
                  >
                    {buyingId === p.id ? '...' : 'Buy'}
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
