import { TOOLS } from '@velobits/app-core/constants/tools';
import type { GamificationContextValue } from '@velobits/app-core/types/context';
import type { QuestOp } from '@velobits/app-core/types/tools';

interface HistorySectionProps {
  g: GamificationContextValue;
  recentOps: QuestOp[];
}

/**
 * Dashboard usage history section.
 * Shows session timeline, discovered tools progress grid, and usage stats.
 */
export default function HistorySection({ g, recentOps }: HistorySectionProps) {
  return (
    <div className="tu-dash-content">
      <h2 className="tu-dash-title">Usage History</h2>
      <p className="tu-dash-subtitle">This session&apos;s activity</p>

      {recentOps.length === 0 ? (
        <div className="tu-dash-empty-page">
          <span className="tu-dash-empty-icon">📈</span>
          <span>No activity this session</span>
          <span className="tu-dash-empty-hint">Start using tools to see your history here</span>
        </div>
      ) : (
        <div className="tu-dash-card">
          <h3 className="tu-dash-card-title">Session Timeline ({recentOps.length} operations)</h3>
          <div className="tu-dash-history-list">
            {[...recentOps].reverse().map((op, i) => {
              const tool = TOOLS.find((t) => t.id === op.id);
              return (
                <div key={i} className="tu-dash-history-item">
                  <span className="tu-dash-history-dot" />
                  <span className="tu-dash-history-icon">{tool?.icon || '🔧'}</span>
                  <span className="tu-dash-history-name">{tool?.label || op.id}</span>
                  <span className="tu-dash-history-meta">
                    {op.isNew && <span className="tu-dash-history-new">NEW</span>}
                    {op.tab && <span className="tu-dash-history-tab">{op.tab}</span>}
                  </span>
                  <span className="tu-dash-history-time">
                    {op.time != null ? new Date(op.time).toLocaleTimeString() : ''}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* All-time tool discovery */}
      <div className="tu-dash-card">
        <h3 className="tu-dash-card-title">
          Discovered Tools ({g?.discoveredTools?.length || 0}/{TOOLS.length})
        </h3>
        <div className="tu-dash-discovered-progress">
          <div
            className="tu-dash-discovered-progress-fill"
            style={{ width: `${((g?.discoveredTools?.length || 0) / TOOLS.length) * 100}%` }}
          />
        </div>
        <div className="tu-dash-discovered-grid">
          {TOOLS.map((tool) => {
            const discovered = g?.discoveredTools?.includes(tool.id);
            return (
              <div
                key={tool.id}
                className={`tu-dash-discovered${discovered ? '' : ' tu-dash-discovered--locked'}`}
                title={discovered ? `${tool.label} — ${g.toolsUsed?.[tool.id] || 0}x used` : '???'}
              >
                <span>{discovered ? tool.icon : '?'}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
