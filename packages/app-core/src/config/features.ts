// Feature flags for staged feature removal.
//
// Gamification kill switch (Phase A of the gamification removal): the code
// stays in the bundle but every gamification network call, hydration effect,
// and mutation is disabled when the flag is off, and the shell provides
// `gamification: null` through AppContext / the federation contract.
//
// Semantics: absent ⇒ enabled. Only the literal string 'false' disables it,
// so existing deployments without the env var keep today's behavior.
//
// Deliberately a function evaluated at call time (not a module-level constant):
// tests can flip the flag with `vi.stubEnv('VITE_GAMIFICATION_ENABLED', 'false')`
// without needing module-cache resets.

export function isGamificationEnabled(): boolean {
  return import.meta.env.VITE_GAMIFICATION_ENABLED !== 'false';
}
