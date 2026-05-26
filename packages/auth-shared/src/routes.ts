/** Canonical route constants shared by both the Vite web app and Next.js content app. */
export const AUTH_ROUTES = {
  login: '/login',
  signup: '/signup',
  forgotPassword: '/forgot-password',
  callback: '/auth/callback',
  silentCallback: '/auth/silent-callback',
} as const;

export type AuthRoute = (typeof AUTH_ROUTES)[keyof typeof AUTH_ROUTES];
