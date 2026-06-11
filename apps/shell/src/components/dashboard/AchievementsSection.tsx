import { ACHIEVEMENTS } from '@velobits/app-core/constants/tools';
import type { GamificationContextValue } from '@/contexts/AppContext';

interface AchievementsSectionProps {
  g: GamificationContextValue;
}

/**
 * Dashboard achievements section.
 * Displays all achievements with unlock progress and status.
 */
export default function AchievementsSection({ g }: AchievementsSectionProps) {
  return (
    <div className="tu-dash-content">
      <h2 className="tu-dash-title">Achievements</h2>
      <p className="tu-dash-subtitle">
        {g?.achievements?.length || 0} of {ACHIEVEMENTS.length} unlocked —{' '}
        {ACHIEVEMENTS.length - (g?.achievements?.length || 0)} remaining
      </p>

      {/* Progress bar */}
      <div className="tu-dash-ach-progress">
        <div
          className="tu-dash-ach-progress-fill"
          style={{
            width: `${((g?.achievements?.length || 0) / ACHIEVEMENTS.length) * 100}%`,
          }}
        />
      </div>

      <div className="tu-dash-achievements-grid">
        {ACHIEVEMENTS.map((ach) => {
          const unlocked = g?.achievements?.includes(ach.id);
          return (
            <div
              key={ach.id}
              className={`tu-dash-achievement${unlocked ? ' tu-dash-achievement--unlocked' : ''}`}
            >
              <span className="tu-dash-achievement-icon">{ach.icon}</span>
              <span className="tu-dash-achievement-label">{ach.label}</span>
              <span className="tu-dash-achievement-desc">{ach.description}</span>
              {unlocked && <span className="tu-dash-achievement-check">Unlocked</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
