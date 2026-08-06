import { test, expect } from '@playwright/test';
import { API_URL, apiPost, registerVerifiedUser, razorpaySignature } from './helpers';

/**
 * Purchases a pass end-to-end against the backend with PAYMENTS_BACKEND=fake.
 *
 * We do NOT drive Razorpay's hosted checkout modal - that would require live
 * sandbox network access. Instead, the spec exercises every backend boundary:
 *   1. UI navigation to /pricing (asserts the page renders)
 *   2. POST /passes/order  → real handler, fake create_order
 *   3. HMAC-sign a fake payment with RAZORPAY_KEY_SECRET (same algorithm
 *      Razorpay uses) and POST /passes/verify → real signature check,
 *      real grant-pass logic, fake fetch_order returning our stored notes.
 *
 * Requires backend env: PAYMENTS_BACKEND=fake, RAZORPAY_KEY_ID=rzp_test_fake,
 * RAZORPAY_KEY_SECRET set to the value E2E_RAZORPAY_KEY_SECRET below.
 */
test('purchase a pass via Razorpay (test mode, signed verify)', async ({ page, request }) => {
  const secret = process.env.E2E_RAZORPAY_KEY_SECRET || 'fake_secret_for_e2e';

  // Auth: create a verified user and grab an access token.
  const { email, password, verificationToken } = await registerVerifiedUser(request);
  const verifyEmail = await apiPost(request, '/api/v1/auth/verify-email', {
    token: verificationToken,
  });
  expect(verifyEmail.ok()).toBeTruthy();
  const loginRes = await apiPost(request, '/api/v1/auth/login', {
    email,
    password,
    remember_me: false,
  });
  expect(loginRes.ok()).toBeTruthy();
  const { access_token: token } = await loginRes.json();

  // Visit pricing to assert the page loads (UI smoke).
  await page.goto('/pricing');
  await expect(page).toHaveURL(/\/pricing/);

  // Create order via the backend.
  const passId = 'day_single';
  const toolIds = ['summarize'];
  const orderRes = await apiPost(
    request,
    '/api/v1/passes/order',
    { pass_id: passId, tool_ids: toolIds, region: 'IN' },
    token
  );
  expect(orderRes.ok(), `order failed: ${await orderRes.text()}`).toBeTruthy();
  const order = await orderRes.json();
  expect(order.order_id).toMatch(/^order_fake_/);

  // Sign + verify a fake payment.
  const paymentId = `pay_fake_${Date.now()}`;
  const signature = razorpaySignature(order.order_id, paymentId, secret);
  const verifyRes = await apiPost(
    request,
    '/api/v1/passes/verify',
    {
      razorpay_order_id: order.order_id,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature,
      item_id: passId,
      item_type: 'pass',
      tool_ids: toolIds,
    },
    token
  );
  expect(verifyRes.ok(), `verify failed: ${await verifyRes.text()}`).toBeTruthy();

  // Confirm the pass is now active on the user's account.
  const activeRes = await request.get(`${API_URL}/api/v1/passes/active`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(activeRes.ok()).toBeTruthy();
  const active = await activeRes.json();
  expect(JSON.stringify(active)).toContain(passId);
});
