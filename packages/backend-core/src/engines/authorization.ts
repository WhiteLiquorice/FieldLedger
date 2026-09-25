import type { UserRole } from '../types/auth';

export interface AuthenticatedPrincipal {
  uid: string;
  tokenOrgId?: string;
}

export interface OrganizationMembership {
  userId: string;
  orgId: string;
  role: UserRole;
  active: boolean;
}

export function canAccessOrganization(
  principal: AuthenticatedPrincipal,
  requestedOrgId: string,
  membership: OrganizationMembership | null
): boolean {
  if (!principal.uid || !requestedOrgId) return false;
  if (principal.tokenOrgId === requestedOrgId) return true;

  return Boolean(
    membership?.active &&
      membership.userId === principal.uid &&
      membership.orgId === requestedOrgId
  );
}

export function canManageOrganization(membership: OrganizationMembership | null): boolean {
  return Boolean(membership?.active && (membership.role === 'owner' || membership.role === 'manager'));
}

