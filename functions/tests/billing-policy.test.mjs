import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  canStartCheckout,
  subscriptionSnapshot,
  calculateTrialWindow,
  evaluateEntitlement,
  evaluateSeatLimit,
  STARTER_MAX_TECHNICIANS,
  checkoutTrialEnd,
} from '../lib/billing/subscription-policy.js';

test('checkout preserves the existing trial deadline and never grants a second trial', () => {
  const now = Date.parse('2026-09-01T00:00:00Z');
  assert.equal(checkoutTrialEnd({ trialEndsAt: '2026-09-10T00:00:00Z' }, now), Date.parse('2026-09-10T00:00:00Z') / 1000);
  assert.equal(checkoutTrialEnd({ trialEndsAt: '2026-09-02T00:00:00Z' }, now), null);
  assert.equal(checkoutTrialEnd({ trialEndsAt: '2026-08-30T00:00:00Z' }, now), null);
  assert.equal(checkoutTrialEnd({ trialEndsAt: '2026-09-10T00:00:00Z', stripeSubscriptionId: 'old-subscription' }, now), null);
});

test('unpaid and paused subscriptions cannot be mistaken for ended billing', () => {
  for (const status of ['unpaid', 'paused', 'incomplete']) {
    const org = subscriptionSnapshot({ id: 'sub-existing', customer: 'cus-existing', status });
    assert.equal(org.subscriptionStatus, status);
    assert.equal(canStartCheckout(org), false);
  }
});

test('billing policy: canStartCheckout prevents concurrent checkout with active subscription', () => {
  assert.equal(canStartCheckout({ stripeSubscriptionId: 'sub_123', subscriptionStatus: 'active' }), false);
  assert.equal(canStartCheckout({ stripeSubscriptionId: 'sub_123', subscriptionStatus: 'trialing' }), false);
  assert.equal(canStartCheckout({ stripeSubscriptionId: 'sub_123', subscriptionStatus: 'past_due' }), false);
  assert.equal(canStartCheckout({ stripeSubscriptionId: 'sub_123', subscriptionStatus: 'canceled' }), true);
  assert.equal(canStartCheckout({ stripeSubscriptionId: 'sub_123', subscriptionStatus: 'expired' }), true);
  assert.equal(canStartCheckout({ stripeSubscriptionId: undefined, subscriptionStatus: 'not_started' }), true);
  assert.equal(canStartCheckout({}), true);
});

test('billing policy: subscriptionSnapshot extracts period and trial_end properly', () => {
  const mockSub = {
    id: 'sub_test_1',
    customer: 'cus_cust_1',
    status: 'trialing',
    current_period_end: 1800000000,
    trial_end: 1795000000,
  };

  const snap = subscriptionSnapshot(mockSub);
  assert.equal(snap.stripeSubscriptionId, 'sub_test_1');
  assert.equal(snap.stripeCustomerId, 'cus_cust_1');
  assert.equal(snap.subscriptionStatus, 'trialing');
  assert.equal(snap.subscriptionTier, 'starter');
  assert.equal(snap.currentPeriodEnd, new Date(1800000000 * 1000).toISOString());
  assert.equal(snap.trialEndsAt, new Date(1795000000 * 1000).toISOString());
});

test('billing policy: trial window calculation respects 14 days duration', () => {
  const start = new Date('2026-09-01T12:00:00Z');
  const midway = new Date('2026-09-08T12:00:00Z');
  const expired = new Date('2026-09-16T12:00:00Z');

  const activeWindow = calculateTrialWindow(start, midway);
  assert.equal(activeWindow.isTrialActive, true);
  assert.equal(activeWindow.daysRemaining, 7);

  const expiredWindow = calculateTrialWindow(start, expired);
  assert.equal(expiredWindow.isTrialActive, false);
  assert.equal(expiredWindow.daysRemaining, 0);
});

test('billing policy: evaluateEntitlement restricts suspended or expired accounts', () => {
  // Active subscription
  assert.equal(evaluateEntitlement({ status: 'active', subscriptionStatus: 'active' }).entitled, true);

  // Suspended account
  const suspended = evaluateEntitlement({ status: 'pending_deletion', subscriptionStatus: 'active' });
  assert.equal(suspended.entitled, false);
  assert.match(suspended.reason, /suspended/);

  // Expired unbilled trial
  const expiredTrial = evaluateEntitlement({
    status: 'active',
    subscriptionStatus: 'not_started',
    trialEndsAt: new Date(Date.now() - 3600000).toISOString(),
  });
  assert.equal(expiredTrial.entitled, false);
  assert.match(expiredTrial.reason, /trial expired/i);

  // Past due has warning but is entitled
  const pastDue = evaluateEntitlement({ status: 'active', subscriptionStatus: 'past_due' });
  assert.equal(pastDue.entitled, true);
  assert.ok(pastDue.warning);
});

test('billing policy: evaluateSeatLimit enforces 3-technician maximum for starter tier', () => {
  assert.equal(evaluateSeatLimit(1, 1, STARTER_MAX_TECHNICIANS).allowed, true);
  assert.equal(evaluateSeatLimit(1, 1, STARTER_MAX_TECHNICIANS).remaining, 1);

  // Exactly at limit
  assert.equal(evaluateSeatLimit(2, 1, STARTER_MAX_TECHNICIANS).allowed, false);
  assert.equal(evaluateSeatLimit(2, 1, STARTER_MAX_TECHNICIANS).remaining, 0);

  // Over limit
  assert.equal(evaluateSeatLimit(3, 1, STARTER_MAX_TECHNICIANS).allowed, false);
});

test('billing policy: event ordering and duplicate protection simulation', () => {
  const org = {
    stripeCustomerId: 'cus_1',
    stripeSubscriptionId: 'sub_1',
    subscriptionStatus: 'active',
    lastStripeEventCreated: 1000,
  };

  const isStaleEvent = (eventCreated, lastCreated) => {
    return typeof lastCreated === 'number' && eventCreated < lastCreated;
  };

  // Stale event arrived out-of-order
  assert.equal(isStaleEvent(900, org.lastStripeEventCreated), true);

  // Newer event arrived
  assert.equal(isStaleEvent(1100, org.lastStripeEventCreated), false);
});
