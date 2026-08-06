import { useCallback, useEffect, useRef, useState } from 'react';
import { useOidcAuth } from '@velobits/app-core/auth/useOidcAuth';
import {
  useGetUiSettingsQuery,
  useUpdateUiSettingsMutation,
} from '@velobits/app-core/store/api/userDataApi';
import type { ToolGroupsContextValue } from '@velobits/app-core/types/context';

// Once-per-tab-session guest signal (sessionStorage), exactly the old guest
// persona behavior: closing the tab re-offers the starter kits, a reload
// doesn't. Signed-in users persist via ui-settings.onboarding_seen.
const SEEN_KEY = 'fmx_onboard_seen';
// Who the tab flag belongs to: 'guest' or a Keycloak sub. Without this, user B
// logging in after user A in the same tab would inherit A's dismissal and
// never get their own onboarding.
const SEEN_OWNER_KEY = 'fmx_onboard_seen_owner';

function loadSeen(): boolean {
  try {
    return sessionStorage.getItem(SEEN_KEY) === '1';
  } catch {
    return false;
  }
}

/** null = flag written before owner tagging - treated as adoptable, same as 'guest'. */
function loadSeenOwner(): string | null {
  try {
    return sessionStorage.getItem(SEEN_OWNER_KEY);
  } catch {
    return null;
  }
}

function saveSeen(owner: string): void {
  try {
    sessionStorage.setItem(SEEN_KEY, '1');
    sessionStorage.setItem(SEEN_OWNER_KEY, owner);
  } catch {
    /* ignore */
  }
}

function clearSeen(): void {
  try {
    sessionStorage.removeItem(SEEN_KEY);
    sessionStorage.removeItem(SEEN_OWNER_KEY);
  } catch {
    /* ignore */
  }
}

export interface OnboardingGate {
  /** The user has answered (or dismissed) the starter-kit picker. */
  seen: boolean;
  /** False while a signed-in user's server state is still settling - the
   * modal must not flash for someone who onboarded long ago elsewhere. */
  resolved: boolean;
  markSeen: () => void;
}

/**
 * Gates the starter-kit onboarding modal. Shell-local on purpose: the remotes
 * never gate on onboarding, so this stays out of the federation contract.
 *
 * Having any custom tool group also counts as onboarded - groups are the
 * modal's only output, so a user who already has some needs no pitch.
 */
export default function useOnboardingGate(toolGroups: ToolGroupsContextValue): OnboardingGate {
  const [tabSeen, setTabSeen] = useState<boolean>(() => loadSeen());

  const { isAuthenticated, oidcUser } = useOidcAuth();
  const userSub = oidcUser?.profile.sub;

  const { data: uiSettings, isError: settingsFailed } = useGetUiSettingsQuery(undefined, {
    skip: !isAuthenticated,
  });
  const [updateUiSettings] = useUpdateUiSettingsMutation();

  const dbSeen =
    (uiSettings as { onboarding_seen?: boolean } | undefined)?.onboarding_seen === true;

  // The reconcile effect re-runs on every ui-settings refetch; without the ref
  // a slow response would re-PUT the adopted flag.
  const adoptionSynced = useRef(false);

  // Reconciliation is its own effect keyed on the query data - the
  // self-contained pattern usePersona settled on after the P2-TC-22 ordering
  // race (a shared hydration guard re-showed onboarding for onboarded users).
  useEffect(() => {
    if (!isAuthenticated || !uiSettings) return;
    if (dbSeen) {
      // Mirror into the tab flag: after logout this tab falls back to guest
      // state, and without it the picker would reappear right after sign-out.
      setTabSeen(true);
      saveSeen(userSub ?? 'guest');
      return;
    }
    // Server says unseen. A tab flag set as a guest (or by this same account)
    // is adopted and synced up - the user just answered the picker, don't ask
    // again. One left behind by a DIFFERENT account is not ours: drop it so
    // this user gets their own onboarding.
    if (!loadSeen()) return;
    const owner = loadSeenOwner();
    if (owner === null || owner === 'guest' || owner === userSub) {
      setTabSeen(true);
      saveSeen(userSub ?? 'guest');
      if (!adoptionSynced.current) {
        adoptionSynced.current = true;
        updateUiSettings({ onboarding_seen: true })
          .unwrap()
          .catch(() => {});
      }
    } else {
      clearSeen();
      setTabSeen(false);
    }
  }, [isAuthenticated, uiSettings, dbSeen, userSub, updateUiSettings]);

  const markSeen = useCallback(() => {
    setTabSeen(true);
    saveSeen(isAuthenticated && userSub ? userSub : 'guest');
    if (isAuthenticated) {
      updateUiSettings({ onboarding_seen: true })
        .unwrap()
        .catch(() => {});
    }
  }, [isAuthenticated, userSub, updateUiSettings]);

  // A failed ui-settings fetch still resolves (falling back to the tab flag) -
  // a flaky endpoint must not permanently block the modal or the app.
  const settingsSettled = !isAuthenticated || !!uiSettings || settingsFailed;

  return {
    seen: tabSeen || dbSeen || toolGroups.groups.length > 0,
    resolved: settingsSettled && toolGroups.ready,
    markSeen,
  };
}
