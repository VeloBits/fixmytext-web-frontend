import { useState, useCallback } from 'react';

const STORAGE_KEY = 'fmx_trial_uses';
const FREE_USES = 3;

function getCount(): number {
  try {
    return parseInt(localStorage.getItem(STORAGE_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

interface UseTrialLimitReturn {
  checkTrial: () => boolean;
  showSignInGate: boolean;
  dismissGate: () => void;
  remaining: number;
  trialCount: number;
}

export default function useTrialLimit(isAuthenticated: boolean): UseTrialLimitReturn {
  const [trialCount, setTrialCount] = useState<number>(getCount);
  const [showSignInGate, setShowSignInGate] = useState(false);

  const remaining = Math.max(0, FREE_USES - trialCount);

  // Returns true if the user can proceed, false if blocked
  const checkTrial = useCallback((): boolean => {
    if (isAuthenticated) return true;
    const current = getCount();
    if (current >= FREE_USES) {
      setShowSignInGate(true);
      return false;
    }
    const next = current + 1;
    localStorage.setItem(STORAGE_KEY, String(next));
    setTrialCount(next);
    return true;
  }, [isAuthenticated]);

  const dismissGate = useCallback((): void => setShowSignInGate(false), []);

  return { checkTrial, showSignInGate, dismissGate, remaining, trialCount };
}
