import TextForm from '@/components/editor/TextForm';
import type {
  GamificationContextValue,
  SubscriptionContextValue,
  User,
} from '@velobits/app-core/types/context';

interface HomeProps {
  mode: string;
  setMode: (mode: string) => void;
  showAlert: (message: string, type: string) => void;
  gamification: GamificationContextValue;
  user: User | null;
  isAuthenticated: boolean;
  subscription: SubscriptionContextValue;
}

export default function Home({
  mode,
  setMode,
  showAlert,
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
      gamification={gamification}
      user={user}
      isAuthenticated={isAuthenticated}
      subscription={subscription}
    />
  );
}
