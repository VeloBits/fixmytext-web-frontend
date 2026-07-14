import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { TOOLS } from '@velobits/app-core/constants/tools';
import { useGetToolStatsQuery } from '@velobits/app-core/store/api/userDataApi';
import { useGetHistoryQuery } from '@velobits/app-core/store/api/historyApi';
import type { AnalyticsPageProps } from '@velobits/app-core/contract';
import {
  BarChart3Icon,
  GiftIcon,
  HeartIcon,
  TrendingUpIcon,
  UserIcon,
  WrenchIcon,
  ZapIcon,
} from '@velobits/design-system';

// Extracted dashboard section components
import OverviewSection from '@/components/dashboard/OverviewSection';
import SubscriptionSection from '@/components/dashboard/SubscriptionSection';
import RewardsSection from '@/components/dashboard/RewardsSection';
import ProfileSection from '@/components/dashboard/ProfileSection';
import FavoritesSection from '@/components/dashboard/FavoritesSection';
import HistorySection from '@/components/dashboard/HistorySection';

// Props come straight from the host<->remote contract: `persona` and
// `favorites` are required.
type DashboardPageProps = AnalyticsPageProps;

/** Section component lookup map. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SECTIONS_MAP: Record<string, React.ComponentType<any>> = {
  overview: OverviewSection,
  subscription: SubscriptionSection,
  rewards: RewardsSection,
  profile: ProfileSection,
  favorites: FavoritesSection,
  history: HistorySection,
};

/**
 * Dashboard page component.
 * Serves as the orchestrator for all dashboard sections (overview, subscription,
 * rewards, profile, favorites, history). Manages sidebar navigation
 * and section-level state while delegating rendering to extracted section components.
 */
export default function DashboardPage({
  persona,
  favorites,
  user,
  isAuthenticated,
  showAlert,
  mode,
  setMode,
  subscription,
}: DashboardPageProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeSection, setActiveSection] = useState(() => {
    return searchParams.get('tab') || 'overview';
  });

  // Handle payment redirect -- auto-open subscription tab and show result
  useEffect(() => {
    const upgrade = searchParams.get('upgrade');
    const purchase = searchParams.get('purchase');
    if (upgrade === 'success') {
      setActiveSection('subscription');
      showAlert('Welcome to Pro! Your subscription is active.', 'success');
      subscription?.refetchStatus?.();
    } else if (upgrade === 'verify-failed') {
      setActiveSection('subscription');
      showAlert(
        'Payment received but verification failed. Please contact support if your plan is not active.',
        'danger'
      );
    } else if (upgrade === 'cancelled') {
      setActiveSection('subscription');
    } else if (purchase === 'success') {
      setActiveSection('subscription');
      showAlert('Purchase successful! Your pass or credits are now active.', 'success');
      subscription?.refetchStatus?.();
    } else if (purchase === 'verify-failed') {
      setActiveSection('subscription');
      showAlert(
        'Payment received but verification failed. Please contact support if your purchase is not reflected.',
        'danger'
      );
    }
    if (upgrade || purchase) {
      setSearchParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: runs once on mount; showAlert/subscription are stable refs
  }, []);

  const {
    data: toolStatsData,
    error: toolStatsError,
    refetch: refetchToolStats,
  } = useGetToolStatsQuery(undefined, { skip: !isAuthenticated });

  // Recent server-side history: feeds the overview's Recent Activity card.
  const { data: historyData } = useGetHistoryQuery(
    { page: 1, pageSize: 5 },
    { skip: !isAuthenticated }
  );

  // Server-derived usage aggregates (history stats endpoint).
  const statsTotalOps = useMemo(
    () => toolStatsData?.stats?.reduce((sum, s) => sum + s.total_uses, 0) ?? 0,
    [toolStatsData]
  );
  const statsToolCount = toolStatsData?.stats?.length ?? 0;

  // Top used tools (server tool stats)
  const topTools = useMemo(() => {
    if (!toolStatsData?.stats?.length) return [];
    return toolStatsData.stats
      .slice(0, 10)
      .map((s) => {
        const tool = TOOLS.find((t) => t.id === s.tool_id);
        return tool ? { ...tool, count: s.total_uses } : null;
      })
      .filter(Boolean);
  }, [toolStatsData]);

  const sections = [
    { id: 'overview', label: 'Overview', icon: BarChart3Icon },
    { id: 'subscription', label: 'Subscription', icon: ZapIcon },
    { id: 'rewards', label: 'Rewards', icon: GiftIcon },
    { id: 'profile', label: 'Profile', icon: UserIcon },
    { id: 'favorites', label: 'Favorites', icon: HeartIcon },
    { id: 'history', label: 'Usage History', icon: TrendingUpIcon },
  ];

  // Build props for the active section component
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sectionProps: Record<string, any> = {
    persona,
    favorites,
    topTools,
    statsTotalOps,
    statsToolCount,
    recentHistory: historyData?.items,
    user,
    isAuthenticated,
    showAlert,
    mode,
    setMode,
    subscription,
    navigate,
    setActiveSection,
  };

  // Handle tool stats loading error
  if (toolStatsError && activeSection === 'overview') {
    sectionProps.toolStatsError = toolStatsError;
    sectionProps.refetchToolStats = refetchToolStats;
  }

  const ActiveSection = (SECTIONS_MAP[activeSection] ??
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    OverviewSection) as React.ComponentType<any>;

  return (
    <div className="tu-dash">
      {/* Sidebar nav */}
      <div className="tu-dash-sidebar">
        <div className="tu-dash-sidebar-profile">
          <div className="tu-dash-avatar">
            {user?.display_name?.charAt(0)?.toUpperCase() || 'G'}
          </div>
          <div className="tu-dash-profile-info">
            <span className="tu-dash-profile-name">{user?.display_name || 'Guest'}</span>
          </div>
        </div>

        <nav className="tu-dash-nav">
          {sections.map((s) => (
            <button
              key={s.id}
              className={`tu-dash-nav-item${
                activeSection === s.id ? ' tu-dash-nav-item--active' : ''
              }`}
              onClick={() => setActiveSection(s.id)}
            >
              <span className="tu-dash-nav-icon">
                <s.icon size={15} />
              </span>
              <span>{s.label}</span>
            </button>
          ))}
        </nav>

        {/* Quick stats in sidebar: ops count from the server-side tool stats. */}
        <div className="tu-dash-sidebar-stats">
          <div className="tu-dash-sidebar-stat">
            <WrenchIcon size={14} />
            <span>{statsTotalOps} operations</span>
          </div>
        </div>

        <div className="tu-dash-sidebar-footer">
          <button className="tu-dash-back-btn" onClick={() => navigate('/')}>
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
        </div>
      </div>

      {/* Main content */}
      <div className="tu-dash-main">
        <ActiveSection {...sectionProps} />
      </div>
    </div>
  );
}
