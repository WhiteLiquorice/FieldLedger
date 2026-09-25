import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  canRequestWorkspaceDeletion,
  buildWorkspaceDeletionRecord,
  validateCompanyProfile,
} from '@compliance-saas/backend-core';
import { evaluateOrganizationAccess } from '../lib/security/authorization-policy.js';

test('account-lifecycle: deletion requires owner role', () => {
  const principalTech = { uid: 'user-tech' };
  const techMember = { userId: 'user-tech', orgId: 'org-1', role: 'technician', active: true };
  assert.equal(evaluateOrganizationAccess(principalTech, 'org-1', techMember, ['owner']).allowed, false);

  const principalMgr = { uid: 'user-mgr' };
  const mgrMember = { userId: 'user-mgr', orgId: 'org-1', role: 'manager', active: true };
  assert.equal(evaluateOrganizationAccess(principalMgr, 'org-1', mgrMember, ['owner']).allowed, false);

  const principalOwner = { uid: 'user-owner' };
  const ownerMember = { userId: 'user-owner', orgId: 'org-1', role: 'owner', active: true };
  assert.equal(evaluateOrganizationAccess(principalOwner, 'org-1', ownerMember, ['owner']).allowed, true);
});

test('account-lifecycle: prevents workspace deletion while subscription is active', () => {
  const activeOrg = { status: 'active', subscriptionStatus: 'active' };
  const decision = canRequestWorkspaceDeletion(activeOrg);
  assert.equal(decision.canDelete, false);
  assert.match(decision.reason, /Active subscription must be canceled/);

  const trialingOrg = { status: 'active', subscriptionStatus: 'trialing' };
  assert.equal(canRequestWorkspaceDeletion(trialingOrg).canDelete, false);

  const canceledOrg = { status: 'active', subscriptionStatus: 'canceled' };
  assert.equal(canRequestWorkspaceDeletion(canceledOrg).canDelete, true);
});

test('account-lifecycle: company profile requires complete verifiable business data', () => {
  const incomplete = {
    companyName: 'Fire Safe Co',
    vertical: 'extinguisher',
    phone: '',
    address: '123 Main St',
    city: 'Phoenix',
    state: 'AZ',
    zip: '85001',
  };
  assert.throws(() => validateCompanyProfile(incomplete), /Valid phone number is required/);

  const complete = {
    ...incomplete,
    phone: '602-555-0199',
    licenseNumber: 'AZ-ROC-123456',
  };
  const validated = validateCompanyProfile(complete);
  assert.equal(validated.companyName, 'Fire Safe Co');
  assert.equal(validated.licenseNumber, 'AZ-ROC-123456');
});
