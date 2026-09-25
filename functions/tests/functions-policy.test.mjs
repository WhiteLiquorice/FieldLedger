import assert from 'node:assert/strict';
import { test } from 'node:test';
import { evaluateOrganizationAccess } from '../lib/security/authorization-policy.js';
import { validateCompletion } from '../lib/jobs/completion-policy.js';
import { subscriptionSnapshot } from '../lib/billing/subscription-policy.js';
import { DEFAULT_VERTICAL_CONFIGS } from '../lib/jobs/default-workflows.js';

test('hood completion requires distinct before and after photographs, with explained exceptions', () => {
  const result = { assetId: 'hood-1', outcome: 'completed', checklist: { before_photos: true, after_photos: true }, photoUrls: [] };
  assert.throws(() => validateCompletion([result], ['hood-1'], [], 'hood_cleaning'), /before and after photographs/i);
  const valid = { ...result, photoUrls: ['before-url', 'after-url'], checklist: { photo_label_0: 'Before', photo_label_1: 'After' } };
  assert.equal(validateCompletion([valid], ['hood-1'], [], 'hood_cleaning').length, 1);
  assert.throws(() => validateCompletion([{ ...valid, photoUrls: ['same', 'same'] }], ['hood-1'], [], 'hood_cleaning'), /duplicate/i);
  assert.throws(() => validateCompletion([{ ...result, outcome: 'exception' }], ['hood-1'], [], 'hood_cleaning'), /describe/i);
  assert.equal(validateCompletion([{ ...result, outcome: 'exception', notes: 'Roof locked; inaccessible duct photographed at access door.' }], ['hood-1'], [], 'hood_cleaning').length, 1);
});

test('functions: completion policy requires all expected assets', () => {
  const assets = ['asset-1', 'asset-2'];
  const requiredChecklist = ['inspect', 'clean'];

  const validResults = [
    { assetId: 'asset-1', outcome: 'completed', checklist: { inspect: true, clean: true } },
    { assetId: 'asset-2', outcome: 'completed', checklist: { inspect: true, clean: true } },
  ];

  const parsed = validateCompletion(validResults, assets, requiredChecklist);
  assert.equal(parsed.length, 2);

  // Missing an asset
  const missingAssetResults = [
    { assetId: 'asset-1', outcome: 'completed', checklist: { inspect: true, clean: true } },
  ];
  assert.throws(
    () => validateCompletion(missingAssetResults, assets, requiredChecklist),
    /Record an outcome for every asset at this site/
  );
});

test('functions: completion policy enforces required checklist items', () => {
  const assets = ['asset-1'];
  const requiredChecklist = ['inspect', 'clean'];

  const incompleteChecklist = [
    { assetId: 'asset-1', outcome: 'completed', checklist: { inspect: true } },
  ];
  assert.throws(
    () => validateCompletion(incompleteChecklist, assets, requiredChecklist),
    /Complete required checks or record an exception/
  );
});

test('functions: authorization policy excludes un-enrolled or inactive users', () => {
  const principal = { uid: 'user-1' };
  assert.equal(evaluateOrganizationAccess(principal, 'org-1', null).allowed, false);

  const inactive = { userId: 'user-1', orgId: 'org-1', role: 'technician', active: false };
  assert.equal(evaluateOrganizationAccess(principal, 'org-1', inactive).allowed, false);

  const active = { userId: 'user-1', orgId: 'org-1', role: 'technician', active: true };
  assert.equal(evaluateOrganizationAccess(principal, 'org-1', active).allowed, true);
});

test('functions: authorization policy enforces role requirements', () => {
  const principal = { uid: 'user-tech' };
  const tech = { userId: 'user-tech', orgId: 'org-1', role: 'technician', active: true };

  assert.equal(
    evaluateOrganizationAccess(principal, 'org-1', tech, ['owner', 'manager']).allowed,
    false
  );

  const manager = { userId: 'user-mgr', orgId: 'org-1', role: 'manager', active: true };
  assert.equal(
    evaluateOrganizationAccess({ uid: 'user-mgr' }, 'org-1', manager, ['owner', 'manager']).allowed,
    true
  );
});

test('functions: subscription snapshot maps Stripe status accurately', () => {
  const mockStripeSub = (status, periodEnd) => ({
    id: 'sub_123',
    customer: 'cus_123',
    status,
    current_period_end: periodEnd,
    metadata: { organizationId: 'org-1' },
    items: { data: [{ price: { id: 'price_starter' } }] },
  });

  const activeSnap = subscriptionSnapshot(mockStripeSub('active', 1800000000));
  assert.equal(activeSnap.subscriptionStatus, 'active');
  assert.equal(activeSnap.stripeSubscriptionId, 'sub_123');

  const trialingSnap = subscriptionSnapshot(mockStripeSub('trialing', 1800000000));
  assert.equal(trialingSnap.subscriptionStatus, 'trialing');

  const pastDueSnap = subscriptionSnapshot(mockStripeSub('past_due', 1800000000));
  assert.equal(pastDueSnap.subscriptionStatus, 'past_due');

  const canceledSnap = subscriptionSnapshot(mockStripeSub('canceled', 1800000000));
  assert.equal(canceledSnap.subscriptionStatus, 'canceled');
});

test('functions: default workflows maintain service_record claim mode and disclaimers', () => {
  for (const [vertical, config] of Object.entries(DEFAULT_VERTICAL_CONFIGS)) {
    assert.equal(config.vertical, vertical);
    assert.equal(config.report.claimMode, 'service_record');
    assert.ok(config.report.disclaimer.length > 20);
    assert.ok(config.checklist.length >= 4);
  }
});
