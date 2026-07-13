import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import OverviewSection from './OverviewSection';
import type { TopTool, RecentHistoryEntry } from './OverviewSection';
import type { FavoritesContextValue } from '@velobits/app-core/types/context';

const baseFavorites = { favorites: [], toggleFavorite: vi.fn() } as FavoritesContextValue;

function renderOverview(props: Record<string, unknown> = {}) {
  return render(<OverviewSection favorites={baseFavorites} topTools={[]} {...props} />);
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

  // ── Usage stats grid ──
  it('renders usage stats from server aggregates and favorites count', () => {
    renderOverview({
      statsTotalOps: 9,
      statsToolCount: 3,
      favorites: { favorites: ['trim_extra'], toggleFavorite: vi.fn() },
    });
    expect(screen.getByText('Your FixMyText usage at a glance')).toBeInTheDocument();
    const opsCard = screen.getByText('Operations').closest('.tu-dash-stat-card') as HTMLElement;
    expect(within(opsCard).getByText('9')).toBeInTheDocument();
    const toolsCard = screen.getByText('Tools Used').closest('.tu-dash-stat-card') as HTMLElement;
    expect(toolsCard.querySelector('.tu-dash-stat-value')?.textContent).toMatch(/^3\//);
    const favCard = screen.getByText('Favorites').closest('.tu-dash-stat-card') as HTMLElement;
    expect(within(favCard).getByText('1')).toBeInTheDocument();
  });

  it('defaults usage stats to zero when server aggregates are absent', () => {
    renderOverview();
    const opsCard = screen.getByText('Operations').closest('.tu-dash-stat-card') as HTMLElement;
    expect(within(opsCard).getByText('0')).toBeInTheDocument();
    const toolsCard = screen.getByText('Tools Used').closest('.tu-dash-stat-card') as HTMLElement;
    expect(toolsCard.querySelector('.tu-dash-stat-value')?.textContent).toMatch(/^0\//);
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

  // ── Recent activity ──
  it('renders recent server history entries', () => {
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
    renderOverview({ recentHistory });
    expect(screen.getByText('Recent Activity')).toBeInTheDocument();
    expect(screen.getByText('camelCase')).toBeInTheDocument();
    // Unknown tool ids fall back to the server-provided label
    expect(screen.getByText('Mystery Tool')).toBeInTheDocument();
    expect(screen.queryByText('No recent activity yet')).not.toBeInTheDocument();
  });

  it('shows empty states when there is no usage yet', () => {
    renderOverview();
    expect(screen.getByText(/No tools used yet/i)).toBeInTheDocument();
    expect(screen.getByText('No recent activity yet')).toBeInTheDocument();
  });
});
