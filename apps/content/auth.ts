/**
 * Auth.js v5 configuration for the VeloBits content app.
 *
 * Auth strategy: read the `fixmytext_session` cookie issued by account-svc
 * and surface it as a Next.js Auth.js session. No OAuth providers needed here —
 * authentication flows through the Vite editor app (Keycloak PKCE); this app
 * is a consumer of the session cookie produced after login.
 *
 * Current routes (/about, /pricing, /share) are all public — auth() is
 * available for future protected routes (user profile, dashboard, etc.).
 */
import NextAuth from 'next-auth';
import { cookies } from 'next/headers';
import type { NextAuthConfig } from 'next-auth';
import { SESSION_COOKIE_NAME } from '@velobits/auth-shared';
import { verifySession } from '@velobits/auth-shared/server';

// Shared secret with account-svc — must equal SESSION_COOKIE_SECRET there.
// Without it, the session cookie is rejected rather than trusted unsigned.
const COOKIE_SECRET = process.env.COOKIE_SECRET ?? '';

export const config: NextAuthConfig = {
  providers: [],
  secret: process.env.AUTH_SECRET,
  callbacks: {
    async session({ session }) {
      // Enrich the Auth.js session from the fixmytext_session cookie issued by
      // account-svc. verifySession checks the HMAC-SHA256 signature before
      // trusting any claims — an unsigned or tampered cookie returns null.
      try {
        const cookieStore = await cookies();
        const raw = cookieStore.get(SESSION_COOKIE_NAME)?.value;
        if (raw && COOKIE_SECRET) {
          const claims = verifySession(raw, COOKIE_SECRET);
          if (claims) {
            session.user = {
              id: claims.sub,
              email: claims.email ?? '',
              emailVerified: claims.email_verified ? new Date() : null,
              name: claims.email ?? claims.sub,
              image: null,
            };
          }
        }
      } catch {
        // Cookies not available in the current context (e.g. build time) — ignore.
      }
      return session;
    },
  },
  session: { strategy: 'jwt' },
};

export const { handlers, auth, signIn, signOut } = NextAuth(config);
