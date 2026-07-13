import { useState, useCallback, useEffect } from 'react';
import {
  useGetFavoritesQuery,
  useAddFavoriteMutation,
  useRemoveFavoriteMutation,
} from '../store/api/userDataApi';
import { useOidcAuth } from '../auth/useOidcAuth';
import type { FavoritesContextValue } from '../types/context';

/**
 * Favorite tools.
 *
 * Signed-in users persist via the dedicated /user/favorites endpoints; guest
 * favorites stay in-memory for the session only.
 */
export default function useFavorites(): FavoritesContextValue {
  // populated from GET /user/favorites when authenticated
  const [favorites, setFavorites] = useState<string[]>([]);

  const { isAuthenticated } = useOidcAuth();

  const { data: dbFavorites } = useGetFavoritesQuery(undefined, { skip: !isAuthenticated });
  const [apiAddFavorite] = useAddFavoriteMutation();
  const [apiRemoveFavorite] = useRemoveFavoriteMutation();

  // Hydrate favorites from dedicated endpoint
  useEffect(() => {
    if (dbFavorites) {
      const favs = dbFavorites as { favorites: Array<{ tool_id: string }> };
      const ids = favs.favorites.map((f) => f.tool_id);
      setFavorites(ids);
    }
  }, [dbFavorites]);

  const toggleFavorite = useCallback(
    (toolId: string): void => {
      setFavorites((prev) => {
        const isFav = prev.includes(toolId);
        if (isAuthenticated) {
          if (isFav)
            apiRemoveFavorite(toolId)
              .unwrap()
              .catch(() => {});
          else
            apiAddFavorite(toolId)
              .unwrap()
              .catch(() => {});
        }
        return isFav ? prev.filter((id) => id !== toolId) : [...prev, toolId];
      });
    },
    [isAuthenticated, apiAddFavorite, apiRemoveFavorite]
  );

  return { favorites, toggleFavorite };
}
