import { TOOLS, ACHIEVEMENTS, LEVELS, QUEST_TEMPLATES } from '../../constants/tools';
import type { GamificationContextValue } from '../../contexts/AppContext';
import type { LevelDefinition } from '../../types/tools';

export interface TopTool {
  id: string;
  icon: string;
  label: string;
  count: number;
}

export interface CategoryUsage {
  id: string;
  icon: string;
  label: string;
  count: number;
}

interface OverviewSectionProps {
  g: GamificationContextValue;
  level: LevelDefinition;
  nextLevel: LevelDefinition;
  xpProgress: number;
  topTools: TopTool[];
  categoryUsage: CategoryUsage[];
  setActiveSection: (section: string) => void;
  toolStatsError?: unknown;
  refetchToolStats?: () => void;
}

/**
 * Dashboard overview section.
 * Shows user XP/level, stats grid, daily quest, top tools, category breakdown,
 * and recent achievements at a glance.
 */
export default function OverviewSection({
  g,
  level,
  nextLevel,
  xpProgress,
  topTools,
  categoryUsage,
  setActiveSection,
  toolStatsError,
  refetchToolStats,
}: OverviewSectionProps) {
  return (
    <div className="tu-dash-content">
      <h2 className="tu-dash-title">Overview</h2>
      <p className="tu-dash-subtitle">Your FixMyText journey at a glance</p>

      {/* Error state for tool stats */}
      {Boolean(toolStatsError) && (
        <div className="error-state" style={{ padding: '12px 16px', marginBottom: 16 }}>
          <p>Failed to load tool statistics</p>
          <button onClick={refetchToolStats}>Retry</button>
        </div>
      )}

      {/* XP + Level card */}
      <div className="tu-dash-card tu-dash-card--hero">
        <div className="tu-dash-level-header">
          <div className="tu-dash-level-badge">{level.level}</div>
          <div className="tu-dash-level-info">
            <span className="tu-dash-level-title">{level.title}</span>
            <span className="tu-dash-level-xp">
              {g?.xp || 0} XP — {nextLevel.xp - (g?.xp || 0)} XP to {nextLevel.title}
            </span>
          </div>
          <div className="tu-dash-level-next">
            <span className="tu-dash-level-next-label">Next</span>
            <span className="tu-dash-level-next-title">{nextLevel.title}</span>
          </div>
        </div>
        <div className="tu-dash-xp-track">
          <div className="tu-dash-xp-fill" style={{ width: `${xpProgress}%` }} />
        </div>
        <div className="tu-dash-xp-labels">
          <span>Lvl {level.level}</span>
          <span>{Math.round(xpProgress)}%</span>
          <span>Lvl {nextLevel.level}</span>
        </div>

        {/* Level milestones */}
        <div className="tu-dash-milestones">
          {LEVELS.map((l) => (
            <div
              key={l.level}
              className={`tu-dash-milestone${
                (g?.xp || 0) >= l.xp ? ' tu-dash-milestone--done' : ''
              }`}
              title={`${l.title} — ${l.xp} XP`}
            >
              <span>{l.level}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Stats grid */}
      <div className="tu-dash-stats-grid">
        <div className="tu-dash-stat-card">
          <span className="tu-dash-stat-icon">🔧</span>
          <span className="tu-dash-stat-value">{g?.totalOps || 0}</span>
          <span className="tu-dash-stat-label">Operations</span>
        </div>
        <div className="tu-dash-stat-card">
          <span className="tu-dash-stat-icon">✏️</span>
          <span className="tu-dash-stat-value">{((g?.totalChars || 0) / 1000).toFixed(1)}k</span>
          <span className="tu-dash-stat-label">Characters</span>
        </div>
        <div className="tu-dash-stat-card">
          <span className="tu-dash-stat-icon">🔥</span>
          <span className="tu-dash-stat-value">{g?.streak?.current || 0}</span>
          <span className="tu-dash-stat-label">Day Streak</span>
        </div>
        <div className="tu-dash-stat-card">
          <span className="tu-dash-stat-icon">🧭</span>
          <span className="tu-dash-stat-value">
            {g?.discoveredTools?.length || 0}
            <small>/{TOOLS.length}</small>
          </span>
          <span className="tu-dash-stat-label">Discovered</span>
        </div>
        <div className="tu-dash-stat-card">
          <span className="tu-dash-stat-icon">🏅</span>
          <span className="tu-dash-stat-value">
            {g?.achievements?.length || 0}
            <small>/{ACHIEVEMENTS.length}</small>
          </span>
          <span className="tu-dash-stat-label">Achievements</span>
        </div>
        <div className="tu-dash-stat-card">
          <span className="tu-dash-stat-icon">❤️</span>
          <span className="tu-dash-stat-value">{g?.favorites?.length || 0}</span>
          <span className="tu-dash-stat-label">Favorites</span>
        </div>
      </div>

      {/* Daily Quest */}
      {g?.dailyQuest?.id && (
        <div className="tu-dash-card">
          <h3 className="tu-dash-card-title">Daily Quest</h3>
          <div className={`tu-dash-quest${g.dailyQuest.completed ? ' tu-dash-quest--done' : ''}`}>
            <span className="tu-dash-quest-icon">{g.dailyQuest.completed ? '✅' : '📋'}</span>
            <span className="tu-dash-quest-text">
              {QUEST_TEMPLATES.find((q) => q.id === g.dailyQuest.id)?.text || 'Daily Quest'}
            </span>
            <span className="tu-dash-quest-xp">
              +{QUEST_TEMPLATES.find((q) => q.id === g.dailyQuest.id)?.xp || 50} XP
            </span>
            {g.dailyQuest.completed && <span className="tu-dash-quest-badge">Completed</span>}
          </div>
        </div>
      )}

      {/* Top tools + Category usage */}
      <div className="tu-dash-row">
        <div className="tu-dash-card">
          <h3 className="tu-dash-card-title">Most Used Tools</h3>
          {topTools.length === 0 ? (
            <div className="tu-dash-empty">No tools used yet — start exploring!</div>
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
                      style={{ width: `${(tool.count / topTools[0].count) * 100}%` }}
                    />
                  </div>
                  <span className="tu-dash-tool-count">{tool.count}x</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="tu-dash-card">
          <h3 className="tu-dash-card-title">Category Breakdown</h3>
          {categoryUsage.length === 0 ? (
            <div className="tu-dash-empty">No usage data yet</div>
          ) : (
            <div className="tu-dash-tool-list">
              {categoryUsage.map((cat) => (
                <div key={cat.id} className="tu-dash-tool-row">
                  <span className="tu-dash-tool-icon">{cat.icon}</span>
                  <span className="tu-dash-tool-name">{cat.label}</span>
                  <div className="tu-dash-tool-bar-wrap">
                    <div
                      className="tu-dash-tool-bar tu-dash-tool-bar--cat"
                      style={{ width: `${(cat.count / categoryUsage[0].count) * 100}%` }}
                    />
                  </div>
                  <span className="tu-dash-tool-count">{cat.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent achievements preview */}
      {g?.achievements?.length > 0 && (
        <div className="tu-dash-card">
          <div className="tu-dash-card-header">
            <h3 className="tu-dash-card-title">Recent Achievements</h3>
            <button className="tu-dash-card-link" onClick={() => setActiveSection('achievements')}>
              View all
            </button>
          </div>
          <div className="tu-dash-achievements-preview">
            {g.achievements
              .slice(-4)
              .reverse()
              .map((id) => {
                const ach = ACHIEVEMENTS.find((a) => a.id === id);
                return ach ? (
                  <div key={id} className="tu-dash-achievement-mini">
                    <span>{ach.icon}</span>
                    <span>{ach.label}</span>
                  </div>
                ) : null;
              })}
          </div>
        </div>
      )}
    </div>
  );
}
