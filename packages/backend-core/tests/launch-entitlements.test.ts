import { it, expect } from 'vitest';
import { evaluateEntitlement } from '../src/engines/billing';
it('rejects an expired trial even when its subscription status still says trialing', () => {
  expect(evaluateEntitlement({ subscriptionStatus: 'trialing', trialEndsAt: '2026-01-01T00:00:00Z' }, '2026-01-02').entitled).toBe(false);
});
it('rejects missing trial or subscription state instead of granting unlimited onboarding access', () => {
  expect(evaluateEntitlement({}).entitled).toBe(false);
});
