import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import { authorizeOrganizationRequest } from '../security/authorize-request';
import { parseCallableData } from '../security/parse-callable-data';
import { validateReschedule } from '../jobs/reschedule-policy';

const schema = z.object({ orgId: z.string().regex(/^[\w-]{1,128}$/), jobId: z.string().regex(/^[\w-]{1,128}$/), scheduledDate: z.string(), expectedVersion: z.number().int().positive(), reason: z.string().trim().min(3).max(500) }).strict();
export const rescheduleServiceJob = onCall({ region: 'us-central1', enforceAppCheck: true }, async request => {
  const input = parseCallableData(schema, request.data);
  const actor = await authorizeOrganizationRequest(request, input.orgId, ['owner', 'manager']);
  const db = getFirestore(), ref = db.doc(`orgs/${input.orgId}/jobs/${input.jobId}`);
  return db.runTransaction(async tx => {
    const job = (await tx.get(ref)).data();
    if (!job) throw new HttpsError('not-found', 'Visit not found.');
    if (job.version !== input.expectedVersion) throw new HttpsError('failed-precondition', 'This visit changed. Reload it before rescheduling.');
    try { validateReschedule(job.status, input.scheduledDate); } catch (error) { throw new HttpsError('invalid-argument', (error as Error).message); }
    const version = job.version + 1, event = ref.collection('events').doc();
    tx.update(ref, { scheduledDate: input.scheduledDate, version, updatedAt: FieldValue.serverTimestamp() });
    tx.create(event, { id: event.id, orgId: input.orgId, jobId: input.jobId, eventType: 'rescheduled', actorId: actor.uid, actorRole: actor.role, timestamp: new Date().toISOString(), details: { previousDate: job.scheduledDate, scheduledDate: input.scheduledDate, reason: input.reason, version } });
    return { success: true, version };
  });
});
