import { describe, expect, it } from 'vitest';
import {
  canInviteRole,
  hashInvitationToken,
  validateInvitationAcceptance,
  validateMemberRoleChange,
  validateMemberRemoval,
} from '../src/engines/invitations';

describe('invitations and team management contracts (M1)', () => {
  it('enforces role invitation permissions', () => {
    // Owner can invite manager or technician
    expect(canInviteRole('owner', 'manager').allowed).toBe(true);
    expect(canInviteRole('owner', 'technician').allowed).toBe(true);
    expect(canInviteRole('owner', 'owner' as any).allowed).toBe(false);

    // Manager can invite technician only
    expect(canInviteRole('manager', 'technician').allowed).toBe(true);
    expect(canInviteRole('manager', 'manager').allowed).toBe(false);
    expect(canInviteRole('manager', 'owner' as any).allowed).toBe(false);

    // Technician cannot invite anyone
    expect(canInviteRole('technician', 'technician').allowed).toBe(false);
    expect(canInviteRole('technician', 'manager').allowed).toBe(false);
  });

  it('hashes invitation tokens securely with SHA-256 and never returns raw token in hash', () => {
    const rawToken = 'test-token-12345678901234567890123456789012';
    const hash = hashInvitationToken(rawToken);
    expect(hash).toHaveLength(64); // 256-bit hex
    expect(hash).not.toContain(rawToken);
    expect(hashInvitationToken(rawToken)).toBe(hash); // Deterministic
  });

  it('validates invitation acceptance preconditions', () => {
    const now = Date.now();
    const invitation = {
      id: 'inv-1',
      orgId: 'org-1',
      email: 'tech@example.com',
      role: 'technician' as const,
      status: 'pending' as const,
      expiresAtMs: now + 86400000,
    };

    // Correct email and verified
    expect(
      validateInvitationAcceptance(invitation, {
        email: 'tech@example.com',
        emailVerified: true,
        existingOrgId: null,
      }).allowed
    ).toBe(true);

    // Email case insensitive match
    expect(
      validateInvitationAcceptance(invitation, {
        email: 'TECH@example.COM',
        emailVerified: true,
        existingOrgId: null,
      }).allowed
    ).toBe(true);

    // Wrong email
    expect(
      validateInvitationAcceptance(invitation, {
        email: 'other@example.com',
        emailVerified: true,
        existingOrgId: null,
      }).allowed
    ).toBe(false);

    // Unverified email
    const unverified = validateInvitationAcceptance(invitation, {
      email: 'tech@example.com',
      emailVerified: false,
      existingOrgId: null,
    });
    expect(unverified.allowed).toBe(false);
    expect(unverified.reason).toMatch(/verified/i);

    // User already in an organization
    const existingOrg = validateInvitationAcceptance(invitation, {
      email: 'tech@example.com',
      emailVerified: true,
      existingOrgId: 'other-org',
    });
    expect(existingOrg.allowed).toBe(false);
    expect(existingOrg.reason).toMatch(/already attached/i);

    // Expired invitation
    const expiredInv = { ...invitation, expiresAtMs: now - 1000 };
    expect(
      validateInvitationAcceptance(expiredInv, {
        email: 'tech@example.com',
        emailVerified: true,
        existingOrgId: null,
      }).allowed
    ).toBe(false);

    // Revoked invitation
    const revokedInv = { ...invitation, status: 'revoked' as const };
    expect(
      validateInvitationAcceptance(revokedInv, {
        email: 'tech@example.com',
        emailVerified: true,
        existingOrgId: null,
      }).allowed
    ).toBe(false);
  });

  it('prohibits owner from demoting or disabling self', () => {
    expect(
      validateMemberRoleChange({
        actorId: 'owner-1',
        actorRole: 'owner',
        targetUserId: 'owner-1',
        targetCurrentRole: 'owner',
        newRole: 'technician',
      }).allowed
    ).toBe(false);

    // Manager cannot change owner or manager role
    expect(
      validateMemberRoleChange({
        actorId: 'mgr-1',
        actorRole: 'manager',
        targetUserId: 'owner-1',
        targetCurrentRole: 'owner',
        newRole: 'technician',
      }).allowed
    ).toBe(false);

    expect(
      validateMemberRoleChange({
        actorId: 'mgr-1',
        actorRole: 'manager',
        targetUserId: 'mgr-2',
        targetCurrentRole: 'manager',
        newRole: 'technician',
      }).allowed
    ).toBe(false);

    // Owner can change manager to technician
    expect(
      validateMemberRoleChange({
        actorId: 'owner-1',
        actorRole: 'owner',
        targetUserId: 'mgr-2',
        targetCurrentRole: 'manager',
        newRole: 'technician',
      }).allowed
    ).toBe(true);
  });

  it('prohibits owner from removing self from organization', () => {
    expect(
      validateMemberRemoval({
        actorId: 'owner-1',
        actorRole: 'owner',
        targetUserId: 'owner-1',
        targetCurrentRole: 'owner',
      }).allowed
    ).toBe(false);

    // Manager cannot remove owner or other manager
    expect(
      validateMemberRemoval({
        actorId: 'mgr-1',
        actorRole: 'manager',
        targetUserId: 'owner-1',
        targetCurrentRole: 'owner',
      }).allowed
    ).toBe(false);

    expect(
      validateMemberRemoval({
        actorId: 'mgr-1',
        actorRole: 'manager',
        targetUserId: 'mgr-2',
        targetCurrentRole: 'manager',
      }).allowed
    ).toBe(false);

    // Manager can remove technician
    expect(
      validateMemberRemoval({
        actorId: 'mgr-1',
        actorRole: 'manager',
        targetUserId: 'tech-1',
        targetCurrentRole: 'technician',
      }).allowed
    ).toBe(true);
  });
});
