export type CallableRole = 'owner' | 'manager' | 'technician' | 'client';

export interface CallablePrincipal {
  uid: string;
  tokenOrgId?: string;
  tokenRole?: CallableRole;
}

export interface CallableMembership {
  userId: string;
  orgId: string;
  role: CallableRole;
  active: boolean;
}

export type AccessDecision =
  | { allowed: true; role: CallableRole }
  | { allowed: false; reason: 'not_a_member' | 'inactive_membership' | 'membership_mismatch' | 'insufficient_role' };

export function evaluateOrganizationAccess(
  principal: CallablePrincipal,
  requestedOrgId: string,
  membership: CallableMembership | null,
  allowedRoles: CallableRole[] = ['owner', 'manager', 'technician']
): AccessDecision {
  if (!membership) return { allowed: false, reason: 'not_a_member' };
  if (!membership.active) return { allowed: false, reason: 'inactive_membership' };
  if (membership.userId !== principal.uid || membership.orgId !== requestedOrgId) {
    return { allowed: false, reason: 'membership_mismatch' };
  }
  if (!allowedRoles.includes(membership.role)) return { allowed: false, reason: 'insufficient_role' };
  return { allowed: true, role: membership.role };
}
