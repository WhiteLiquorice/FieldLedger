import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  canInviteRole,
  hashInvitationToken,
  validateInvitationAcceptance,
  validateMemberRoleChange,
  validateMemberRemoval,
  validateSeatLimit,
} from '@compliance-saas/backend-core';

test('invitations: canInviteRole permissions', () => {
  assert.equal(canInviteRole('owner', 'manager').allowed, true);
  assert.equal(canInviteRole('owner', 'technician').allowed, true);
  assert.equal(canInviteRole('owner', 'client').allowed, false);
  assert.equal(canInviteRole('owner', 'owner').allowed, false);

  assert.equal(canInviteRole('manager', 'technician').allowed, true);
  assert.equal(canInviteRole('manager', 'manager').allowed, false);
  assert.equal(canInviteRole('manager', 'owner').allowed, false);

  assert.equal(canInviteRole('technician', 'technician').allowed, false);
  assert.equal(canInviteRole('client', 'client').allowed, false);
});

test('invitations: token hashing is deterministic and produces SHA-256 hex', () => {
  const token = 'sample-invitation-token-12345';
  const hash1 = hashInvitationToken(token);
  const hash2 = hashInvitationToken(token);
  assert.equal(hash1, hash2);
  assert.equal(hash1.length, 64);
  assert.match(hash1, /^[0-9a-f]{64}$/);
});

test('invitations: validateInvitationAcceptance rejects invalid states', () => {
  const now = Date.now();
  const validInvitation = {
    id: 'inv-1',
    orgId: 'org-1',
    email: 'newtech@example.com',
    role: 'technician',
    status: 'pending',
    expiresAtMs: now + 86400000,
  };

  // Valid
  const resValid = validateInvitationAcceptance(validInvitation, {
    email: 'newtech@example.com',
    emailVerified: true,
    existingOrgId: null,
  });
  assert.equal(resValid.allowed, true);

  // Email mismatch
  const resMismatch = validateInvitationAcceptance(validInvitation, {
    email: 'wrong@example.com',
    emailVerified: true,
    existingOrgId: null,
  });
  assert.equal(resMismatch.allowed, false);
  assert.match(resMismatch.reason, /This invitation was sent to a different email address/);

  // Expired
  const expiredInvitation = {
    ...validInvitation,
    expiresAtMs: now - 1000,
  };
  const resExpired = validateInvitationAcceptance(expiredInvitation, {
    email: 'newtech@example.com',
    emailVerified: true,
    existingOrgId: null,
  });
  assert.equal(resExpired.allowed, false);
  assert.match(resExpired.reason, /has expired/);

  // Revoked
  const revokedInvitation = { ...validInvitation, status: 'revoked' };
  const resRevoked = validateInvitationAcceptance(revokedInvitation, {
    email: 'newtech@example.com',
    emailVerified: true,
    existingOrgId: null,
  });
  assert.equal(resRevoked.allowed, false);
  assert.match(resRevoked.reason, /revoked/);
});

test('invitations: seat limits enforced for technicians', () => {
  // Free trial limit is 3 technicians. 2 active + 0 pending < 3: allowed
  assert.equal(validateSeatLimit(2, 0, 3).allowed, true);
  // 2 active + 1 pending == 3: reached max
  assert.equal(validateSeatLimit(2, 1, 3).allowed, false);
  assert.match(validateSeatLimit(2, 1, 3).reason, /Plan technician seat limit reached/);
  // 3 active + 0 pending == 3: reached max
  assert.equal(validateSeatLimit(3, 0, 3).allowed, false);
});

test('invitations: validateMemberRoleChange prevents unauthorized demotions', () => {
  // Owner changing technician to manager: allowed
  assert.equal(
    validateMemberRoleChange({
      actorId: 'owner-1',
      actorRole: 'owner',
      targetUserId: 'tech-1',
      targetCurrentRole: 'technician',
      newRole: 'manager',
    }).allowed,
    true
  );

  // Manager demoting another manager: denied
  assert.equal(
    validateMemberRoleChange({
      actorId: 'mgr-1',
      actorRole: 'manager',
      targetUserId: 'mgr-2',
      targetCurrentRole: 'manager',
      newRole: 'technician',
    }).allowed,
    false
  );

  // Manager demoting owner: denied
  assert.equal(
    validateMemberRoleChange({
      actorId: 'mgr-1',
      actorRole: 'manager',
      targetUserId: 'owner-1',
      targetCurrentRole: 'owner',
      newRole: 'technician',
    }).allowed,
    false
  );

  // Owner demoting self: denied
  assert.equal(
    validateMemberRoleChange({
      actorId: 'owner-1',
      actorRole: 'owner',
      targetUserId: 'owner-1',
      targetCurrentRole: 'owner',
      newRole: 'technician',
    }).allowed,
    false
  );
});

test('invitations: validateMemberRemoval protects tenant ownership and self-removal', () => {
  // Owner removing technician: allowed
  assert.equal(
    validateMemberRemoval({
      actorId: 'owner-1',
      actorRole: 'owner',
      targetUserId: 'tech-1',
      targetCurrentRole: 'technician',
    }).allowed,
    true
  );

  // Manager removing another manager: denied
  assert.equal(
    validateMemberRemoval({
      actorId: 'mgr-1',
      actorRole: 'manager',
      targetUserId: 'mgr-2',
      targetCurrentRole: 'manager',
    }).allowed,
    false
  );

  // Owner removing self: denied
  assert.equal(
    validateMemberRemoval({
      actorId: 'owner-1',
      actorRole: 'owner',
      targetUserId: 'owner-1',
      targetCurrentRole: 'owner',
    }).allowed,
    false
  );
});
