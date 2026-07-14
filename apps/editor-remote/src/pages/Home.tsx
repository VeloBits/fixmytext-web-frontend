import TextForm from '@/components/editor/TextForm';
import type {
  FavoritesContextValue,
  SubscriptionContextValue,
  ToolGroupsContextValue,
  User,
} from '@velobits/app-core/types/context';

interface HomeProps {
  mode: string;
  setMode: (mode: string) => void;
  showAlert: (message: string, type: string) => void;
  toolGroups: ToolGroupsContextValue;
  favorites: FavoritesContextValue;
  user: User | null;
  isAuthenticated: boolean;
  subscription: SubscriptionContextValue;
}

export default function Home({
  mode,
  setMode,
  showAlert,
  toolGroups,
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
      toolGroups={toolGroups}
      favorites={favorites}
      user={user}
      isAuthenticated={isAuthenticated}
      subscription={subscription}
    />
  );
}
