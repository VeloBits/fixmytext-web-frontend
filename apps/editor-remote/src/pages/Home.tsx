import TextForm from '@/components/editor/TextForm';
import type {
  FavoritesContextValue,
  SidebarChipsContextValue,
  SubscriptionContextValue,
  ToolGroupsContextValue,
  User,
} from '@velobits/app-core/types/context';
import type { ShowAlertFn } from '@velobits/app-core/types/alert';

interface HomeProps {
  mode: string;
  setMode: (mode: string) => void;
  showAlert: ShowAlertFn;
  toolGroups: ToolGroupsContextValue;
  favorites: FavoritesContextValue;
  sidebarChips: SidebarChipsContextValue;
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
  sidebarChips,
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
      sidebarChips={sidebarChips}
      user={user}
      isAuthenticated={isAuthenticated}
      subscription={subscription}
    />
  );
}
