import { TOOLS } from '@velobits/app-core/constants/tools';
import type { FavoritesContextValue } from '@velobits/app-core/types/context';
import { HeartIcon, LayoutGridIcon, WrenchIcon } from '@velobits/design-system';

export interface TopTool {
  id: string;
  icon: string;
  label: string;
  count: number;
}

/** Server-side history entry (subset of HistoryResponse used by the overview). */
export interface RecentHistoryEntry {
  id: string;
  tool_id: string;
  tool_label: string;
  created_at: string;
}

interface OverviewSectionProps {
  favorites: FavoritesContextValue;
  topTools: TopTool[];
  toolStatsError?: unknown;
  refetchToolStats?: () => void;
  /** Total operations from the server tool-stats endpoint. */
  statsTotalOps?: number;
  /** Distinct tools used, from the server tool-stats endpoint. */
  statsToolCount?: number;
  /** Latest server history entries. */
  recentHistory?: RecentHistoryEntry[];
}

/** Error banner for the tool-stats query. */
function ToolStatsError({
  toolStatsError,
  refetchToolStats,
}: Pick<OverviewSectionProps, 'toolStatsError' | 'refetchToolStats'>) {
  if (!toolStatsError) return null;
  return (
    <div className="error-state" style={{ padding: '12px 16px', marginBottom: 16 }}>
      <p>Failed to load tool statistics</p>
      <button onClick={refetchToolStats}>Retry</button>
    </div>
  );
}

/** "Most Used Tools" card. */
function MostUsedToolsCard({ topTools }: { topTools: TopTool[] }) {
  return (
    <div className="tu-dash-card">
      <h3 className="tu-dash-card-title">Most Used Tools</h3>
      {topTools.length === 0 ? (
        <div className="tu-dash-empty">No tools used yet - start exploring!</div>
      ) : (
        <div className="tu-dash-tool-list">
          {topTools.map((tool, i) => (
            <div key={tool.id} className="tu-dash-tool-row">
              <span className="tu-dash-tool-rank">#{i + 1}</span>
              <span className="tu-dash-tool-icon">{tool.icon}</span>
              <span className="tu-dash-tool-name">{tool.label}</span>
              <div className="tu-dash-tool-bar-wrap">
                <div
                  className="tu-dash-tool-bar"
                  style={{ width: `${(tool.count / topTools[0]!.count) * 100}%` }}
                />
              </div>
              <span className="tu-dash-tool-count">{tool.count}x</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Dashboard usage overview section: real usage stats only
 * (server tool stats + recent history + favorites count).
 */
export default function OverviewSection({
  favorites,
  topTools,
  toolStatsError,
  refetchToolStats,
  statsTotalOps = 0,
  statsToolCount = 0,
  recentHistory,
}: OverviewSectionProps) {
  const favoritesCount = favorites?.favorites?.length || 0;

  return (
    <div className="tu-dash-content">
      <h2 className="tu-dash-title">Overview</h2>
      <p className="tu-dash-subtitle">Your FixMyText usage at a glance</p>

      <ToolStatsError toolStatsError={toolStatsError} refetchToolStats={refetchToolStats} />

      {/* Usage stats grid */}
      <div className="tu-dash-stats-grid">
        <div className="tu-dash-stat-card">
          <span className="tu-dash-stat-icon">
            <WrenchIcon size={20} />
          </span>
          <span className="tu-dash-stat-value">{statsTotalOps}</span>
          <span className="tu-dash-stat-label">Operations</span>
        </div>
        <div className="tu-dash-stat-card">
          <span className="tu-dash-stat-icon">
            <LayoutGridIcon size={20} />
          </span>
          <span className="tu-dash-stat-value">
            {statsToolCount}
            <small>/{TOOLS.length}</small>
          </span>
          <span className="tu-dash-stat-label">Tools Used</span>
        </div>
        <div className="tu-dash-stat-card">
          <span className="tu-dash-stat-icon">
            <HeartIcon size={20} />
          </span>
          <span className="tu-dash-stat-value">{favoritesCount}</span>
          <span className="tu-dash-stat-label">Favorites</span>
        </div>
      </div>

      {/* Top tools + Recent activity */}
      <div className="tu-dash-row">
        <MostUsedToolsCard topTools={topTools} />
        <div className="tu-dash-card">
          <h3 className="tu-dash-card-title">Recent Activity</h3>
          {!recentHistory || recentHistory.length === 0 ? (
            <div className="tu-dash-empty">No recent activity yet</div>
          ) : (
            <div className="tu-dash-history-list">
              {recentHistory.map((entry) => {
                const tool = TOOLS.find((t) => t.id === entry.tool_id);
                return (
                  <div key={entry.id} className="tu-dash-history-item">
                    <span className="tu-dash-history-dot" />
                    <span className="tu-dash-history-icon">
                      {tool?.icon || <WrenchIcon size={13} />}
                    </span>
                    <span className="tu-dash-history-name">{tool?.label || entry.tool_label}</span>
                    <span className="tu-dash-history-time">
                      {new Date(entry.created_at).toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
