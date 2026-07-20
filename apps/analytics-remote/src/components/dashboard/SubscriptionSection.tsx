import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useGetPassCatalogQuery } from '@velobits/app-core/store/api/passesApi';
import formatPriceUtil from '@velobits/app-core/utils/formatPrice';
import { PRO_PRICES, type SupportedCurrency } from '@velobits/app-core/constants/pricing';
import { TOOLS } from '@velobits/app-core/constants/tools';
import ToolPickerModal from '@velobits/app-core/components/subscription/ToolPickerModal';
import type { SubscriptionContextValue } from '@velobits/app-core/types/context';
import type { AlertLevel } from '@velobits/app-core/types/alert';
import type { NavigateFunction } from 'react-router-dom';
import type { components } from '@velobits/app-core/types/openapi';

type PassCatalogItem = components['schemas']['PassCatalogItem'];

const POPULAR_PASS_IDS = ['day_single', 'day_triple', 'day_all', 'sprint_all'];

const CREDIT_SOURCE_LABELS: Record<string, string> = {
  purchase: 'Purchased',
  welcome: 'Welcome bonus',
  spin: 'Spin reward',
  referral: 'Referral',
};

const PASS_SOURCE_LABELS: Record<string, string> = {
  purchase: 'Purchased',
  spin: 'Spin reward',
  referral: 'Referral',
  welcome: 'Welcome',
};

/** "expires in 3h" / "expires in 4 days" / "expires soon". */
function formatExpiry(expiresAt: string): string {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return 'expired';
  const hours = Math.round(ms / 3_600_000);
  if (hours < 1) return 'expires soon';
  if (hours < 48) return `expires in ${hours}h`;
  return `expires in ${Math.round(hours / 24)} days`;
}

function toolLabels(toolIds: string[], toolsCount: number): string {
  if (toolsCount === -1 || toolIds.includes('*')) return 'All tools';
  return toolIds
    .map((id) => TOOLS.find((t) => t.id === id)?.label || id)
    .filter(Boolean)
    .join(', ');
}

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
  // Tool-scoped passes require picking exactly N tools before checkout.
  const [pickerPass, setPickerPass] = useState<PassCatalogItem | null>(null);

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

  const loginReturnTo = '/login?returnTo=' + encodeURIComponent('/dashboard?tab=subscription');

  const doBuyPass = async (id: string, toolIds: string[]) => {
    setBuyingId(id);
    try {
      await subscription.handleBuyPass(id, toolIds);
    } finally {
      setBuyingId(null);
    }
  };

  const handleBuy = async (type: string, id: string, toolIds: string[] = []) => {
    if (!isAuthenticated) {
      showAlert?.('Sign in to purchase', 'warning');
      navigate(loginReturnTo);
      return;
    }
    if (type === 'pass') {
      const pass = passes.find((p) => p.id === id);
      // Tool-scoped pass without a selection yet: collect exactly N tools first.
      if (pass && pass.tools > 0 && toolIds.length === 0) {
        setPickerPass(pass);
        return;
      }
      await doBuyPass(id, toolIds);
      return;
    }
    setBuyingId(id);
    try {
      await subscription.handleBuyCredits(id);
    } finally {
      setBuyingId(null);
    }
  };

  const handleUpgrade = () => {
    if (!isAuthenticated) {
      navigate(loginReturnTo);
      return;
    }
    subscription.handleUpgrade();
  };

  const proExpiryDate = subscription?.proExpiresAt
    ? new Date(subscription.proExpiresAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null;
  const proNearExpiry = subscription?.proExpiresAt
    ? new Date(subscription.proExpiresAt).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000
    : false;

  const activePasses = subscription?.activePasses || [];
  const activeCredits = subscription?.activeCredits || [];

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
                  ? `Unlimited access to all tools${
                      proExpiryDate
                        ? subscription.proCancelled
                          ? ` · access until ${proExpiryDate}`
                          : ` · Pro until ${proExpiryDate}`
                        : ''
                    }`
                  : `${subscription?.freeUsesPerTool ?? 3} free uses per tool per day${
                      subscription?.totalCredits ? ` · ${subscription.totalCredits} credits` : ''
                    }`}
              </span>
            </div>
          </div>
          {subscription?.isPro && (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {(subscription.proCancelled || proNearExpiry) && (
                <button
                  className="tu-sub-btn tu-sub-btn--primary"
                  onClick={handleUpgrade}
                  disabled={subscription.upgradeLoading}
                >
                  {subscription.upgradeLoading ? 'Opening checkout…' : 'Renew Pro'}
                </button>
              )}
              {!subscription.proCancelled && (
                <button
                  className="tu-sub-btn tu-sub-btn--secondary"
                  onClick={() => {
                    if (
                      window.confirm(
                        proExpiryDate
                          ? `Cancel your Pro subscription? You keep access until ${proExpiryDate}.`
                          : 'Cancel your Pro subscription?'
                      )
                    )
                      subscription.handleCancelSubscription();
                  }}
                  disabled={subscription.cancelLoading}
                >
                  {subscription.cancelLoading ? 'Cancelling...' : 'Manage Plan'}
                </button>
              )}
            </div>
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
              <span className="tu-sub-stat-val">
                {(subscription?.freeUsesPerTool ?? 3) + (subscription?.dailyLoginBonus ? 1 : 0)}
              </span>
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

      {/* Active Passes + Credit breakdown (what the user actually owns) */}
      {(activePasses.length > 0 || activeCredits.length > 0) && (
        <div className="tu-sub-section">
          {activePasses.length > 0 && (
            <>
              <div className="tu-sub-section-header">
                <h3 className="tu-sub-section-title">Active Passes</h3>
              </div>
              <div className="tu-sub-pass-grid">
                {activePasses.map((pass) => (
                  <div key={pass.id} className="tu-sub-pass-card" data-testid="active-pass">
                    <span className="tu-sub-pass-name">{pass.name}</span>
                    <span className="tu-sub-pass-meta">
                      {pass.uses_today}/{pass.uses_per_day} uses today
                    </span>
                    <div
                      className="tu-upgrade-usage-track"
                      style={{ margin: '0.35rem 0', height: 4 }}
                    >
                      <div
                        className="tu-upgrade-usage-fill"
                        style={{
                          width: `${Math.min((pass.uses_today / pass.uses_per_day) * 100, 100)}%`,
                          height: '100%',
                        }}
                      />
                    </div>
                    <span className="tu-sub-pass-meta">
                      {toolLabels(pass.tool_ids, pass.tools_count)}
                    </span>
                    <span className="tu-sub-pass-meta">
                      {formatExpiry(pass.expires_at)}
                      {pass.source && PASS_SOURCE_LABELS[pass.source]
                        ? ` · ${PASS_SOURCE_LABELS[pass.source]}`
                        : ''}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
          {activeCredits.length > 0 && (
            <>
              <div className="tu-sub-section-header" style={{ marginTop: '0.75rem' }}>
                <h3 className="tu-sub-section-title">Credits</h3>
              </div>
              <div className="tu-sub-pass-grid">
                {activeCredits.map((credit) => (
                  <div key={credit.id} className="tu-sub-pass-card" data-testid="credit-pack">
                    <span className="tu-sub-pass-name">
                      {CREDIT_SOURCE_LABELS[credit.source] || credit.source}
                    </span>
                    <span className="tu-sub-pass-meta">
                      {credit.credits_remaining}/{credit.credits_total} remaining
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

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
                {subscription?.upgradeLoading ? 'Opening checkout…' : 'Upgrade to Pro'}
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

      {/* Tool picker for tool-scoped passes */}
      <ToolPickerModal
        open={Boolean(pickerPass)}
        requiredCount={pickerPass?.tools ?? 1}
        passName={pickerPass?.name ?? ''}
        priceLabel={pickerPass ? formatPrice(pickerPass.price) : undefined}
        onConfirm={(toolIds) => {
          const passId = pickerPass?.id;
          setPickerPass(null);
          if (passId) void doBuyPass(passId, toolIds);
        }}
        onCancel={() => setPickerPass(null)}
      />
    </div>
  );
}
