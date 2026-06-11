import { TOOLS } from '@velobits/app-core/constants/tools';
import type { GamificationContextValue } from '@/contexts/AppContext';

interface FavoritesSectionProps {
  g: GamificationContextValue;
}

/**
 * Dashboard favorites section.
 * Lists all favorited tools with option to remove from favorites.
 */
export default function FavoritesSection({ g }: FavoritesSectionProps) {
  return (
    <div className="tu-dash-content">
      <h2 className="tu-dash-title">Favorites</h2>
      <p className="tu-dash-subtitle">{g?.favorites?.length || 0} tools favorited</p>
      {!g?.favorites || g.favorites.length === 0 ? (
        <div className="tu-dash-empty-page">
          <span className="tu-dash-empty-icon">❤️</span>
          <span>No favorites yet</span>
          <span className="tu-dash-empty-hint">Heart tools from the sidebar to add them here</span>
        </div>
      ) : (
        <div className="tu-tpanel-list tu-dash-fav-panel">
          {g.favorites.map((id) => {
            const tool = TOOLS.find((t) => t.id === id);
            if (!tool) return null;
            return (
              <div key={id} className="tu-titem-wrap">
                <div className="tu-titem">
                  <span className={`tu-titem-icon tu-titem-icon--${tool.color}`}>{tool.icon}</span>
                  <span className="tu-titem-name">{tool.label}</span>
                  <button
                    className="tu-titem-fav tu-titem-fav--active"
                    onClick={() => g.toggleFavorite(id)}
                    title="Remove from favorites"
                  >
                    ♥
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
