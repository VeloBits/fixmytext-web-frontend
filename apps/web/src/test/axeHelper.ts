import { axe } from 'vitest-axe';

interface RuleObject {
  enabled: boolean;
  [key: string]: unknown;
}

/**
 * Run axe-core against a rendered container and assert no violations.
 *
 * Default rule config tuned for jsdom:
 *   - color-contrast: disabled (jsdom can't compute layout/colors reliably).
 *     Contrast is enforced separately via @axe-core/react in the dev browser
 *     console (src/index.jsx).
 *   - region: disabled in component-level tests (landmarks belong to App).
 *
 * Override per test by passing `rules`, e.g.:
 *   await expectNoA11yViolations(container, { region: { enabled: true } });
 */
export async function expectNoA11yViolations(
  container: Element,
  ruleOverrides: Record<string, RuleObject> = {},
): Promise<void> {
  const results = await axe(container, {
    rules: {
      'color-contrast': { enabled: false },
      region: { enabled: false },
      ...ruleOverrides,
    },
  });
  // toHaveNoViolations is registered globally via setup.ts → expect.extend(axeMatchers)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (expect(results) as any).toHaveNoViolations();
}
