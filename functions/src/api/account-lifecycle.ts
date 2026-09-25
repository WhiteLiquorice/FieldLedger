import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getApps, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { z } from 'zod';
import { parseCallableData } from '../security/parse-callable-data';
import { authorizeOrganizationRequest } from '../security/authorize-request';
import {
  canRequestWorkspaceDeletion,
  buildWorkspaceDeletionRecord,
} from '@compliance-saas/backend-core';

if (!getApps().length) {
  initializeApp();
}

const RequestWorkspaceDeletionSchema = z.object({
  orgId: z.string().min(1),
  confirmationText: z.string().trim(),
  reason: z.string().trim().max(500).optional(),
});

export const requestWorkspaceDeletion = onCall(
  { region: 'us-central1', enforceAppCheck: true },
  async (request) => {
    const input = parseCallableData(RequestWorkspaceDeletionSchema, request.data);
    const actor = await authorizeOrganizationRequest(request, input.orgId, ['owner'], false);

    const db = getFirestore();
    const orgRef = db.collection('orgs').doc(input.orgId);
    const orgSnap = await orgRef.get();

    if (!orgSnap.exists) {
      throw new HttpsError('not-found', 'Organization not found.');
    }

    const orgData = orgSnap.data() || {};

    if (input.confirmationText !== 'DELETE' && input.confirmationText !== orgData.name && input.confirmationText !== orgData.slug) {
      throw new HttpsError('invalid-argument', 'Confirmation text must be DELETE or the workspace name.');
    }

    const decision = canRequestWorkspaceDeletion({
      status: orgData.status || 'active',
      subscriptionStatus: orgData.subscriptionStatus,
    });

    if (!decision.canDelete) {
      throw new HttpsError('failed-precondition', decision.reason || 'Workspace cannot be deleted.');
    }

    const now = FieldValue.serverTimestamp();
    const eventRef = orgRef.collection('events').doc();
    const audit = buildWorkspaceDeletionRecord(input.orgId, actor.uid, input.reason);

    await db.runTransaction(async (transaction) => {
      const current = (await transaction.get(orgRef)).data();
      if (!current || !canRequestWorkspaceDeletion({ status: current.status, subscriptionStatus: current.subscriptionStatus }).canDelete) throw new HttpsError('failed-precondition', 'Workspace state changed. Cancel billing before deleting.');
      transaction.update(orgRef, {
        status: 'pending_deletion',
        disabled: true,
        deletionRequestedAt: now,
        deletionRequestedBy: actor.uid,
        deleteAfterMs: Date.now() + 7 * 86400000,
        updatedAt: now,
      });

      transaction.create(eventRef, {
        ...audit,
        timestamp: now,
      });
    });

    return {
      success: true,
      message: 'Workspace deletion scheduled after seven days. Access has been suspended.',
    };
  }
);
