import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  DEFAULT_VERTICAL_CONFIGS,
  VerticalWorkflowConfigSchema,
  calculateNextServiceDue,
  canAccessOrganization,
  summarizeServiceOutcome,
} from '../src';
import { evaluateOrganizationAccess } from '../../../functions/src/security/authorization-policy';

describe('production workflow contracts', () => {
  it('ships a valid, configurable workflow for every supported vertical', () => {
    expect(Object.keys(DEFAULT_VERTICAL_CONFIGS).sort()).toEqual([
      'extinguisher',
      'grease_trap',
      'hood_cleaning',
    ]);

    for (const config of Object.values(DEFAULT_VERTICAL_CONFIGS)) {
      expect(VerticalWorkflowConfigSchema.safeParse(config).success).toBe(true);
      expect(config.checklist.length).toBeGreaterThanOrEqual(4);
      expect(config.schedule.allowTechnicianOverride).toBe(true);
      expect(config.report.claimMode).toBe('service_record');
      expect(config.report.disclaimer.length).toBeGreaterThan(20);
    }
  });

  it('calculates configurable day, month, and year schedules without assuming a legal interval', () => {
    expect(
      calculateNextServiceDue('2026-01-01T00:00:00.000Z', { unit: 'days', interval: 45 })
    ).toContain('2026-02-15');
    expect(
      calculateNextServiceDue('2026-01-31T00:00:00.000Z', { unit: 'months', interval: 2 })
    ).toContain('2026-03-31');
    expect(
      calculateNextServiceDue('2024-02-29T00:00:00.000Z', { unit: 'years', interval: 1 })
    ).toContain('2025-02-28');
  });

  it('summarizes service outcomes without certifying legal compliance', () => {
    expect(summarizeServiceOutcome(12, 0, 0)).toBe('completed_no_exceptions');
    expect(summarizeServiceOutcome(12, 2, 0)).toBe('completed_with_exceptions');
    expect(summarizeServiceOutcome(12, 0, 1)).toBe('incomplete');
  });
});

describe('tenant authorization contract', () => {
  it('excludes external clients from operator callables unless explicitly scoped', () => {
    const principal = { uid: 'client-a' };
    const membership = { userId: 'client-a', orgId: 'org-a', role: 'client' as const, active: true };
    expect(evaluateOrganizationAccess(principal, 'org-a', membership))
      .toEqual({ allowed: false, reason: 'insufficient_role' });
    expect(evaluateOrganizationAccess(principal, 'org-a', membership, ['client']))
      .toEqual({ allowed: true, role: 'client' });
  });

  it('rejects a signed-in user who has no membership in the requested organization', () => {
    expect(
      canAccessOrganization(
        { uid: 'user-a', tokenOrgId: 'org-a' },
        'org-b',
        null
      )
    ).toBe(false);
  });

  it('accepts an active membership but rejects disabled or mismatched membership documents', () => {
    expect(
      canAccessOrganization(
        { uid: 'user-a' },
        'org-b',
        { userId: 'user-a', orgId: 'org-b', role: 'technician', active: true }
      )
    ).toBe(true);

    expect(
      canAccessOrganization(
        { uid: 'user-a' },
        'org-b',
        { userId: 'user-a', orgId: 'org-b', role: 'technician', active: false }
      )
    ).toBe(false);

    expect(
      canAccessOrganization(
        { uid: 'user-a' },
        'org-b',
        { userId: 'user-c', orgId: 'org-b', role: 'owner', active: true }
      )
    ).toBe(false);
  });

  it('enforces required roles for privileged callable operations', () => {
    expect(
      evaluateOrganizationAccess(
        { uid: 'user-a', tokenOrgId: undefined },
        'org-b',
        { userId: 'user-a', orgId: 'org-b', role: 'technician', active: true },
        ['owner', 'manager']
      )
    ).toEqual({ allowed: false, reason: 'insufficient_role' });

    expect(
      evaluateOrganizationAccess(
        { uid: 'user-a', tokenOrgId: undefined },
        'org-b',
        { userId: 'user-a', orgId: 'org-b', role: 'manager', active: true },
        ['owner', 'manager']
      )
    ).toEqual({ allowed: true, role: 'manager' });
  });

  it('treats the current membership document as authoritative over stale token claims', () => {
    expect(
      evaluateOrganizationAccess(
        { uid: 'user-a', tokenOrgId: 'org-b', tokenRole: 'owner' },
        'org-b',
        { userId: 'user-a', orgId: 'org-b', role: 'owner', active: false },
        ['owner', 'manager']
      )
    ).toEqual({ allowed: false, reason: 'inactive_membership' });
  });
});

describe('firestore policy guardrails', () => {
  const rules = readFileSync(resolve(process.cwd(), '../../firestore.rules'), 'utf8');

  it('does not allow users to self-enroll into arbitrary organizations', () => {
    expect(rules).not.toContain('(isSignedIn() && request.auth.uid == userId)');
  });

  it('reserves generated records and reports for trusted server writes', () => {
    expect(rules).toContain('match /reports/{reportId}');
    expect(rules).toContain('allow write: if false;');
    expect(rules).toContain('match /workflow_configs/{verticalId}');
  });

  it('locks the organization vertical and billing state from browser writes', () => {
    expect(rules).toContain("hasOnly(['name', 'branding', 'updatedAt'])");
  });

  it('restricts vertical-specific records to the organization vertical', () => {
    expect(rules).toContain('organizationVertical(orgId)');
    expect(rules).toContain('resource.data.vertical == organizationVertical(orgId)');
  });
});

describe('billing release guardrails', () => {
  const checkout = readFileSync(resolve(process.cwd(), '../../functions/src/api/createStripeCheckoutSession.ts'), 'utf8');
  const webhook = readFileSync(resolve(process.cwd(), '../../functions/src/webhooks/stripeWebhook.ts'), 'utf8');

  it('requires deployed Stripe configuration instead of shipping a fallback price', () => {
    expect(checkout).toContain("defineString('STRIPE_STARTER_PRICE_ID', { default: '' })");
    // Configuration rejection before side effects is exercised by the Functions handler tests.
    expect(checkout).not.toMatch(/price_[A-Za-z0-9]+/);
    expect(checkout).toContain('already has a Stripe subscription');
  });

  it('requires signed, retry-safe Stripe webhook processing', () => {
    expect(webhook).toContain('constructEvent(req.rawBody, signature, signingSecret)');
    expect(webhook).toContain("status: 'completed'");
    expect(webhook).toContain('processingStartedAtMs');
    expect(webhook).toContain('res.status(409)');
  });
});
