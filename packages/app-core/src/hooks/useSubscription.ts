import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useGetSubscriptionStatusQuery,
  useCreateProCheckoutMutation,
  useVerifyProPaymentMutation,
  useCancelSubscriptionMutation,
} from '../store/api/subscriptionApi';
import usePasses from './usePasses';
import { openRazorpayCheckout, executeCheckoutFlow } from '../utils/razorpay';
import { useOidcAuth } from '../auth/useOidcAuth';
import type { ToolDefinition } from '../types/tools';

const ALWAYS_FREE_IDS = new Set([
  'find_replace',
  'compare',
  'random_text',
  'password',
  'fmt_settings',
  'regex_test',
  'markdown',
  'save_txt',
  'save_json',
]);

 
interface UseSubscriptionOptions {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- variadic showAlert accepts any alert params
  showAlert?: (...args: any[]) => unknown;
}

interface ToolUsage {
  uses: number;
  max: number;
  hasPass: boolean;
}

export default function useSubscription({ showAlert }: UseSubscriptionOptions = {}) {
  const { isAuthenticated } = useOidcAuth();
  const navigate = useNavigate();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [blockedTool, setBlockedTool] = useState<ToolDefinition | null>(null);

  const { data: status, refetch: refetchStatus } = useGetSubscriptionStatusQuery(undefined, {
    skip: !isAuthenticated,
  });

  const [createProCheckout, { isLoading: upgradeLoading }] = useCreateProCheckoutMutation();
  const [verifyProPayment] = useVerifyProPaymentMutation();
  const [cancelSub, { isLoading: cancelLoading }] = useCancelSubscriptionMutation();

  const passes = usePasses({ showAlert });

  const tier = status?.tier || 'free';
  const isPro = tier === 'pro';
  // tool_uses_today is { [key: string]: unknown } from openapi; cast to Record<string, number>
  const toolUsesToday = (status?.tool_uses_today || {}) as Record<string, number>;
  const dailyLoginBonus = status?.daily_login_bonus || false;
  const region = status?.region || '';
  const freeUsesPerTool = status?.free_uses_per_tool ?? 3;

  // Unified tool access check
  const checkToolAccess = useCallback(
    (tool: ToolDefinition | null | undefined): boolean => {
      if (!tool) return true;
      if (ALWAYS_FREE_IDS.has(tool.id) || tool.type === 'drawer') return true;
      if (!isAuthenticated) return true;
      if (isPro) return true;
      if (passes.hasPassFor(tool.id)) return true;
      if (passes.totalCredits > 0) return true;

      const uses = toolUsesToday[tool.id] || 0;
      const maxFree = freeUsesPerTool + (dailyLoginBonus ? 1 : 0);
      if (uses < maxFree) return true;

      setBlockedTool(tool);
      setShowUpgradeModal(true);
      return false;
    },
    [
      isAuthenticated,
      isPro,
      passes.hasPassFor,
      passes.totalCredits,
      toolUsesToday,
      dailyLoginBonus,
      freeUsesPerTool,
    ]
  );

  const dismissUpgradeModal = useCallback((): void => {
    setShowUpgradeModal(false);
    setBlockedTool(null);
  }, []);

  // Upgrade to Pro via Razorpay order (one-time payment)
  const handleUpgrade = useCallback(async (): Promise<void> => {
    await executeCheckoutFlow({
      createOrder: () => createProCheckout().unwrap(),
      openCheckout: ({
        order_id,
        amount,
        currency,
        key_id,
        user_email,
        user_name,
        onSuccess,
        onFailure,
      }) =>
        openRazorpayCheckout({
          orderId: order_id as string | undefined,
          amount: amount as number | undefined,
          currency: currency as string | undefined,
          keyId: key_id as string | undefined,
          userEmail: user_email as string | undefined,
          userName: user_name as string | undefined,
          description: 'Pro — Unlimited Access',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onSuccess: onSuccess as any,
          onFailure: onFailure as ((msg: string) => void) | undefined,
        }),
      verifyPayment: (response) =>
        verifyProPayment({
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
        }).unwrap(),
      successPath: '/dashboard?tab=subscription&upgrade=success',
      failPath: '/dashboard?tab=subscription&upgrade=verify-failed',
      showAlert,
      navigate,
      errorMessage: 'Failed to start subscription. Please try again.',
    });
  }, [createProCheckout, verifyProPayment, showAlert, navigate]);

  // Cancel Pro subscription
  const handleCancelSubscription = useCallback(async (): Promise<void> => {
    try {
      await cancelSub().unwrap();
      refetchStatus();
    } catch (err) {
      const apiErr = err as { data?: { detail?: string } } | null;
      showAlert?.(apiErr?.data?.detail || 'Failed to cancel subscription', 'danger');
    }
  }, [cancelSub, refetchStatus, showAlert]);

  // Get usage info for a specific tool
  const getToolUsage = useCallback(
    (toolId: string): ToolUsage => {
      if (isPro) return { uses: 0, max: Infinity, hasPass: false };
      const uses = toolUsesToday[toolId] || 0;
      const maxFree = freeUsesPerTool + (dailyLoginBonus ? 1 : 0);
      const hasPass = passes.hasPassFor(toolId);
      return { uses, max: maxFree, hasPass };
    },
    [isPro, toolUsesToday, dailyLoginBonus, freeUsesPerTool, passes.hasPassFor]
  );

  const refetchAll = useCallback((): void => {
    refetchStatus();
    passes.refetchPasses();
  }, [refetchStatus, passes.refetchPasses]);

  return {
    tier,
    isPro,
    region,
    toolUsesToday,
    dailyLoginBonus,
    getToolUsage,
    checkToolAccess,
    showUpgradeModal,
    dismissUpgradeModal,
    blockedTool,
    handleUpgrade,
    handleCancelSubscription,
    upgradeLoading,
    cancelLoading,
    ...passes,
    refetchStatus: refetchAll,
  };
}
