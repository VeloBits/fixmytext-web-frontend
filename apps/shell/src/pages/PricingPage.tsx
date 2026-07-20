import { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useGetPassCatalogQuery } from '@velobits/app-core/store/api/passesApi';
import useSubscription from '@velobits/app-core/hooks/useSubscription';
import formatPriceUtil from '@velobits/app-core/utils/formatPrice';
import { useOidcAuth } from '@velobits/app-core/auth/useOidcAuth';
import { PRO_PRICES, type SupportedCurrency } from '@velobits/app-core/constants/pricing';
import ToolPickerModal from '@velobits/app-core/components/subscription/ToolPickerModal';
import type { AlertLevel } from '@/contexts/AlertContext';
import type { SubscriptionContextValue } from '@/contexts/AppContext';
import type { components } from '@velobits/app-core/types/openapi';

type PassCatalogItem = components['schemas']['PassCatalogItem'];
type CreditPackItem = components['schemas']['CreditPackItem'];

// SVG icons extracted to a shared module for reusability
import {
  NumIcon,
  DropletIcon,
  SunIcon,
  RunnerIcon,
  CalendarIcon,
  TrophyIcon,
  WrenchIcon,
  TwoIcon,
  StarIcon,
  FlagIcon,
  ClipboardIcon,
  RulerIcon,
  LeafIcon,
  CrownIcon,
  JarIcon,
  BucketIcon,
  BarrelIcon,
  GiftIcon,
} from '@/components/icons/PricingIcons';

const PASS_GROUPS = [
  {
    key: 'micro',
    label: 'Micro',
    icon: <DropletIcon size={16} />,
    desc: 'Just a taste — pocket change',
  },
  { key: 'day', label: 'Day', icon: <SunIcon size={16} />, desc: 'One productive day' },
  {
    key: 'multiday',
    label: 'Multi-Day',
    icon: <RunnerIcon size={16} />,
    desc: 'Short-term commitment',
  },
  {
    key: 'monthly',
    label: 'Monthly',
    icon: <CalendarIcon size={16} />,
    desc: 'Regular power user',
  },
  {
    key: 'longterm',
    label: 'Long-Term',
    icon: <TrophyIcon size={16} />,
    desc: 'Best value for pros',
  },
];

const GROUP_IDS = {
  micro: ['quick_fix', 'tinkerer', 'double_dip'],
  day: ['day_single', 'day_triple', 'day_five', 'day_ten', 'day_fifteen', 'day_all'],
  multiday: [
    'sprint_single',
    'sprint_triple',
    'sprint_five',
    'sprint_all',
    'marathon_five',
    'marathon_all',
    'stretch_all',
  ],
  monthly: ['monthly_five', 'monthly_ten', 'monthly_all'],
  longterm: ['season_all', 'half_year', 'annual'],
};

const PASS_ICONS = {
  quick_fix: <DropletIcon size={28} />,
  tinkerer: <WrenchIcon size={28} />,
  double_dip: <TwoIcon size={28} />,
  day_single: <NumIcon n={1} size={28} />,
  day_triple: <NumIcon n={3} size={28} />,
  day_five: <NumIcon n={5} size={28} />,
  day_ten: <NumIcon n={10} size={28} />,
  day_fifteen: <ClipboardIcon size={28} />,
  day_all: <StarIcon size={28} />,
  sprint_single: <FlagIcon size={28} />,
  sprint_triple: <FlagIcon size={28} />,
  sprint_five: <FlagIcon size={28} />,
  sprint_all: <FlagIcon size={28} />,
  marathon_five: <RunnerIcon size={28} />,
  marathon_all: <RunnerIcon size={28} />,
  stretch_all: <RulerIcon size={28} />,
  monthly_five: <CalendarIcon size={28} />,
  monthly_ten: <CalendarIcon size={28} />,
  monthly_all: <CalendarIcon size={28} />,
  season_all: <LeafIcon size={28} />,
  half_year: <CalendarIcon size={28} />,
  annual: <CrownIcon size={28} />,
};

const PASS_ICONS_LG = {
  quick_fix: <DropletIcon size={52} />,
  tinkerer: <WrenchIcon size={52} />,
  double_dip: <TwoIcon size={52} />,
  day_single: <NumIcon n={1} size={52} />,
  day_triple: <NumIcon n={3} size={52} />,
  day_five: <NumIcon n={5} size={52} />,
  day_ten: <NumIcon n={10} size={52} />,
  day_fifteen: <ClipboardIcon size={52} />,
  day_all: <StarIcon size={52} />,
  sprint_single: <FlagIcon size={52} />,
  sprint_triple: <FlagIcon size={52} />,
  sprint_five: <FlagIcon size={52} />,
  sprint_all: <FlagIcon size={52} />,
  marathon_five: <RunnerIcon size={52} />,
  marathon_all: <RunnerIcon size={52} />,
  stretch_all: <RulerIcon size={52} />,
  monthly_five: <CalendarIcon size={52} />,
  monthly_ten: <CalendarIcon size={52} />,
  monthly_all: <CalendarIcon size={52} />,
  season_all: <LeafIcon size={52} />,
  half_year: <CalendarIcon size={52} />,
  annual: <CrownIcon size={52} />,
};

const CREDIT_ICONS = {
  credits_5: <DropletIcon size={32} />,
  credits_15: <JarIcon size={32} />,
  credits_50: <BucketIcon size={32} />,
  credits_150: <BarrelIcon size={32} />,
};

function getValueTag(pass: PassCatalogItem): string | null {
  if (pass.id === 'day_all') return 'Best Day Deal';
  if (pass.id === 'sprint_all') return 'Popular';
  if (pass.id === 'monthly_all') return 'Best Monthly';
  if (pass.id === 'annual') return 'Best Value';
  if (pass.id === 'quick_fix') return 'Cheapest';
  return null;
}

function getPerDayPrice(
  pass: PassCatalogItem,
  formatPrice: (price: number, decimals?: number) => string
): string | null {
  if (pass.duration_days <= 1) return null;
  return formatPrice(pass.price / pass.duration_days);
}

/**
 * Pricing page component.
 * Displays Pro subscription, pass catalog grouped by category, and credit packs.
 * Supports detail modals for individual passes and credit packs.
 */
interface PricingPageProps {
  showAlert?: (message: string, type: AlertLevel) => void;
  subscription?: SubscriptionContextValue;
}

export default function PricingPage({ showAlert, subscription: subProp }: PricingPageProps) {
  const navigate = useNavigate();
  const { isAuthenticated, login } = useOidcAuth();
  const fallbackSub = useSubscription({ showAlert }) as unknown as SubscriptionContextValue;
  const subscription = subProp || fallbackSub;
  const { data: catalog, isLoading, error: catalogError } = useGetPassCatalogQuery();
  const [activeGroup, setActiveGroup] = useState('day');
  const [selectedPass, setSelectedPass] = useState<string | null>(null);
  const [selectedCredit, setSelectedCredit] = useState<string | null>(null);
  const [buyingId, setBuyingId] = useState<string | null>(null);
  // Tool-scoped passes require picking exactly N tools before checkout.
  const [pickerPass, setPickerPass] = useState<PassCatalogItem | null>(null);
  const detailCloseRef = useRef<HTMLButtonElement>(null);

  const passes = useMemo(() => catalog?.passes || [], [catalog]);
  const creditPacks = useMemo(() => catalog?.credit_packs || [], [catalog]);
  const symbol = passes[0]?.symbol || '$';
  const currency = (passes[0]?.currency || 'usd') as SupportedCurrency;

  const formatPrice = (price: number, decimals?: number) =>
    formatPriceUtil(price, currency, symbol, decimals);

  const passMap = useMemo(() => {
    const m: Record<string, PassCatalogItem> = {};
    passes.forEach((p) => {
      m[p.id] = p;
    });
    return m;
  }, [passes]);

  const creditMap = useMemo(() => {
    const m: Record<string, CreditPackItem> = {};
    creditPacks.forEach((c) => {
      m[c.id] = c;
    });
    return m;
  }, [creditPacks]);

  const activeGroupPasses = useMemo(
    () =>
      (GROUP_IDS[activeGroup as keyof typeof GROUP_IDS] || [])
        .map((id) => passMap[id])
        .filter((p): p is PassCatalogItem => Boolean(p)),
    [activeGroup, passMap]
  );

  const doBuyPass = async (passId: string, toolIds: string[]) => {
    setBuyingId(passId);
    try {
      await subscription.handleBuyPass(passId, toolIds);
    } finally {
      setBuyingId(null);
    }
  };

  const handleBuyPass = async (passId: string) => {
    if (!isAuthenticated) {
      showAlert?.('Sign in to purchase a pass', 'warning');
      login({ returnTo: '/pricing' });
      return;
    }
    const pass = passMap[passId];
    // Tool-scoped pass: the buyer picks exactly N tools first — the selection
    // becomes the server-validated pass scope.
    if (pass && pass.tools > 0) {
      setSelectedPass(null); // close the detail drawer under the picker
      setPickerPass(pass);
      return;
    }
    await doBuyPass(passId, []);
  };

  const handleBuyCredits = async (packId: string) => {
    if (!isAuthenticated) {
      showAlert?.('Sign in to purchase credits', 'warning');
      login({ returnTo: '/pricing' });
      return;
    }
    setBuyingId(packId);
    try {
      await subscription.handleBuyCredits(packId);
    } finally {
      setBuyingId(null);
    }
  };

  const detailPass = selectedPass ? passMap[selectedPass] : null;
  const detailCredit = selectedCredit ? creditMap[selectedCredit] : null;

  // Detail modals: close on Escape, focus the close button on open.
  const detailOpen = Boolean(detailPass || detailCredit);
  useEffect(() => {
    if (!detailOpen) return;
    detailCloseRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        setSelectedPass(null);
        setSelectedCredit(null);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [detailOpen]);

  return (
    <div className="tu-pricing">
      {/* -- Sticky top bar -- */}
      <div className="tu-pricing-topbar">
        <button className="tu-pricing-back" onClick={() => navigate('/')}>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Back to Editor
        </button>
        <span className="tu-pricing-topbar-title">Pricing</span>
      </div>

      <div className="tu-pricing-inner">
        {/* -- Hero -- */}
        <div className="tu-pricing-hero">
          <h1 className="tu-pricing-title">Simple, Flexible Pricing</h1>
          <p className="tu-pricing-subtitle">
            Every tool gets <strong>3 free uses/day</strong>. Need more? Pick a pass that fits your
            workflow.
          </p>
          <div className="tu-pricing-badges">
            <span className="tu-pricing-badge">70+ Tools</span>
            <span className="tu-pricing-badge">Cancel Anytime</span>
            <span className="tu-pricing-badge">Earn Free Passes</span>
          </div>
        </div>

        {/* -- Pro Card -- */}
        <motion.div
          className="tu-pricing-pro"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="tu-pricing-pro-glow" />
          <div className="tu-pricing-pro-badge">Recommended</div>
          <div className="tu-pricing-pro-content">
            <div className="tu-pricing-pro-left">
              <h2 className="tu-pricing-pro-name">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
                Pro
              </h2>
              <p className="tu-pricing-pro-desc">
                Unlimited access to every tool. No daily limits. No passes needed.
              </p>
              <ul className="tu-pricing-pro-features">
                <li>Unlimited uses on all 70+ tools</li>
                <li>No daily limits ever</li>
                <li>Priority support</li>
                <li>Cancel anytime</li>
              </ul>
            </div>
            <div className="tu-pricing-pro-right">
              <span className="tu-pricing-pro-price">
                {PRO_PRICES[currency] || '$5'}
                <small>/mo</small>
              </span>
              {subscription?.isPro ? (
                <>
                  <span className="tu-pricing-pro-current">Your Current Plan</span>
                  {subscription.proExpiresAt && (
                    <span className="tu-pricing-pro-guarantee">
                      {subscription.proCancelled ? 'Access until' : 'Pro until'}{' '}
                      {new Date(subscription.proExpiresAt).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  )}
                  {(subscription.proCancelled ||
                    (subscription.proExpiresAt &&
                      new Date(subscription.proExpiresAt).getTime() - Date.now() <
                        7 * 24 * 60 * 60 * 1000)) && (
                    <button
                      className="tu-pricing-pro-btn"
                      onClick={() => subscription.handleUpgrade()}
                      disabled={subscription?.upgradeLoading}
                    >
                      {subscription?.upgradeLoading ? 'Opening checkout…' : 'Renew Pro'}
                    </button>
                  )}
                </>
              ) : (
                <button
                  className="tu-pricing-pro-btn"
                  onClick={() => {
                    if (!isAuthenticated) {
                      login({ returnTo: '/pricing' });
                      return;
                    }
                    subscription.handleUpgrade();
                  }}
                  disabled={subscription?.upgradeLoading}
                >
                  {subscription?.upgradeLoading ? 'Opening checkout…' : 'Upgrade to Pro'}
                </button>
              )}
              <span className="tu-pricing-pro-guarantee">30-day money-back guarantee</span>
            </div>
          </div>
        </motion.div>

        {/* -- Divider -- */}
        <div className="tu-pricing-divider">
          <span>Or pick a pass</span>
        </div>

        {/* -- Category Tabs -- */}
        <div className="tu-pricing-tabs">
          {PASS_GROUPS.map((g) => (
            <button
              key={g.key}
              className={`tu-pricing-tab${activeGroup === g.key ? ' tu-pricing-tab--active' : ''}`}
              onClick={() => setActiveGroup(g.key)}
            >
              <span className="tu-pricing-tab-icon">{g.icon}</span>
              <span className="tu-pricing-tab-label">{g.label}</span>
            </button>
          ))}
        </div>

        {/* Group description */}
        <p className="tu-pricing-group-desc">
          {PASS_GROUPS.find((g) => g.key === activeGroup)?.desc}
        </p>

        {/* -- Pass Grid -- */}
        {catalogError ? (
          <div className="tu-pricing-loading">
            <p style={{ color: 'var(--text-muted)', marginBottom: 12 }}>Failed to load passes.</p>
            <button className="tu-pricing-card-btn" onClick={() => window.location.reload()}>
              Retry
            </button>
          </div>
        ) : isLoading ? (
          <div className="tu-pricing-loading">
            <div className="tu-pricing-spinner" />
            Loading passes...
          </div>
        ) : (
          <motion.div
            className="tu-pricing-grid"
            key={activeGroup}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {activeGroupPasses.map((p, i) => {
              const tag = getValueTag(p);
              const perDay = getPerDayPrice(p, formatPrice);
              return (
                <motion.div
                  key={p.id}
                  className={`tu-pricing-card${tag ? ' tu-pricing-card--featured' : ''}`}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => setSelectedPass(p.id)}
                >
                  {tag && <span className="tu-pricing-card-tag">{tag}</span>}
                  <div className="tu-pricing-card-top">
                    <span className="tu-pricing-card-icon">
                      {PASS_ICONS[p.id as keyof typeof PASS_ICONS] || <DropletIcon size={28} />}
                    </span>
                    <span className="tu-pricing-card-price">{formatPrice(p.price)}</span>
                  </div>
                  <span className="tu-pricing-card-name">{p.name}</span>
                  <span className="tu-pricing-card-subtitle">{p.subtitle}</span>
                  <div className="tu-pricing-card-chips">
                    <span className="tu-pricing-chip">{p.uses_per_day} uses/day</span>
                    <span className="tu-pricing-chip">
                      {p.tools === -1 ? 'All tools' : `${p.tools} tool${p.tools > 1 ? 's' : ''}`}
                    </span>
                    <span className="tu-pricing-chip">{p.duration_days}d</span>
                  </div>
                  {perDay && <span className="tu-pricing-card-perday">{perDay}/day</span>}
                  <div className="tu-pricing-card-actions">
                    <button
                      type="button"
                      className="tu-pricing-card-btn tu-pricing-card-btn--secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPass(p.id);
                      }}
                      aria-label={`View ${p.name} details`}
                    >
                      Details
                    </button>
                    <button
                      type="button"
                      className="tu-pricing-card-btn"
                      disabled={buyingId === p.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleBuyPass(p.id);
                      }}
                    >
                      {buyingId === p.id ? 'Loading...' : 'Buy Now'}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}

        {/* -- Credit Packs -- */}
        <div className="tu-pricing-section">
          <div className="tu-pricing-section-header">
            <h3 className="tu-pricing-section-title">Credit Packs</h3>
            <p className="tu-pricing-section-desc">
              Use on any tool. No expiry. 1 credit = 1 use beyond the daily free limit.
            </p>
          </div>
          <div className="tu-pricing-credit-grid">
            {creditPacks.map((c, i) => (
              <motion.div
                key={c.id}
                className="tu-pricing-credit-card"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.05 }}
                onClick={() => setSelectedCredit(c.id)}
                style={{ cursor: 'pointer' }}
              >
                <span className="tu-pricing-credit-icon">
                  {CREDIT_ICONS[c.id as keyof typeof CREDIT_ICONS] || <DropletIcon size={32} />}
                </span>
                <span className="tu-pricing-credit-name">{c.name}</span>
                <span className="tu-pricing-credit-amount">{c.credits} credits</span>
                <span className="tu-pricing-credit-price">{formatPrice(c.price)}</span>
                <span className="tu-pricing-credit-per">
                  {formatPrice(c.price / c.credits)}/use
                </span>
                <div className="tu-pricing-card-actions">
                  <button
                    type="button"
                    className="tu-pricing-card-btn tu-pricing-card-btn--secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedCredit(c.id);
                    }}
                    aria-label={`View ${c.name} details`}
                  >
                    Details
                  </button>
                  <button
                    type="button"
                    className="tu-pricing-card-btn"
                    disabled={buyingId === c.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleBuyCredits(c.id);
                    }}
                  >
                    {buyingId === c.id ? '...' : 'Buy'}
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* -- Free Tier -- */}
        <div className="tu-pricing-free">
          <div className="tu-pricing-free-icon">
            <GiftIcon size={32} />
          </div>
          <h3>Free Forever</h3>
          <p>
            Every tool gets <strong>3 free uses per day</strong> — no sign-up needed.
            <br />
            Log in for a <strong>+1 daily bonus</strong>. Earn free passes with the weekly reward
            spin!
          </p>
        </div>
      </div>

      {/* -- Pass Detail Drawer -- */}
      <AnimatePresence>
        {detailPass && (
          <motion.div
            className="tu-pass-detail-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedPass(null)}
          >
            <motion.div
              className="tu-pass-detail"
              role="dialog"
              aria-modal="true"
              aria-label={detailPass.name}
              initial={{ opacity: 0, scale: 0.92, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 24 }}
              transition={{ type: 'spring', damping: 26, stiffness: 340 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                ref={detailCloseRef}
                className="tu-pass-detail-close"
                aria-label="Close"
                onClick={() => setSelectedPass(null)}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>

              {/* -- Left Column: Hero + Stats + CTA -- */}
              <div className="tu-pass-detail-left">
                <div className="tu-pass-detail-hero">
                  <span className="tu-pass-detail-icon">
                    {PASS_ICONS_LG[detailPass.id as keyof typeof PASS_ICONS_LG] || (
                      <DropletIcon size={52} />
                    )}
                  </span>
                  <h2 className="tu-pass-detail-name">{detailPass.name}</h2>
                  <span className="tu-pass-detail-price">{formatPrice(detailPass.price)}</span>
                  <p className="tu-pass-detail-subtitle">{detailPass.subtitle}</p>
                </div>

                <div className="tu-pass-detail-stats">
                  <div className="tu-pass-detail-stat">
                    <span className="tu-pass-detail-stat-val">{detailPass.uses_per_day}</span>
                    <span className="tu-pass-detail-stat-label">Uses/day</span>
                  </div>
                  <div className="tu-pass-detail-stat">
                    <span className="tu-pass-detail-stat-val">
                      {detailPass.tools === -1 ? 'All' : detailPass.tools}
                    </span>
                    <span className="tu-pass-detail-stat-label">
                      {detailPass.tools === -1 ? 'Tools' : `Tool${detailPass.tools > 1 ? 's' : ''}`}
                    </span>
                  </div>
                  <div className="tu-pass-detail-stat">
                    <span className="tu-pass-detail-stat-val">{detailPass.duration_days}d</span>
                    <span className="tu-pass-detail-stat-label">Duration</span>
                  </div>
                  {detailPass.duration_days > 1 && (
                    <div className="tu-pass-detail-stat">
                      <span className="tu-pass-detail-stat-val">
                        {formatPrice(detailPass.price / detailPass.duration_days)}
                      </span>
                      <span className="tu-pass-detail-stat-label">Per day</span>
                    </div>
                  )}
                </div>

                <button
                  className="tu-pass-detail-cta"
                  disabled={buyingId === detailPass.id}
                  onClick={() => handleBuyPass(detailPass.id)}
                >
                  {buyingId === detailPass.id
                    ? 'Loading...'
                    : `Buy Now — ${formatPrice(detailPass.price)}`}
                </button>
                <p className="tu-pass-detail-footer">Secure payment via Razorpay</p>
              </div>

              {/* -- Right Column: Details -- */}
              <div className="tu-pass-detail-right">
                <div className="tu-pass-detail-section">
                  <h4>What&apos;s included</h4>
                  <ul className="tu-pass-detail-list">
                    <li>
                      {detailPass.uses_per_day} uses per day on{' '}
                      {detailPass.tools === -1
                        ? 'every tool (70+)'
                        : `${detailPass.tools} tool${detailPass.tools > 1 ? 's' : ''} you pick`}
                    </li>
                    <li>Works on AI tools, text transforms, exports — everything</li>
                    <li>
                      Active for {detailPass.duration_days} day
                      {detailPass.duration_days > 1 ? 's' : ''} from purchase
                    </li>
                    <li>Uses reset daily at midnight</li>
                    {detailPass.tools > 0 && (
                      <li>
                        Choose your {detailPass.tools > 1 ? `${detailPass.tools} tools` : 'tool'}{' '}
                        before checkout
                      </li>
                    )}
                  </ul>
                </div>

                <div className="tu-pass-detail-section">
                  <h4>How it works</h4>
                  <div className="tu-pass-detail-steps">
                    <div className="tu-pass-detail-step">
                      <span className="tu-pass-detail-step-num">1</span>
                      <span>
                        {detailPass.tools > 0
                          ? `Pick your ${detailPass.tools > 1 ? `${detailPass.tools} tools` : 'tool'}`
                          : 'All tools included'}
                      </span>
                    </div>
                    <div className="tu-pass-detail-step">
                      <span className="tu-pass-detail-step-num">2</span>
                      <span>Pay via secure Razorpay checkout</span>
                    </div>
                    <div className="tu-pass-detail-step">
                      <span className="tu-pass-detail-step-num">3</span>
                      <span>
                        Use up to {detailPass.uses_per_day}x/day for {detailPass.duration_days} day
                        {detailPass.duration_days > 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="tu-pass-detail-section">
                  <h4>Compared to free</h4>
                  <div className="tu-pass-detail-compare">
                    <div className="tu-pass-detail-compare-row">
                      <span>Free</span>
                      <span>3 uses/day per tool</span>
                    </div>
                    <div className="tu-pass-detail-compare-row tu-pass-detail-compare-row--highlight">
                      <span>{detailPass.name}</span>
                      <span>
                        {detailPass.uses_per_day} uses/day
                        {detailPass.tools === -1 ? ', all tools' : ''}
                      </span>
                    </div>
                    <div className="tu-pass-detail-compare-row">
                      <span>Pro</span>
                      <span>Unlimited, {PRO_PRICES[currency] || '$5'}/mo</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* -- Credit Detail Modal -- */}
      <AnimatePresence>
        {detailCredit && (
          <motion.div
            className="tu-pass-detail-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedCredit(null)}
          >
            <motion.div
              className="tu-pass-detail"
              role="dialog"
              aria-modal="true"
              aria-label={detailCredit.name}
              initial={{ opacity: 0, scale: 0.92, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 24 }}
              transition={{ type: 'spring', damping: 26, stiffness: 340 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                ref={detailCloseRef}
                className="tu-pass-detail-close"
                aria-label="Close"
                onClick={() => setSelectedCredit(null)}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>

              {/* Left Column */}
              <div className="tu-pass-detail-left">
                <div className="tu-pass-detail-hero">
                  <span className="tu-pass-detail-icon">
                    {CREDIT_ICONS[detailCredit.id as keyof typeof CREDIT_ICONS] || (
                      <DropletIcon size={52} />
                    )}
                  </span>
                  <h2 className="tu-pass-detail-name">{detailCredit.name}</h2>
                  <span className="tu-pass-detail-price">{formatPrice(detailCredit.price)}</span>
                  <p className="tu-pass-detail-subtitle">{detailCredit.credits} credits</p>
                </div>

                <div className="tu-pass-detail-stats">
                  <div className="tu-pass-detail-stat">
                    <span className="tu-pass-detail-stat-val">{detailCredit.credits}</span>
                    <span className="tu-pass-detail-stat-label">Credits</span>
                  </div>
                  <div className="tu-pass-detail-stat">
                    <span className="tu-pass-detail-stat-val">
                      {formatPrice(detailCredit.price / detailCredit.credits)}
                    </span>
                    <span className="tu-pass-detail-stat-label">Per use</span>
                  </div>
                  <div className="tu-pass-detail-stat">
                    <span className="tu-pass-detail-stat-val">All</span>
                    <span className="tu-pass-detail-stat-label">Tools</span>
                  </div>
                  <div className="tu-pass-detail-stat">
                    <span className="tu-pass-detail-stat-val">No</span>
                    <span className="tu-pass-detail-stat-label">Expiry</span>
                  </div>
                </div>

                <button
                  className="tu-pass-detail-cta"
                  disabled={buyingId === detailCredit.id}
                  onClick={() => handleBuyCredits(detailCredit.id)}
                >
                  {buyingId === detailCredit.id
                    ? 'Loading...'
                    : `Buy Now — ${formatPrice(detailCredit.price)}`}
                </button>
                <p className="tu-pass-detail-footer">Secure payment via Razorpay</p>
              </div>

              {/* Right Column */}
              <div className="tu-pass-detail-right">
                <div className="tu-pass-detail-section">
                  <h4>What&apos;s included</h4>
                  <ul className="tu-pass-detail-list">
                    <li>{detailCredit.credits} credits that work on any tool</li>
                    <li>1 credit = 1 extra use beyond the daily free limit</li>
                    <li>No expiry — use them whenever you need</li>
                    <li>Works on AI tools, text transforms, exports — everything</li>
                    <li>Credits are consumed in order (oldest first)</li>
                  </ul>
                </div>

                <div className="tu-pass-detail-section">
                  <h4>How it works</h4>
                  <div className="tu-pass-detail-steps">
                    <div className="tu-pass-detail-step">
                      <span className="tu-pass-detail-step-num">1</span>
                      <span>Purchase credits via Razorpay</span>
                    </div>
                    <div className="tu-pass-detail-step">
                      <span className="tu-pass-detail-step-num">2</span>
                      <span>Credits are added to your balance instantly</span>
                    </div>
                    <div className="tu-pass-detail-step">
                      <span className="tu-pass-detail-step-num">3</span>
                      <span>
                        When you hit the daily free limit on any tool, 1 credit is used
                        automatically
                      </span>
                    </div>
                  </div>
                </div>

                <div className="tu-pass-detail-section">
                  <h4>Compared to passes</h4>
                  <div className="tu-pass-detail-compare">
                    <div className="tu-pass-detail-compare-row">
                      <span>Passes</span>
                      <span>Fixed tools, fixed duration, more uses/day</span>
                    </div>
                    <div className="tu-pass-detail-compare-row tu-pass-detail-compare-row--highlight">
                      <span>Credits</span>
                      <span>Any tool, no expiry, pay per use</span>
                    </div>
                    <div className="tu-pass-detail-compare-row">
                      <span>Pro</span>
                      <span>Unlimited, all tools, {PRO_PRICES[currency] || '$5'}/mo</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* -- Tool Picker (scoped passes) -- */}
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
