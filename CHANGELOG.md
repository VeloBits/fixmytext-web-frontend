# Changelog

All notable changes to the FixMyText frontend will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- Email-verification banner (`EmailVerificationBanner`) now resends via the account-svc `POST /auth/resend-verification` endpoint instead of redirecting to Keycloak's reset-credentials page; the user stays in the app and gets a success/error alert
- Post-logout redirect target changed from `/app/login` to `/app/` so a signed-out user is not immediately bounced back to the Keycloak login form
- Onboarding persona overlay is suppressed on auth routes (`/login`, `/signup`, `/forgot-password`, `/auth/*`) so it no longer covers the "Couldn't reach sign-in" retry card or the callback error card
- `AuthCallback` now recovers from a replayed/refreshed callback URL (consumed OIDC state) by restoring the existing session and returning home, instead of stranding the user on an error card
- Persona selection is mirrored to `sessionStorage` even when authenticated, so the onboarding modal does not reappear immediately after logout

### Removed

- Dead `keycloakClient.ts` (`sendMagicLink`) — the magic-link workaround had no callers; `ForgotPasswordPage` builds its own Keycloak reset-credentials URL from `keycloakConfig`

## [1.0.0] - 2026-04-02

### Added

- 200+ tool definitions across 14 categories (Case, Cleanup, Encoding, Lines, Ciphers, Developer, AI Writing, AI Content, Language, Generation, Hashing, Comparison, Utility, Escaping)
- Main text editor (TextForm) with input/output panels and tool search
- User authentication UI with JWT auto-refresh via RTK Query base query
- Dashboard with operation history, stats, and subscription management
- Gamification UI: XP display, streak counter, achievement badges, daily quests
- Export results to PDF (jsPDF) and DOCX (docx library)
- Shareable result links (public, no auth required)
- Dark and light mode with persistent theme preference
- Keyboard shortcuts and command palette
- Tool search and category-based filtering with drawer navigation
- Pricing page with subscription plans and prepaid passes
- 24+ custom hooks for auth, theming, export, history, gamification, and more
- Redux Toolkit store with RTK Query API slices for all backend resources
- Framer Motion animations and transitions
- Responsive design with mobile-first CSS modules
- Error boundary and onboarding modal for new users
- Visitor fingerprinting for anonymous trial tracking
- Docker support with dev and prod profiles (Vite dev server and Nginx production)

---

## Release Template

Copy this block when preparing a new release:

## [X.Y.Z] - YYYY-MM-DD

### Added
-

### Changed
-

### Fixed
-

### Removed
-
