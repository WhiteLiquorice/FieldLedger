import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import { authorizeOrganizationRequest } from '../security/authorize-request';
import { parseCallableData } from '../security/parse-callable-data';
import { validateReschedule } from '../jobs/reschedule-policy';

const id = z.string().regex(/^[\w-]{1,256}$/);
const schema = z.object({ orgId: id, queueId: id, sourceJobId: id, scheduledDate: z.string(), assignedTechId: id.optional() }).strict();
export const scheduleRecurringVisit = onCall({ region: 'us-central1', enforceAppCheck: true }, async request => {
  const input = parseCallableData(schema, request.data);
  const actor = await authorizeOrganizationRequest(request, input.orgId, ['owner', 'manager']);
  try { validateReschedule('scheduled', input.scheduledDate); } catch (error) { throw new HttpsError('invalid-argument', (error as Error).message); }
  const db = getFirestore(), orgRef = db.doc(`orgs/${input.orgId}`), queueRef = orgRef.collection('recurring_queue').doc(input.queueId);
  return db.runTransaction(async tx => {
    const queued = (await tx.get(queueRef)).data();
    if (!queued || queued.sourceJobId !== input.sourceJobId) throw new HttpsError('failed-precondition', 'This recurrence changed. Reload the queue.');
    if (queued.status === 'scheduled' && queued.scheduledJobId) return { success: true, jobId: queued.scheduledJobId };
    if (!['queued', 'needs_follow_up'].includes(queued.status)) throw new HttpsError('failed-precondition', 'This recurrence cannot be scheduled.');
    const entries = await tx.get(orgRef.collection('recurring_queue').where('siteId', '==', queued.siteId));
    const jobs = await tx.get(orgRef.collection('jobs').where('siteId', '==', queued.siteId));
    if (jobs.docs.some(item => ['scheduled', 'dispatched', 'in_progress'].includes(item.data().status))) throw new HttpsError('failed-precondition', 'This site already has an open visit. Use that visit before scheduling another.');
    if (input.assignedTechId) {
      const member = (await tx.get(orgRef.collection('users').doc(input.assignedTechId))).data();
      if (!member?.active || !['owner', 'manager', 'technician'].includes(member.role)) throw new HttpsError('invalid-argument', 'Select an active team member.');
    }
    const jobRef = orgRef.collection('jobs').doc(), status = input.assignedTechId ? 'dispatched' : 'scheduled', now = FieldValue.serverTimestamp();
    tx.create(jobRef, { id: jobRef.id, orgId: input.orgId, vertical: queued.vertical, customerId: queued.customerId, siteId: queued.siteId, assignedTechId: input.assignedTechId || '', scheduledDate: input.scheduledDate, status, version: 1, results: [], createdAt: now, updatedAt: now, createdBy: actor.uid, sourceJobId: queued.sourceJobId });
    const eventRef = jobRef.collection('events').doc();
    tx.create(eventRef, { id: eventRef.id, orgId: input.orgId, jobId: jobRef.id, eventType: 'created', actorId: actor.uid, actorRole: actor.role, timestamp: new Date().toISOString(), details: { source: 'recurring_queue', sourceJobId: queued.sourceJobId, scheduledDate: input.scheduledDate } });
    // A service stop covers the site's current equipment, so consume all its pending suggestions.
    entries.docs.filter(item => ['queued', 'needs_follow_up'].includes(item.data().status)).forEach(item => tx.update(item.ref, { status: 'scheduled', scheduledJobId: jobRef.id, scheduledBy: actor.uid, updatedAt: now }));
    return { success: true, jobId: jobRef.id };
  });
});
