import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import OverviewSection from './OverviewSection';
import type { TopTool, CategoryUsage, RecentHistoryEntry } from './OverviewSection';
import type {
  FavoritesContextValue,
  GamificationContextValue,
} from '@velobits/app-core/types/context';
import type { LevelDefinition } from '@velobits/app-core/types/tools';

const level = { level: 2, xp: 100, title: 'Novice' } as LevelDefinition;
const nextLevel = { level: 3, xp: 250, title: 'Apprentice' } as LevelDefinition;

const baseG = {
  xp: 150,
  totalOps: 12,
  totalChars: 3400,
  streak: { current: 2, best: 4 },
  discoveredTools: ['trim_extra'],
  achievements: [],
  dailyQuest: null,
} as unknown as GamificationContextValue;

const baseFavorites = { favorites: [], toggleFavorite: vi.fn() } as FavoritesContextValue;

function renderOverview(props: Record<string, unknown> = {}) {
  return render(
    <OverviewSection
      g={baseG}
      favorites={baseFavorites}
      level={level}
      nextLevel={nextLevel}
      xpProgress={30}
      topTools={[]}
      categoryUsage={[]}
      setActiveSection={vi.fn()}
      {...props}
    />
  );
}

describe('OverviewSection', () => {
  // ── Error state ──
  it('shows error state with Retry when toolStatsError is set', () => {
    const refetchToolStats = vi.fn();
    renderOverview({ toolStatsError: { status: 500 }, refetchToolStats });
    expect(screen.getByText('Failed to load tool statistics')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Retry'));
    expect(refetchToolStats).toHaveBeenCalled();
  });

  it('does not show error state without toolStatsError', () => {
    renderOverview();
    expect(screen.queryByText('Failed to load tool statistics')).not.toBeInTheDocument();
  });

  // ── XP / level card ──
  it('renders XP summary with remaining XP to next level', () => {
    renderOverview();
    expect(screen.getByText(/150 XP — 100 XP to Apprentice/)).toBeInTheDocument();
    expect(screen.getByText('30%')).toBeInTheDocument();
  });

  it('falls back to zero values when gamification data is empty', () => {
    renderOverview({ g: {} as GamificationContextValue, xpProgress: 0 });
    expect(screen.getByText(/0 XP — 250 XP to Apprentice/)).toBeInTheDocument();
    expect(screen.getByText('Operations')).toBeInTheDocument();
    expect(screen.getByText('0.0k')).toBeInTheDocument();
    // Achievements preview should not render for empty achievements
    expect(screen.queryByText('View all')).not.toBeInTheDocument();
  });

  // ── Daily quest ──
  it('renders an incomplete daily quest using the matching template text', () => {
    renderOverview({
      g: { ...baseG, dailyQuest: { id: 'combo_ai_transform', completed: false } },
    });
    expect(screen.getByText('Daily Quest')).toBeInTheDocument();
    expect(screen.getByText('Use an AI tool + a Transform tool')).toBeInTheDocument();
    expect(screen.getByText('+50 XP')).toBeInTheDocument();
    expect(screen.queryByText('Completed')).not.toBeInTheDocument();
    expect(screen.getByText('📋')).toBeInTheDocument();
  });

  it('renders a completed daily quest with fallback text for unknown template id', () => {
    renderOverview({
      g: { ...baseG, dailyQuest: { id: 'not_a_real_quest', completed: true } },
    });
    // Falls back to the generic quest label (card title + quest text)
    expect(screen.getAllByText('Daily Quest').length).toBeGreaterThan(1);
    expect(screen.getByText('+50 XP')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('✅')).toBeInTheDocument();
  });

  it('does not render daily quest card when dailyQuest has no id', () => {
    renderOverview();
    expect(screen.queryByText('Daily Quest')).not.toBeInTheDocument();
  });

  // ── Top tools ──
  it('renders top tools rows with rank, label and count', () => {
    const topTools: TopTool[] = [
      { id: 'trim_extra', icon: '_x', label: 'Trim Extra Spaces', count: 10 },
      { id: 'camel_case', icon: 'cc', label: 'camelCase', count: 5 },
    ];
    renderOverview({ topTools });
    expect(screen.getByText('#1')).toBeInTheDocument();
    expect(screen.getByText('#2')).toBeInTheDocument();
    expect(screen.getByText('Trim Extra Spaces')).toBeInTheDocument();
    expect(screen.getByText('camelCase')).toBeInTheDocument();
    expect(screen.getByText('10x')).toBeInTheDocument();
    expect(screen.getByText('5x')).toBeInTheDocument();
    expect(screen.queryByText(/No tools used yet/i)).not.toBeInTheDocument();
  });

  // ── Category usage ──
  it('renders category usage rows with label and count', () => {
    const categoryUsage: CategoryUsage[] = [
      { id: 'transform', icon: 'Tf', label: 'Transform', count: 8 },
      { id: 'code', icon: '</>', label: 'Code & Data', count: 4 },
    ];
    renderOverview({ categoryUsage });
    const card = screen.getByText('Category Breakdown').closest('.tu-dash-card') as HTMLElement;
    expect(within(card).getByText('Transform')).toBeInTheDocument();
    expect(within(card).getByText('Code & Data')).toBeInTheDocument();
    expect(within(card).getByText('8')).toBeInTheDocument();
    expect(within(card).getByText('4')).toBeInTheDocument();
    expect(screen.queryByText(/No usage data yet/i)).not.toBeInTheDocument();
  });

  // ── Achievements preview ──
  it('renders recent achievements preview, skipping unknown achievement ids', () => {
    const setActiveSection = vi.fn();
    renderOverview({
      g: { ...baseG, achievements: ['first_step', 'not_a_real_achievement'] },
      setActiveSection,
    });
    expect(screen.getByText('Recent Achievements')).toBeInTheDocument();
    expect(screen.getByText('First Step')).toBeInTheDocument();
    fireEvent.click(screen.getByText('View all'));
    expect(setActiveSection).toHaveBeenCalledWith('achievements');
  });

  // ── Favorites stat sourced from the favorites prop (both modes) ──
  it('shows the favorites count from the favorites prop in the full overview', () => {
    renderOverview({
      favorites: { favorites: ['trim_extra', 'camel_case'], toggleFavorite: vi.fn() },
    });
    const favCard = screen.getByText('Favorites').closest('.tu-dash-stat-card') as HTMLElement;
    expect(within(favCard).getByText('2')).toBeInTheDocument();
  });
});

describe('OverviewSection — slimmed mode (gamification null)', () => {
  it('renders usage-only stats without any gamification widgets', () => {
    renderOverview({
      g: null,
      statsTotalOps: 9,
      statsToolCount: 3,
      favorites: { favorites: ['trim_extra'], toggleFavorite: vi.fn() },
    });
    expect(screen.getByText('Your FixMyText usage at a glance')).toBeInTheDocument();
    const opsCard = screen.getByText('Operations').closest('.tu-dash-stat-card') as HTMLElement;
    expect(within(opsCard).getByText('9')).toBeInTheDocument();
    const favCard = screen.getByText('Favorites').closest('.tu-dash-stat-card') as HTMLElement;
    expect(within(favCard).getByText('1')).toBeInTheDocument();
    expect(screen.getByText('Tools Used')).toBeInTheDocument();
    // No XP hero, milestones, quest, streak, achievements or category widgets
    expect(screen.queryByText(/XP to/)).not.toBeInTheDocument();
    expect(screen.queryByText('Day Streak')).not.toBeInTheDocument();
    expect(screen.queryByText('Daily Quest')).not.toBeInTheDocument();
    expect(screen.queryByText('Recent Achievements')).not.toBeInTheDocument();
    expect(screen.queryByText('Category Breakdown')).not.toBeInTheDocument();
  });

  it('renders top tools and recent server history entries', () => {
    const topTools: TopTool[] = [
      { id: 'trim_extra', icon: '_x', label: 'Trim Extra Spaces', count: 6 },
    ];
    const recentHistory: RecentHistoryEntry[] = [
      {
        id: 'h1',
        tool_id: 'camel_case',
        tool_label: 'camelCase',
        created_at: '2026-07-12T10:00:00Z',
      },
      {
        id: 'h2',
        tool_id: 'unknown_tool',
        tool_label: 'Mystery Tool',
        created_at: '2026-07-12T09:00:00Z',
      },
    ];
    renderOverview({ g: null, topTools, recentHistory });
    expect(screen.getByText('Most Used Tools')).toBeInTheDocument();
    expect(screen.getByText('Trim Extra Spaces')).toBeInTheDocument();
    expect(screen.getByText('6x')).toBeInTheDocument();
    expect(screen.getByText('Recent Activity')).toBeInTheDocument();
    expect(screen.getByText('camelCase')).toBeInTheDocument();
    // Unknown tool ids fall back to the server-provided label
    expect(screen.getByText('Mystery Tool')).toBeInTheDocument();
  });

  it('shows empty states in slim mode when there is no usage yet', () => {
    renderOverview({ g: null });
    expect(screen.getByText(/No tools used yet/i)).toBeInTheDocument();
    expect(screen.getByText('No recent activity yet')).toBeInTheDocument();
  });

  it('still surfaces the tool stats error state in slim mode', () => {
    const refetchToolStats = vi.fn();
    renderOverview({ g: null, toolStatsError: { status: 500 }, refetchToolStats });
    expect(screen.getByText('Failed to load tool statistics')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Retry'));
    expect(refetchToolStats).toHaveBeenCalled();
  });
});
