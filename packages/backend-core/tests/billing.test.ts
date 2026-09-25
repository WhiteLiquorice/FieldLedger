import { describe, expect, it } from 'vitest';
import {
  calculateTrialWindow,
  evaluateEntitlement,
  evaluateSeatLimit,
  TRIAL_DURATION_DAYS,
  STARTER_MAX_TECHNICIANS,
} from '../src/engines/billing.js';

describe('billing & entitlements: trial window calculation', () => {
  it('correctly calculates 14-day trial window from start date', () => {
    const start = new Date('2026-09-01T00:00:00Z');
    const window = calculateTrialWindow(start, new Date('2026-09-05T00:00:00Z'));
    expect(window.isTrialActive).toBe(true);
    expect(window.trialEndsAt).toBe(new Date('2026-09-15T00:00:00Z').toISOString());
    expect(window.daysRemaining).toBe(10);
  });

  it('marks trial as expired when current time exceeds 14 days', () => {
    const start = new Date('2026-09-01T00:00:00Z');
    const window = calculateTrialWindow(start, new Date('2026-09-16T00:00:00Z'));
    expect(window.isTrialActive).toBe(false);
    expect(window.daysRemaining).toBe(0);
  });

  it('handles same-day trial calculation with 14 days remaining', () => {
    const now = new Date('2026-09-01T12:00:00Z');
    const window = calculateTrialWindow(now, now);
    expect(window.isTrialActive).toBe(true);
    expect(window.daysRemaining).toBe(14);
  });
});

describe('billing & entitlements: access entitlement evaluation', () => {
  it('denies access if organization is pending deletion or disabled', () => {
    const res = evaluateEntitlement({
      status: 'pending_deletion',
      subscriptionStatus: 'active',
    });
    expect(res.entitled).toBe(false);
    expect(res.reason).toMatch(/suspended/);
  });

  it('allows access for active Stripe subscription', () => {
    const res = evaluateEntitlement({
      status: 'active',
      subscriptionStatus: 'active',
    });
    expect(res.entitled).toBe(true);
  });

  it('allows access for trialing Stripe subscription', () => {
    const res = evaluateEntitlement({
      status: 'active',
      subscriptionStatus: 'trialing',
      trialEndsAt: '2099-01-01T00:00:00Z',
    });
    expect(res.entitled).toBe(true);
  });

  it('allows access during initial unbilled 14-day trial', () => {
    const futureDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
    const res = evaluateEntitlement({
      status: 'active',
      subscriptionStatus: 'not_started',
      trialEndsAt: futureDate,
    });
    expect(res.entitled).toBe(true);
  });

  it('denies access when unbilled trial has expired without payment method', () => {
    const pastDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    const res = evaluateEntitlement({
      status: 'active',
      subscriptionStatus: 'not_started',
      trialEndsAt: pastDate,
    });
    expect(res.entitled).toBe(false);
    expect(res.reason).toMatch(/trial expired/i);
  });

  it('allows access with warning for past_due status', () => {
    const res = evaluateEntitlement({
      status: 'active',
      subscriptionStatus: 'past_due',
    });
    expect(res.entitled).toBe(true);
    expect(res.warning).toBeDefined();
  });

  it('denies access when subscription is canceled or expired', () => {
    const canceled = evaluateEntitlement({
      status: 'active',
      subscriptionStatus: 'canceled',
    });
    expect(canceled.entitled).toBe(false);

    const expired = evaluateEntitlement({
      status: 'active',
      subscriptionStatus: 'expired',
    });
    expect(expired.entitled).toBe(false);
  });
});

describe('billing & entitlements: seat limit enforcement', () => {
  it('allows adding technician when below cap of 3', () => {
    const res = evaluateSeatLimit(1, 1, STARTER_MAX_TECHNICIANS);
    expect(res.allowed).toBe(true);
    expect(res.remaining).toBe(1);
  });

  it('rejects adding technician when at cap of 3 (active + pending)', () => {
    const res = evaluateSeatLimit(2, 1, STARTER_MAX_TECHNICIANS);
    expect(res.allowed).toBe(false);
    expect(res.remaining).toBe(0);
  });

  it('rejects adding technician when active count alone meets cap', () => {
    const res = evaluateSeatLimit(3, 0, STARTER_MAX_TECHNICIANS);
    expect(res.allowed).toBe(false);
    expect(res.remaining).toBe(0);
  });
});
