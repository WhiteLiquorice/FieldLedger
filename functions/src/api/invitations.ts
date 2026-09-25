import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore, type Transaction, type DocumentReference } from 'firebase-admin/firestore';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { authorizeOrganizationRequest } from '../security/authorize-request';
import { parseCallableData } from '../security/parse-callable-data';
import {
  canInviteRole,
  hashInvitationToken,
  validateInvitationAcceptance,
  validateMemberRoleChange,
  validateMemberRemoval,
  validateSeatLimit,
  type InvitationRole,
  type TeamRole,
} from '@compliance-saas/backend-core';

if (!getApps().length) initializeApp();

async function requireAvailableTechnicianSeat(transaction: Transaction, orgRef: DocumentReference) {
  const org = (await transaction.get(orgRef)).data();
  const active = await transaction.get(orgRef.collection('users').where('role', '==', 'technician').where('active', '==', true));
  const pending = await transaction.get(orgRef.collection('invitations').where('role', '==', 'technician').where('status', '==', 'pending'));
  const reserved = pending.docs.filter(doc => doc.data().expiresAtMs > Date.now()).length;
  if (!validateSeatLimit(active.size, reserved, Number(org?.maxTechnicians || 3)).allowed) {
    throw new HttpsError('resource-exhausted', 'Technician seat limit reached, including pending invitations.');
  }
}

const CreateInvitationSchema = z.object({
  orgId: z.string().min(1).max(128).regex(/^[^/]+$/),
  email: z.string().email(),
  role: z.enum(['manager', 'technician']),
}).strict();

export const createMemberInvitation = onCall(
  { region: 'us-central1', enforceAppCheck: true },
  async (request) => {
    const input = parseCallableData(CreateInvitationSchema, request.data);
    const actor = await authorizeOrganizationRequest(request, input.orgId, ['owner', 'manager']);

    const canInvite = canInviteRole(actor.role as TeamRole, input.role as InvitationRole);
    if (!canInvite.allowed) {
      throw new HttpsError('permission-denied', canInvite.reason || 'Cannot invite this role.');
    }

    const db = getFirestore();
    const normalizedEmail = input.email.trim().toLowerCase();
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = hashInvitationToken(rawToken);
    const invitationId = `inv-${randomBytes(12).toString('hex')}`;
    const expiresAtMs = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days

    await db.runTransaction(async (transaction) => {
      const orgRef = db.doc(`orgs/${input.orgId}`);
      const orgSnap = await transaction.get(orgRef);
      if (!orgSnap.exists) throw new HttpsError('not-found', 'Organization not found.');
      const orgData = orgSnap.data() || {};
      const maxTechnicians = Number(orgData.maxTechnicians || 3);

      // Check existing active members with this email
      const usersSnap = await transaction.get(
        orgRef.collection('users').where('email', '==', normalizedEmail).limit(1)
      );
      if (!usersSnap.empty && usersSnap.docs[0].data().active === true) {
        throw new HttpsError('already-exists', 'A member with this email is already enrolled in the organization.');
      }

      // Check existing live pending invitations for this email
      const liveInvSnap = await transaction.get(
        orgRef.collection('invitations')
          .where('email', '==', normalizedEmail)
          .where('status', '==', 'pending')
          .limit(1)
      );
      if (!liveInvSnap.empty) {
        const existing = liveInvSnap.docs[0].data();
        if (existing.expiresAtMs > Date.now()) {
          throw new HttpsError('already-exists', 'A pending invitation for this email address already exists.');
        }
      }

      // Enforce technician seat limit if inviting technician
      if (input.role === 'technician') {
        const activeTechs = await transaction.get(
          orgRef.collection('users')
            .where('role', '==', 'technician')
            .where('active', '==', true)
        );
        const pendingTechs = await transaction.get(
          orgRef.collection('invitations')
            .where('role', '==', 'technician')
            .where('status', '==', 'pending')
        );
        const validPending = pendingTechs.docs.filter((d) => d.data().expiresAtMs > Date.now()).length;
        const seatCheck = validateSeatLimit(activeTechs.size, validPending, maxTechnicians);
        if (!seatCheck.allowed) {
          throw new HttpsError('resource-exhausted', seatCheck.reason || 'Technician seat limit reached.');
        }
      }

      const invRef = orgRef.collection('invitations').doc(invitationId);
      const tokenLookupRef = db.collection('invitation_tokens').doc(tokenHash);

      transaction.set(tokenLookupRef, {
        orgId: input.orgId,
        invitationId,
        createdAt: FieldValue.serverTimestamp(),
      });

      transaction.set(invRef, {
        id: invitationId,
        orgId: input.orgId,
        email: normalizedEmail,
        role: input.role,
        tokenHash,
        status: 'pending',
        createdBy: actor.uid,
        createdAt: FieldValue.serverTimestamp(),
        createdAtMs: Date.now(),
        expiresAtMs,
      });
      transaction.update(orgRef, { seatRevision: FieldValue.increment(1) });
    });

    return {
      success: true,
      invitationId,
      token: rawToken,
      expiresAtMs,
    };
  }
);

const AcceptInvitationSchema = z.object({
  token: z.string().min(16).max(256),
}).strict();

export const acceptMemberInvitation = onCall(
  { region: 'us-central1', enforceAppCheck: true },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Authentication is required.');
    const input = parseCallableData(AcceptInvitationSchema, request.data);
    const db = getFirestore();
    const tokenHash = hashInvitationToken(input.token.trim());

    const tokenLookupRef = db.collection('invitation_tokens').doc(tokenHash);
    const tokenLookupSnap = await tokenLookupRef.get();
    if (!tokenLookupSnap.exists) {
      throw new HttpsError('not-found', 'Invalid or expired invitation token.');
    }

    const { orgId, invitationId } = tokenLookupSnap.data() as { orgId: string; invitationId: string };
    const invRef = db.doc(`orgs/${orgId}/invitations/${invitationId}`);
    const orgRef = db.doc(`orgs/${orgId}`);
    const userRef = orgRef.collection('users').doc(request.auth.uid);
    const identityRef = db.collection('account_workspaces').doc(request.auth.uid);

    let assignedRole: string = 'technician';

    await db.runTransaction(async (transaction) => {
      const invSnap = await transaction.get(invRef);
      if (!invSnap.exists) throw new HttpsError('not-found', 'Invitation record not found.');
      const invData = invSnap.data() as any;

      const identitySnap = await transaction.get(identityRef);
      const existingOrgId = identitySnap.exists ? identitySnap.data()?.orgId : null;

      const emailVerified = request.auth!.token.email_verified === true;
      const recipientEmail = request.auth!.token.email || '';
      const orgSnap = await transaction.get(orgRef);
      if (!orgSnap.exists) throw new HttpsError('not-found', 'Target organization not found.');
      const orgData = orgSnap.data() || {};
      if (orgData.disabled || ['pending_deletion', 'deleted'].includes(orgData.status)) throw new HttpsError('permission-denied', 'Workspace access has been suspended.');
      if (invData.status === 'accepted' && invData.acceptedBy === request.auth!.uid && existingOrgId === orgId) {
        const currentMember = (await transaction.get(userRef)).data();
        if (!emailVerified || currentMember?.active !== true) throw new HttpsError('permission-denied', 'An active membership and verified email are required.');
        assignedRole = currentMember.role;
        return;
      }

      const acceptanceCheck = validateInvitationAcceptance(invData, {
        email: recipientEmail,
        emailVerified,
        existingOrgId,
      });

      if (!acceptanceCheck.allowed) {
        throw new HttpsError('failed-precondition', acceptanceCheck.reason || 'Cannot accept invitation.');
      }

      const maxTechnicians = Number(orgData.maxTechnicians || 3);

      if (invData.role === 'technician') {
        const activeTechs = await transaction.get(
          orgRef.collection('users')
            .where('role', '==', 'technician')
            .where('active', '==', true)
        );
        if (activeTechs.size >= maxTechnicians) {
          throw new HttpsError('resource-exhausted', 'Organization technician seat limit reached.');
        }
      }

      assignedRole = invData.role;
      const now = FieldValue.serverTimestamp();

      transaction.set(identityRef, { orgId, userId: request.auth!.uid, role: assignedRole });
      transaction.set(userRef, {
        id: request.auth!.uid,
        userId: request.auth!.uid,
        orgId,
        email: invData.email,
        displayName: request.auth!.token.name || invData.email.split('@')[0],
        role: assignedRole,
        active: true,
        joinedViaInvitation: invitationId,
        createdAt: now,
        updatedAt: now,
      });

      transaction.update(invRef, {
        status: 'accepted',
        acceptedBy: request.auth!.uid,
        acceptedAt: now,
        acceptedAtMs: Date.now(),
      });
      transaction.update(orgRef, { seatRevision: FieldValue.increment(1) });

    });

    const auth = getAuth();
    const userRecord = await auth.getUser(request.auth.uid);
    await auth.setCustomUserClaims(request.auth.uid, { ...userRecord.customClaims, org_id: orgId, role: assignedRole });
    await tokenLookupRef.delete();

    return { success: true, orgId, role: assignedRole };
  }
);

const RevokeInvitationSchema = z.object({
  orgId: z.string().min(1).max(128).regex(/^[^/]+$/),
  invitationId: z.string().min(1).max(128).regex(/^[^/]+$/),
}).strict();

export const revokeMemberInvitation = onCall(
  { region: 'us-central1', enforceAppCheck: true },
  async (request) => {
    const input = parseCallableData(RevokeInvitationSchema, request.data);
    const actor = await authorizeOrganizationRequest(request, input.orgId, ['owner', 'manager']);
    const db = getFirestore();
    const invRef = db.doc(`orgs/${input.orgId}/invitations/${input.invitationId}`);

    await db.runTransaction(async (transaction) => {
      const snap = await transaction.get(invRef);
      if (!snap.exists) throw new HttpsError('not-found', 'Invitation not found.');
      const data = snap.data() || {};
      if (data.status !== 'pending') {
        throw new HttpsError('failed-precondition', `Invitation is already ${data.status}.`);
      }
      if (actor.role === 'manager' && data.role !== 'technician') {
        throw new HttpsError('permission-denied', 'Managers can only revoke technician invitations.');
      }

      transaction.update(invRef, {
        status: 'revoked',
        revokedBy: actor.uid,
        revokedAt: FieldValue.serverTimestamp(),
        revokedAtMs: Date.now(),
      });

      if (data.tokenHash) {
        transaction.delete(db.collection('invitation_tokens').doc(data.tokenHash));
      }
    });

    return { success: true };
  }
);

const UpdateRoleSchema = z.object({
  orgId: z.string().min(1).max(128).regex(/^[^/]+$/),
  userId: z.string().min(1).max(128).regex(/^[^/]+$/),
  role: z.enum(['owner', 'manager', 'technician', 'client']),
}).strict();

export const updateMemberRole = onCall(
  { region: 'us-central1', enforceAppCheck: true },
  async (request) => {
    const input = parseCallableData(UpdateRoleSchema, request.data);
    const actor = await authorizeOrganizationRequest(request, input.orgId, ['owner', 'manager']);
    const db = getFirestore();
    const memberRef = db.doc(`orgs/${input.orgId}/users/${input.userId}`);

    await db.runTransaction(async (transaction) => {
      const snap = await transaction.get(memberRef);
      if (!snap.exists) throw new HttpsError('not-found', 'Member not found in organization.');
      const member = snap.data() || {};

      const check = validateMemberRoleChange({
        actorId: actor.uid,
        actorRole: actor.role as TeamRole,
        targetUserId: input.userId,
        targetCurrentRole: member.role as TeamRole,
        newRole: input.role as TeamRole,
      });

      if (!check.allowed) {
        throw new HttpsError('permission-denied', check.reason || 'Cannot change member role.');
      }

      if (member.active === true && member.role !== 'technician' && input.role === 'technician') {
        await requireAvailableTechnicianSeat(transaction, db.doc(`orgs/${input.orgId}`));
      }

      transaction.update(memberRef, {
        role: input.role,
        updatedAt: FieldValue.serverTimestamp(),
      });

      const identityRef = db.collection('account_workspaces').doc(input.userId);
      transaction.set(identityRef, { orgId: input.orgId, userId: input.userId, role: input.role }, { merge: true });
      transaction.update(db.doc(`orgs/${input.orgId}`), { seatRevision: FieldValue.increment(1) });
    });

      const auth = getAuth();
      const userRecord = await auth.getUser(input.userId);
      await auth.setCustomUserClaims(input.userId, {
        ...userRecord.customClaims,
        org_id: input.orgId,
        role: input.role,
      });

    return { success: true };
  }
);

const SetActiveSchema = z.object({
  orgId: z.string().min(1).max(128).regex(/^[^/]+$/),
  userId: z.string().min(1).max(128).regex(/^[^/]+$/),
  active: z.boolean(),
}).strict();

export const setMemberActive = onCall(
  { region: 'us-central1', enforceAppCheck: true },
  async (request) => {
    const input = parseCallableData(SetActiveSchema, request.data);
    const actor = await authorizeOrganizationRequest(request, input.orgId, ['owner', 'manager']);
    const db = getFirestore();
    const memberRef = db.doc(`orgs/${input.orgId}/users/${input.userId}`);

    await db.runTransaction(async (transaction) => {
      const snap = await transaction.get(memberRef);
      if (!snap.exists) throw new HttpsError('not-found', 'Member not found.');
      const member = snap.data() || {};

      if (actor.role === 'owner' && input.userId === actor.uid && input.active === false) {
        throw new HttpsError('failed-precondition', 'Owners cannot deactivate themselves.');
      }
      if (actor.role === 'manager' && ['owner', 'manager'].includes(member.role)) {
        throw new HttpsError('permission-denied', 'Managers cannot modify active state of owners or managers.');
      }

      if (input.active && member.active !== true && member.role === 'technician') {
        await requireAvailableTechnicianSeat(transaction, db.doc(`orgs/${input.orgId}`));
      }

      transaction.update(memberRef, {
        active: input.active,
        updatedAt: FieldValue.serverTimestamp(),
      });
      transaction.update(db.doc(`orgs/${input.orgId}`), { seatRevision: FieldValue.increment(1) });
    });

    return { success: true };
  }
);

const RemoveMemberSchema = z.object({
  orgId: z.string().min(1).max(128).regex(/^[^/]+$/),
  userId: z.string().min(1).max(128).regex(/^[^/]+$/),
}).strict();

export const removeOrganizationMember = onCall(
  { region: 'us-central1', enforceAppCheck: true },
  async (request) => {
    const input = parseCallableData(RemoveMemberSchema, request.data);
    const actor = await authorizeOrganizationRequest(request, input.orgId, ['owner', 'manager']);
    const db = getFirestore();
    const memberRef = db.doc(`orgs/${input.orgId}/users/${input.userId}`);
    const identityRef = db.collection('account_workspaces').doc(input.userId);

    await db.runTransaction(async (transaction) => {
      const snap = await transaction.get(memberRef);
      if (!snap.exists) throw new HttpsError('not-found', 'Member not found.');
      const member = snap.data() || {};

      const check = validateMemberRemoval({
        actorId: actor.uid,
        actorRole: actor.role as TeamRole,
        targetUserId: input.userId,
        targetCurrentRole: member.role as TeamRole,
      });

      if (!check.allowed) {
        throw new HttpsError('permission-denied', check.reason || 'Cannot remove member.');
      }

      transaction.delete(memberRef);
      transaction.delete(identityRef);
    });

      const auth = getAuth();
      const userRecord = await auth.getUser(input.userId);
      const claims = { ...userRecord.customClaims };
      delete claims.org_id;
      delete claims.role;
      await auth.setCustomUserClaims(input.userId, claims);

    return { success: true };
  }
);
