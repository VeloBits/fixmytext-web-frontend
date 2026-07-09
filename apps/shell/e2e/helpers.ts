import crypto from 'node:crypto';
import type { APIRequestContext, APIResponse } from '@playwright/test';

// API base URL: api-dev.velobits.dev via /etc/hosts + Traefik + Kong.
// CI can override via E2E_API_URL env var to point at any host (incl. localhost ports).
export const API_URL: string = process.env.E2E_API_URL ?? 'http://api-dev.velobits.dev';

export function uniqueEmail(prefix = 'e2e'): string {
  const rand = crypto.randomBytes(6).toString('hex');
  return `${prefix}+${rand}@example.test`;
}

export function razorpaySignature(orderId: string, paymentId: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');
}

export async function apiPost(
  request: APIRequestContext,
  path: string,
  body: Record<string, unknown>,
  token?: string
): Promise<APIResponse> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return request.post(`${API_URL}${path}`, { headers, data: body });
}

/**
 * Register a fresh user, pull the echoed verification token via
 * /auth/resend-verification (the /register response itself does not echo it),
 * verify the email, then return { email, password, accessToken }.
 *
 * Requires the backend running with EMAIL_BACKEND=console.
 */
export async function registerVerifiedUser(
  request: APIRequestContext,
  { password = 'TestPass123!' } = {}
) {
  const email = uniqueEmail();
  const displayName = 'E2E Tester';

  const reg = await apiPost(request, '/api/v1/auth/register', {
    email,
    password,
    display_name: displayName,
  });
  if (!reg.ok()) throw new Error(`register failed: ${reg.status()} ${await reg.text()}`);
  const { access_token: accessToken } = await reg.json();

  const resend = await apiPost(request, '/api/v1/auth/resend-verification', {}, accessToken);
  if (!resend.ok()) {
    throw new Error(`resend-verification failed: ${resend.status()} ${await resend.text()}`);
  }
  const { verification_token: token } = await resend.json();
  if (!token) {
    throw new Error(
      'No verification_token echoed. Backend must run with EMAIL_BACKEND=console for E2E.'
    );
  }

  return { email, password, accessToken, verificationToken: token };
}
