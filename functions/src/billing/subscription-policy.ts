import {
  calculateTrialWindow,
  evaluateEntitlement,
  evaluateSeatLimit,
  TRIAL_DURATION_DAYS,
  STARTER_MAX_TECHNICIANS,
} from '@compliance-saas/backend-core';

export {
  calculateTrialWindow,
  evaluateEntitlement,
  evaluateSeatLimit,
  TRIAL_DURATION_DAYS,
  STARTER_MAX_TECHNICIANS,
};

export function canStartCheckout(org: {
  stripeSubscriptionId?: unknown;
  subscriptionStatus?: unknown;
}): boolean {
  return !org.stripeSubscriptionId || org.subscriptionStatus === 'canceled' || org.subscriptionStatus === 'expired';
}

/** Checkout requires a trial end at least 48h away; allow its full 35-minute session lifetime. */
export function checkoutTrialEnd(org: { stripeSubscriptionId?: unknown; trialEndsAt?: unknown }, now = Date.now()): number | null {
  if (org.stripeSubscriptionId || typeof org.trialEndsAt !== 'string') return null;
  const end = Date.parse(org.trialEndsAt);
  return Number.isFinite(end) && end > now + (48 * 60 + 35) * 60000 ? Math.floor(end / 1000) : null;
}

export function subscriptionSnapshot(subscription: {
  id: string;
  customer: string | { id: string };
  status: string;
  current_period_end?: number;
  trial_end?: number | null;
  items?: { data: Array<{ current_period_end?: number }> };
}) {
  const end = subscription.current_period_end ?? subscription.items?.data[0]?.current_period_end;
  const trialEnd = typeof subscription.trial_end === 'number' ? new Date(subscription.trial_end * 1000).toISOString() : null;
  return {
    stripeCustomerId: typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id,
    stripeSubscriptionId: subscription.id,
    subscriptionTier: 'starter',
    subscriptionStatus: ['active', 'trialing', 'past_due', 'canceled', 'unpaid', 'paused', 'incomplete'].includes(subscription.status) ? subscription.status : 'expired',
    currentPeriodEnd: typeof end === 'number' ? new Date(end * 1000).toISOString() : null,
    trialEndsAt: trialEnd,
    trialEndsAtMs: typeof subscription.trial_end === 'number' ? subscription.trial_end * 1000 : 0,
  };
}
