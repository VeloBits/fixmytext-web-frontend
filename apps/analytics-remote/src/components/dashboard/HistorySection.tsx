import { TOOLS } from '@velobits/app-core/constants/tools';
import type { QuestOp } from '@velobits/app-core/types/tools';
import { TrendingUpIcon, WrenchIcon } from '@velobits/design-system';

interface HistorySectionProps {
  recentOps?: QuestOp[];
}

/**
 * Dashboard usage history section.
 * Shows the session timeline and the tool discovery grid. Session ops and
 * discovery were tracked by the removed gamification state, so with no
 * producer left the timeline shows its empty state and the discovery grid
 * renders fully locked — identical to the previous kill-switch-off behavior.
 */
export default function HistorySection({ recentOps = [] }: HistorySectionProps) {
  return (
    <div className="tu-dash-content">
      <h2 className="tu-dash-title">Usage History</h2>
      <p className="tu-dash-subtitle">This session&apos;s activity</p>

      {recentOps.length === 0 ? (
        <div className="tu-dash-empty-page">
          <span className="tu-dash-empty-icon">
            <TrendingUpIcon size={32} />
          </span>
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
                  <span className="tu-dash-history-icon">
                    {tool?.icon || <WrenchIcon size={13} />}
                  </span>
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

      {/* All-time tool discovery (no tracking source anymore: always locked) */}
      <div className="tu-dash-card">
        <h3 className="tu-dash-card-title">Discovered Tools (0/{TOOLS.length})</h3>
        <div className="tu-dash-discovered-progress">
          <div className="tu-dash-discovered-progress-fill" style={{ width: '0%' }} />
        </div>
        <div className="tu-dash-discovered-grid">
          {TOOLS.map((tool) => (
            <div
              key={tool.id}
              className="tu-dash-discovered tu-dash-discovered--locked"
              title="???"
            >
              <span>?</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
