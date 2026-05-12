import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { BROWSER_REGION } from '../utils/region';
import {
  useGetActivePassesQuery,
  useCreatePassOrderMutation,
  useCreateCreditOrderMutation,
  useVerifyPaymentMutation,
  useSpinWheelMutation,
} from '../store/api/passesApi';
import { useGetSpinHistoryQuery } from '../store/api/userDataApi';
import { openRazorpayCheckout, executeCheckoutFlow } from '../utils/razorpay';
import type { RootState } from '../store/store';
import type { components } from '../types/openapi';

type ActivePass = components['schemas']['ActivePass'];
type ActiveCredit = components['schemas']['ActiveCredit'];
type SpinHistoryItem = components['schemas']['SpinHistoryItem'];
type SpinResult = components['schemas']['SpinResult'];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface UsePassesOptions {
  showAlert?: (...args: any[]) => unknown;
}

interface UsePassesReturn {
  activePasses: ActivePass[];
  activeCredits: ActiveCredit[];
  totalCredits: number;
  hasPassFor: (toolId: string) => boolean;
  handleBuyPass: (passId: string, toolIds?: string[]) => Promise<void>;
  handleBuyCredits: (packId: string) => Promise<void>;
  handleSpin: () => Promise<SpinResult | { error: string }>;
  passOrderLoading: boolean;
  creditOrderLoading: boolean;
  spinLoading: boolean;
  spinHistory: SpinHistoryItem[];
  refetchSpinHistory: () => void;
  refetchPasses: () => void;
}

export default function usePasses({ showAlert }: UsePassesOptions = {}): UsePassesReturn {
  const { accessToken } = useSelector((s: RootState) => s.auth);
  const isAuthenticated = !!accessToken;
  const navigate = useNavigate();

  const { data: activeData, refetch } = useGetActivePassesQuery(undefined, {
    skip: !isAuthenticated,
  });

  const [createPassOrder, { isLoading: passOrderLoading }] = useCreatePassOrderMutation();
  const [createCreditOrder, { isLoading: creditOrderLoading }] = useCreateCreditOrderMutation();
  const [verifyPayment] = useVerifyPaymentMutation();
  const [spinWheel, { isLoading: spinLoading }] = useSpinWheelMutation();

  const { data: spinHistoryData, refetch: refetchSpinHistory } = useGetSpinHistoryQuery(undefined, {
    skip: !isAuthenticated,
  });

  const activePasses: ActivePass[] = activeData?.passes || [];
  const activeCredits: ActiveCredit[] = activeData?.credits || [];
  const totalCredits = activeData?.total_credits || 0;

  const hasPassFor = useCallback(
    (toolId: string): boolean => {
      return activePasses.some((p) => {
        const covers =
          p.tools_count === -1 || p.tool_ids.includes(toolId) || p.tool_ids.includes('*');
        const hasUses = p.uses_today < p.uses_per_day;
        return covers && hasUses;
      });
    },
    [activePasses]
  );

  // Buy a pass via Razorpay modal
  const handleBuyPass = useCallback(
    async (passId: string, toolIds: string[] = []): Promise<void> => {
      await executeCheckoutFlow({
        createOrder: () =>
          createPassOrder({
            pass_id: passId,
            tool_ids: toolIds,
            region: BROWSER_REGION || 'US',
          }).unwrap(),
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
            description: `FixMyText Pass — ${passId}`,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onSuccess: onSuccess as any,
            onFailure: onFailure as ((msg: string) => void) | undefined,
          }),
        verifyPayment: (response) =>
          verifyPayment({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            item_id: passId,
            item_type: 'pass',
            tool_ids: toolIds,
          }).unwrap(),
        successPath: '/dashboard?tab=subscription&purchase=success',
        failPath: '/dashboard?tab=subscription&purchase=verify-failed',
        showAlert,
        navigate,
      });
    },
    [createPassOrder, verifyPayment, showAlert, navigate]
  );

  // Buy credits via Razorpay modal
  const handleBuyCredits = useCallback(
    async (packId: string): Promise<void> => {
      await executeCheckoutFlow({
        createOrder: () =>
          createCreditOrder({ pack_id: packId, region: BROWSER_REGION || 'US' }).unwrap(),
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
            description: `FixMyText Credits — ${packId}`,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onSuccess: onSuccess as any,
            onFailure: onFailure as ((msg: string) => void) | undefined,
          }),
        verifyPayment: (response) =>
          verifyPayment({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            item_id: packId,
            item_type: 'credit',
            tool_ids: [],
          }).unwrap(),
        successPath: '/dashboard?tab=subscription&purchase=success',
        failPath: '/dashboard?tab=subscription&purchase=verify-failed',
        showAlert,
        navigate,
      });
    },
    [createCreditOrder, verifyPayment, showAlert, navigate]
  );

  // Spin the wheel
  const handleSpin = useCallback(async (): Promise<SpinResult | { error: string }> => {
    try {
      const result = await spinWheel().unwrap();
      refetchSpinHistory();
      return result;
    } catch (err) {
      const apiErr = err as { data?: { detail?: string } } | null;
      return { error: apiErr?.data?.detail || 'Spin failed' };
    }
  }, [spinWheel, refetchSpinHistory]);

  return {
    activePasses,
    activeCredits,
    totalCredits,
    hasPassFor,
    handleBuyPass,
    handleBuyCredits,
    handleSpin,
    passOrderLoading,
    creditOrderLoading,
    spinLoading,
    spinHistory: spinHistoryData?.spins || [],
    refetchSpinHistory,
    refetchPasses: refetch,
  };
}
