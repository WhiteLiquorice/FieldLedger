export const TRIAL_DURATION_DAYS = 14;
export const STARTER_MAX_TECHNICIANS = 3;

export interface TrialWindow {
  isTrialActive: boolean;
  trialEndsAt: string;
  daysRemaining: number;
}

export function calculateTrialWindow(
  startedAt: Date | string | number,
  nowInput: Date | string | number = new Date()
): TrialWindow {
  const startMs = new Date(startedAt).getTime();
  const nowMs = new Date(nowInput).getTime();
  const trialDurationMs = TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000;
  const trialEndMs = startMs + trialDurationMs;

  const msRemaining = Math.max(0, trialEndMs - nowMs);
  const daysRemaining = Math.ceil(msRemaining / (24 * 60 * 60 * 1000));
  const isTrialActive = nowMs < trialEndMs;

  return {
    isTrialActive,
    trialEndsAt: new Date(trialEndMs).toISOString(),
    daysRemaining,
  };
}

export interface EntitlementDecision {
  entitled: boolean;
  reason?: string;
  warning?: string;
}

export function evaluateEntitlement(
  org: {
    status?: string;
    disabled?: boolean;
    subscriptionStatus?: string;
    trialEndsAt?: string;
  },
  nowInput: Date | string | number = new Date()
): EntitlementDecision {
  if (org.disabled || org.status === 'pending_deletion' || org.status === 'deleted') {
    return {
      entitled: false,
      reason: 'Workspace access has been suspended.',
    };
  }

  const subStatus = org.subscriptionStatus || 'not_started';

  if (subStatus === 'active') {
    return { entitled: true };
  }

  if (subStatus === 'past_due') {
    return {
      entitled: true,
      warning: 'Payment is past due. Update payment method in billing portal.',
    };
  }

  if (subStatus === 'canceled' || subStatus === 'expired') {
    return {
      entitled: false,
      reason: 'Subscription is canceled or expired.',
    };
  }

  // Not started - check 14-day trial end date if set
  if (org.trialEndsAt) {
    const endMs = new Date(org.trialEndsAt).getTime();
    const nowMs = new Date(nowInput).getTime();
    if (nowMs < endMs) {
      return { entitled: true };
    }
    return {
      entitled: false,
      reason: 'Free trial expired. Active subscription required.',
    };
  }

  return { entitled: false, reason: 'An active subscription or unexpired trial is required.' };
}

export interface SeatLimitDecision {
  allowed: boolean;
  remaining: number;
  currentTotal: number;
}

export function evaluateSeatLimit(
  activeCount: number,
  pendingInviteCount: number,
  maxSeats: number = STARTER_MAX_TECHNICIANS
): SeatLimitDecision {
  const currentTotal = activeCount + pendingInviteCount;
  const remaining = Math.max(0, maxSeats - currentTotal);
  const allowed = currentTotal < maxSeats;

  return {
    allowed,
    remaining,
    currentTotal,
  };
}
