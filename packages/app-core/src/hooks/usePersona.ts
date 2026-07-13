import { useState, useCallback, useEffect } from 'react';
import {
  useUpdatePreferencesMutation,
  useGetPreferencesQuery,
} from '../store/api/userDataApi';
import { useOidcAuth } from '../auth/useOidcAuth';
import type { PersonaId } from '../types/tools';
import type { PersonaContextValue } from '../types/context';

// Guest persona lives in sessionStorage so the onboarding picker shows at most once
// per tab session for unauthenticated users; signed-in users persist via /user/preferences.
const GUEST_PERSONA_KEY = 'fmx_guest_persona';
// Who the tab-local persona belongs to: 'guest' (picked while signed out) or a
// Keycloak sub. Without this, user B logging in after user A in the same tab
// inherits A's persona — B's onboarding is suppressed and their DB persona
// never gets written.
const GUEST_PERSONA_OWNER_KEY = 'fmx_guest_persona_owner';

// localStorage 'fmx_gamification' is a legacy read-cache (current code never
// writes it). Its persona field is still honored on init so a persona cached
// there before the persona/gamification hook split keeps suppressing the
// picker exactly as it did when useGamification owned this state.
const LEGACY_STORAGE_KEY = 'fmx_gamification';

function loadLegacyPersona(): PersonaId | null {
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (raw) return (JSON.parse(raw) as { persona?: PersonaId | null }).persona ?? null;
  } catch {
    /* ignore */
  }
  return null;
}

function loadGuestPersona(): PersonaId | null {
  try {
    return sessionStorage.getItem(GUEST_PERSONA_KEY) as PersonaId | null;
  } catch {
    return null;
  }
}

/** null = legacy entry written before owner tagging — treated as adoptable,
 *  same as 'guest'. */
function loadGuestPersonaOwner(): string | null {
  try {
    return sessionStorage.getItem(GUEST_PERSONA_OWNER_KEY);
  } catch {
    return null;
  }
}

function saveGuestPersona(persona: PersonaId, owner: string): void {
  try {
    sessionStorage.setItem(GUEST_PERSONA_KEY, persona);
    sessionStorage.setItem(GUEST_PERSONA_OWNER_KEY, owner);
  } catch {
    /* ignore */
  }
}

function clearGuestPersona(): void {
  try {
    sessionStorage.removeItem(GUEST_PERSONA_KEY);
    sessionStorage.removeItem(GUEST_PERSONA_OWNER_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Persona / onboarding state. Persona drives onboarding and "For You"
 * personalization — a product concern that outlived the removed rewards system
 * it was originally bundled with.
 */
export default function usePersona(): PersonaContextValue {
  const [persona, setPersonaState] = useState<PersonaId | null>(
    () => loadLegacyPersona() ?? loadGuestPersona()
  );

  // Auth state from OIDC
  const { isAuthenticated, oidcUser } = useOidcAuth();
  const userSub = oidcUser?.profile.sub;

  const { data: dbPrefs } = useGetPreferencesQuery(undefined, { skip: !isAuthenticated });
  const [syncPrefs] = useUpdatePreferencesMutation();

  // Persona hydration is deliberately its own effect: the preferences response
  // can land before OR after other per-user queries, so it must not sit behind
  // a one-shot hydration guard shared with other state (that ordering race
  // re-showed the blocking welcome modal for already-onboarded users).
  useEffect(() => {
    if (!isAuthenticated || !dbPrefs) return;
    const personaFromDb = (dbPrefs as { persona?: PersonaId }).persona;
    if (personaFromDb) {
      setPersonaState((prev) => (prev === personaFromDb ? prev : personaFromDb));
      // Mirror into the tab-local copy: after logout this tab falls back to
      // guest state, and without it the welcome picker would reappear for a
      // user who onboarded long ago elsewhere.
      saveGuestPersona(personaFromDb, userSub ?? 'guest');
      return;
    }
    // DB has no persona. A tab-local pick made as a guest (or by this same
    // account) is adopted and synced up — the user just answered the picker,
    // don't ask again. One left behind by a DIFFERENT account is not ours:
    // drop it so this user gets their own onboarding.
    const stored = loadGuestPersona();
    if (!stored) return;
    const owner = loadGuestPersonaOwner();
    if (owner === null || owner === 'guest' || owner === userSub) {
      setPersonaState((prev) => (prev === stored ? prev : stored));
      saveGuestPersona(stored, userSub ?? 'guest');
      syncPrefs({ persona: stored })
        .unwrap()
        .catch(() => {});
    } else {
      clearGuestPersona();
      // Only null out a persona that came from the foreign mirror — never one
      // the user just actively picked (setPersona may have run in between).
      setPersonaState((prev) => (prev === stored ? null : prev));
    }
  }, [isAuthenticated, dbPrefs, userSub, syncPrefs]);

  const setPersona = useCallback(
    (persona: PersonaId): void => {
      setPersonaState(persona);
      // Always keep the guest copy too, even when authenticated: after logout
      // the hook falls back to guest state, and without it the welcome picker
      // would reappear on the logged-out home right after signing out.
      saveGuestPersona(persona, isAuthenticated && userSub ? userSub : 'guest');
      if (isAuthenticated) {
        syncPrefs({ persona })
          .unwrap()
          .catch(() => {});
      }
    },
    [isAuthenticated, userSub, syncPrefs]
  );

  return {
    persona,
    setPersona,
    onboarded: !!persona,
  };
}
