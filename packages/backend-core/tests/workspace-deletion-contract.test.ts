import { it, expect } from 'vitest';
import { canRequestWorkspaceDeletion } from '../src/engines/account-lifecycle';
it('requires canceling a billable Stripe trial or overdue subscription before deleting its workspace', () => {
  expect(canRequestWorkspaceDeletion({ status: 'active', subscriptionStatus: 'trialing' }).canDelete).toBe(false);
  expect(canRequestWorkspaceDeletion({ status: 'active', subscriptionStatus: 'past_due' }).canDelete).toBe(false);
});
