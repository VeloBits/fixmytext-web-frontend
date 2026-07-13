import TextForm from '@/components/editor/TextForm';
import type {
  FavoritesContextValue,
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
      user={user}
      isAuthenticated={isAuthenticated}
      subscription={subscription}
    />
  );
}
