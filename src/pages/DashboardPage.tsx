import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { TOOLS, ACHIEVEMENTS, LEVELS, USE_CASE_TABS } from '../constants/tools';
import { useGetToolStatsQuery } from '../store/api/userDataApi';
import type { AlertLevel } from '../contexts/AlertContext';
import type {
  GamificationContextValue,
  SubscriptionContextValue,
  User,
} from '../contexts/AppContext';

// Extracted dashboard section components
import OverviewSection from '../components/dashboard/OverviewSection';
import SubscriptionSection from '../components/dashboard/SubscriptionSection';
import RewardsSection from '../components/dashboard/RewardsSection';
import ProfileSection from '../components/dashboard/ProfileSection';
import AchievementsSection from '../components/dashboard/AchievementsSection';
import FavoritesSection from '../components/dashboard/FavoritesSection';
import HistorySection from '../components/dashboard/HistorySection';

interface DashboardPageProps {
  gamification: GamificationContextValue;
  user: User | null;
  isAuthenticated: boolean;
  showAlert: (message: string, type: AlertLevel) => void;
  mode: string;
  setMode: (mode: string) => void;
  subscription: SubscriptionContextValue;
}

/** Section component lookup map. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SECTIONS_MAP: Record<string, React.ComponentType<any>> = {
  overview: OverviewSection,
  subscription: SubscriptionSection,
  rewards: RewardsSection,
  profile: ProfileSection,
  achievements: AchievementsSection,
  favorites: FavoritesSection,
  history: HistorySection,
};

/**
 * Dashboard page component.
 * Serves as the orchestrator for all dashboard sections (overview, subscription,
 * rewards, profile, achievements, favorites, history). Manages sidebar navigation
 * and section-level state while delegating rendering to extracted section components.
 */
export default function DashboardPage({
  gamification,
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

  const g = gamification;
  const level = g?.level || LEVELS[0];
  const nextLevel = g?.nextLevel || LEVELS[1];
  const xpProgress = g?.xpProgress || 0;

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
  }, []); // intentional: runs once on mount; showAlert/subscription are stable refs

  const {
    data: toolStatsData,
    error: toolStatsError,
    refetch: refetchToolStats,
  } = useGetToolStatsQuery(undefined, { skip: !isAuthenticated });

  // Top used tools
  const topTools = useMemo(() => {
    if (toolStatsData?.stats?.length) {
      return toolStatsData.stats
        .slice(0, 10)
        .map((s) => {
          const tool = TOOLS.find((t) => t.id === s.tool_id);
          return tool ? { ...tool, count: s.total_uses } : null;
        })
        .filter(Boolean);
    }
    if (!g?.toolsUsed) return [];
    return Object.entries(g.toolsUsed)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([id, count]) => {
        const tool = TOOLS.find((t) => t.id === id);
        return tool ? { ...tool, count } : null;
      })
      .filter(Boolean);
  }, [toolStatsData, g?.toolsUsed]);

  // Category usage
  const categoryUsage = useMemo(() => {
    if (!g?.toolsUsed) return [];
    const cats: Record<string, number> = {};
    Object.entries(g.toolsUsed).forEach(([id, count]) => {
      const tool = TOOLS.find((t) => t.id === id);
      if (tool?.tabs) {
        tool.tabs.forEach((tab) => {
          if (tab !== 'all') cats[tab] = (cats[tab] || 0) + count;
        });
      }
    });
    return USE_CASE_TABS.filter((t) => t.id !== 'all' && cats[t.id])
      .map((t) => ({ ...t, count: cats[t.id] || 0 }))
      .sort((a, b) => b.count - a.count);
  }, [g?.toolsUsed]);

  const recentOps = g?.sessionOps || [];

  const sections = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'subscription', label: 'Subscription', icon: '⚡' },
    { id: 'rewards', label: 'Rewards', icon: '🎰' },
    { id: 'profile', label: 'Profile', icon: '👤' },
    { id: 'achievements', label: 'Achievements', icon: '🏆' },
    { id: 'favorites', label: 'Favorites', icon: '❤️' },
    { id: 'history', label: 'Usage History', icon: '📈' },
  ];

  // Build props for the active section component
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sectionProps: Record<string, any> = {
    g,
    level,
    nextLevel,
    xpProgress,
    topTools,
    categoryUsage,
    recentOps,
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

  const ActiveSection = SECTIONS_MAP[activeSection] || OverviewSection;

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
            <span className="tu-dash-profile-level">
              {level.title} — Lvl {level.level}
            </span>
          </div>
        </div>

        {/* Mini XP bar in sidebar */}
        <div className="tu-dash-sidebar-xp">
          <div className="tu-dash-sidebar-xp-track">
            <div className="tu-dash-sidebar-xp-fill" style={{ width: `${xpProgress}%` }} />
          </div>
          <span className="tu-dash-sidebar-xp-text">{g?.xp || 0} XP</span>
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
              <span className="tu-dash-nav-icon">{s.icon}</span>
              <span>{s.label}</span>
              {s.id === 'achievements' && (
                <span className="tu-dash-nav-badge">
                  {g?.achievements?.length || 0}/{ACHIEVEMENTS.length}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Quick stats in sidebar */}
        <div className="tu-dash-sidebar-stats">
          <div className="tu-dash-sidebar-stat">
            <span>🔥</span>
            <span>{g?.streak?.current || 0} day streak</span>
          </div>
          <div className="tu-dash-sidebar-stat">
            <span>🔧</span>
            <span>{g?.totalOps || 0} operations</span>
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
