import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import OverviewSection from './OverviewSection';
import type { TopTool, CategoryUsage } from './OverviewSection';
import type { GamificationContextValue } from '@velobits/app-core/types/context';
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
  favorites: [],
  dailyQuest: null,
} as unknown as GamificationContextValue;

function renderOverview(props: Record<string, unknown> = {}) {
  return render(
    <OverviewSection
      g={baseG}
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
});
