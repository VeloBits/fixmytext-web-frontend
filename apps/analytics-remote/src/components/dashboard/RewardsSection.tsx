import SpinWheel from '@velobits/app-core/gamification/SpinWheel';
import type { SubscriptionContextValue } from '@velobits/app-core/types/context';
import type { SpinWheelSubscription, SpinHistoryItem } from '@velobits/app-core/gamification/SpinWheel';

interface RewardsSectionProps {
  subscription: SubscriptionContextValue;
  isAuthenticated: boolean;
}

/**
 * Dashboard rewards section.
 * Shows the weekly spin wheel for earning free rewards.
 */
export default function RewardsSection({ subscription, isAuthenticated }: RewardsSectionProps) {
  const spinWheelSub: SpinWheelSubscription = {
    handleSpin: subscription.handleSpin,
    spinLoading: subscription.spinLoading,
    spinHistory: subscription.spinHistory as SpinHistoryItem[],
  };
  return (
    <div className="tu-dash-content">
      <h2 className="tu-dash-title">Weekly Rewards</h2>
      <p className="tu-dash-subtitle">Spin the wheel once per week for free rewards</p>
      <SpinWheel subscription={spinWheelSub} isAuthenticated={isAuthenticated} />
    </div>
  );
}
