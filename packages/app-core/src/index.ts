// @velobits/app-core — shared runtime foundation for the FixMyText micro-frontends.
//
// Holds the Redux/RTK-Query store, OIDC auth runtime, domain constants, shared
// data hooks, gamification UI, utilities, and the host<->remote contract types.
// The shell (host) and the editor/analytics remotes all consume this package;
// in production it is shared as a Module Federation singleton so there is exactly
// one store instance at runtime (see each app's vite.config federation `shared`).

// ── Types & contract ──────────────────────────────────────────────────────────
export * from './types';
export * from './types/context';
export * from './types/alert';
export * from './contract';

// ── Runtime foundation (safe re-exports of existing sub-barrels) ───────────────
export * from './store';
export * from './utils';
export * from './constants';

// Auth runtime, gamification UI, and shared hooks are consumed via subpaths
// (e.g. '@velobits/app-core/auth/useOidcAuth', '@velobits/app-core/hooks/usePasses')
// and are folded into this barrel in Phase 2 alongside the federation `shared` wiring.
