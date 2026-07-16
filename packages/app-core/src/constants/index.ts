/**
 * App-wide constants.
 *
 * Centralise magic strings and configuration values here
 * so they can be updated in a single place.
 */

export * from './pricing';

/** Route paths */
export const ROUTES = {
  HOME: '/',
  ABOUT: '/about',
  LOGIN: '/login',
  SIGNUP: '/signup',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  VERIFY_EMAIL: '/verify-email',
  DASHBOARD: '/dashboard',
  PRICING: '/pricing',
  SHARE: '/share/:id',
} as const;
