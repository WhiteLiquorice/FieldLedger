import { CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { evaluateEntitlement } from '@compliance-saas/backend-core';
import {
  CallableMembership,
  CallableRole,
  evaluateOrganizationAccess,
} from './authorization-policy';

export interface AuthorizedOrganizationRequest {
  uid: string;
  orgId: string;
  role: CallableRole;
}

export async function authorizeOrganizationRequest(
  request: CallableRequest<unknown>,
  orgId: string,
  allowedRoles?: CallableRole[],
  requireEntitlement = true
): Promise<AuthorizedOrganizationRequest> {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentication is required.');
  if (!orgId) throw new HttpsError('invalid-argument', 'A valid organization ID is required.');
  if (orgId.includes('/')) throw new HttpsError('invalid-argument', 'Invalid organization ID.');
  const organization = (await getFirestore().doc(`orgs/${orgId}`).get()).data();
  if (!organization || organization.disabled || ['pending_deletion', 'deleted'].includes(organization.status)) {
    throw new HttpsError('permission-denied', 'Workspace access has been suspended.');
  }
  if (requireEntitlement) {
    const entitlement = evaluateEntitlement(organization);
    if (!entitlement.entitled) throw new HttpsError('failed-precondition', entitlement.reason || 'Subscription required.');
  }

  const membershipRef = getFirestore().doc(`orgs/${orgId}/users/${request.auth.uid}`);
  const membershipSnapshot = await membershipRef.get();
  const membershipData = membershipSnapshot.exists ? membershipSnapshot.data() : null;
  const membership: CallableMembership | null = membershipData
    ? {
        userId: request.auth.uid,
        orgId,
        role: membershipData.role as CallableRole,
        active: membershipData.active === true,
      }
    : null;

  const decision = evaluateOrganizationAccess(
    {
      uid: request.auth.uid,
      tokenOrgId: typeof request.auth.token.org_id === 'string' ? request.auth.token.org_id : undefined,
      tokenRole: typeof request.auth.token.role === 'string' ? request.auth.token.role as CallableRole : undefined,
    },
    orgId,
    membership,
    allowedRoles
  );

  if (!decision.allowed) {
    throw new HttpsError('permission-denied', `Organization access denied: ${decision.reason}.`);
  }

  return { uid: request.auth.uid, orgId, role: decision.role };
}
