import { createHash } from 'node:crypto';

export type TeamRole = 'owner' | 'manager' | 'technician' | 'client';
export type InvitationRole = 'manager' | 'technician';
export type InvitationStatus = 'pending' | 'accepted' | 'revoked' | 'expired';

export interface MemberInvitation {
  id: string;
  orgId: string;
  email: string;
  role: InvitationRole;
  tokenHash?: string;
  status: InvitationStatus;
  createdBy?: string;
  createdAtMs?: number;
  expiresAtMs: number;
  acceptedBy?: string;
  acceptedAtMs?: number;
  revokedBy?: string;
  revokedAtMs?: number;
}

export function canInviteRole(
  actorRole: TeamRole,
  targetRole: InvitationRole
): { allowed: boolean; reason?: string } {
  if (actorRole === 'owner') {
    if (targetRole === 'manager' || targetRole === 'technician') {
      return { allowed: true };
    }
    return { allowed: false, reason: 'Owners can invite managers or technicians only.' };
  }

  if (actorRole === 'manager') {
    if (targetRole === 'technician') {
      return { allowed: true };
    }
    return { allowed: false, reason: 'Managers can only invite technicians.' };
  }

  return { allowed: false, reason: 'Technicians and clients cannot invite members.' };
}

export function hashInvitationToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}

export interface AcceptanceRecipient {
  email?: string | null;
  emailVerified?: boolean;
  existingOrgId?: string | null;
}

export function validateInvitationAcceptance(
  invitation: MemberInvitation,
  recipient: AcceptanceRecipient
): { allowed: boolean; reason?: string } {
  if (!recipient.email || !recipient.emailVerified) {
    return { allowed: false, reason: 'A verified email address is required to accept an invitation.' };
  }

  if (recipient.existingOrgId) {
    return { allowed: false, reason: 'This account is already attached to an organization.' };
  }

  if (invitation.status === 'revoked') {
    return { allowed: false, reason: 'This invitation has been revoked.' };
  }

  if (invitation.status === 'accepted') {
    return { allowed: false, reason: 'This invitation has already been used.' };
  }

  if (invitation.status !== 'pending' || Date.now() > invitation.expiresAtMs) {
    return { allowed: false, reason: 'This invitation has expired.' };
  }

  const normalizedInvEmail = invitation.email.trim().toLowerCase();
  const normalizedRecEmail = recipient.email.trim().toLowerCase();
  if (normalizedInvEmail !== normalizedRecEmail) {
    return { allowed: false, reason: 'This invitation was sent to a different email address.' };
  }

  return { allowed: true };
}

export function validateMemberRoleChange({
  actorId,
  actorRole,
  targetUserId,
  targetCurrentRole,
  newRole,
}: {
  actorId: string;
  actorRole: TeamRole;
  targetUserId: string;
  targetCurrentRole: TeamRole;
  newRole: TeamRole;
}): { allowed: boolean; reason?: string } {
  if (actorRole === 'owner') {
    if (actorId === targetUserId && newRole !== 'owner') {
      return { allowed: false, reason: 'Owners cannot demote themselves.' };
    }
    return { allowed: true };
  }

  if (actorRole === 'manager') {
    if (targetCurrentRole === 'owner' || targetCurrentRole === 'manager') {
      return { allowed: false, reason: 'Managers cannot change roles of owners or managers.' };
    }
    if (newRole === 'owner' || newRole === 'manager') {
      return { allowed: false, reason: 'Managers cannot promote users to owner or manager.' };
    }
    return { allowed: true };
  }

  return { allowed: false, reason: 'Insufficient permissions to change member roles.' };
}

export function validateMemberRemoval({
  actorId,
  actorRole,
  targetUserId,
  targetCurrentRole,
}: {
  actorId: string;
  actorRole: TeamRole;
  targetUserId: string;
  targetCurrentRole: TeamRole;
}): { allowed: boolean; reason?: string } {
  if (actorRole === 'owner') {
    if (actorId === targetUserId) {
      return { allowed: false, reason: 'Owners cannot remove themselves from their organization.' };
    }
    return { allowed: true };
  }

  if (actorRole === 'manager') {
    if (targetCurrentRole === 'owner' || targetCurrentRole === 'manager') {
      return { allowed: false, reason: 'Managers cannot remove owners or other managers.' };
    }
    if (targetCurrentRole === 'technician' || targetCurrentRole === 'client') {
      return { allowed: true };
    }
  }

  return { allowed: false, reason: 'Insufficient permissions to remove members.' };
}

export function validateSeatLimit(
  activeTechCount: number,
  pendingTechInviteCount: number,
  maxTechnicians: number
): { allowed: boolean; currentTotal: number; max: number; reason?: string } {
  const currentTotal = activeTechCount + pendingTechInviteCount;
  if (currentTotal >= maxTechnicians) {
    return {
      allowed: false,
      currentTotal,
      max: maxTechnicians,
      reason: `Plan technician seat limit reached (${currentTotal} of ${maxTechnicians} used). Upgrade plan to invite more technicians.`,
    };
  }

  return {
    allowed: true,
    currentTotal,
    max: maxTechnicians,
  };
}
