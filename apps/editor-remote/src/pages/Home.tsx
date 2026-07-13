import TextForm from '@/components/editor/TextForm';
import type {
  FavoritesContextValue,
  GamificationContextValue,
  PersonaContextValue,
  SubscriptionContextValue,
  User,
} from '@velobits/app-core/types/context';

interface HomeProps {
  mode: string;
  setMode: (mode: string) => void;
  showAlert: (message: string, type: string) => void;
  persona: PersonaContextValue;
  favorites: FavoritesContextValue;
  gamification?: GamificationContextValue | null;
  user: User | null;
  isAuthenticated: boolean;
  subscription: SubscriptionContextValue;
}

export default function Home({
  mode,
  setMode,
  showAlert,
  persona,
  favorites,
  gamification,
  user,
  isAuthenticated,
  subscription,
}: HomeProps) {
  return (
    <TextForm
      mode={mode}
      setMode={setMode}
      showAlert={showAlert}
      persona={persona}
      favorites={favorites}
      gamification={gamification ?? null}
      user={user}
      isAuthenticated={isAuthenticated}
      subscription={subscription}
    />
  );
}
