import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import { authorizeOrganizationRequest } from '../security/authorize-request';
import { parseCallableData } from '../security/parse-callable-data';
import { buildReportRevision } from '../jobs/report-revision';
const schema = z.object({ orgId: z.string().regex(/^[\w-]{1,128}$/), baseReportId: z.string().regex(/^[\w-]{1,128}$/), expectedRevision: z.number().int().min(1).max(20), requestId: z.string().uuid(), reason: z.string().trim().min(5).max(500), note: z.string().trim().min(10).max(4000) }).strict();
export const addReportAddendum = onCall({ region: 'us-central1', enforceAppCheck: true }, async request => {
  const input = parseCallableData(schema, request.data);
  const actor = await authorizeOrganizationRequest(request, input.orgId, ['owner', 'manager']);
  const db = getFirestore(), org = db.doc(`orgs/${input.orgId}`), originalRef = org.collection('reports').doc(input.baseReportId), headRef = org.collection('report_heads').doc(input.baseReportId), revisionRef = org.collection('reports').doc(`${input.baseReportId}-r-${input.requestId}`);
  return db.runTransaction(async tx => {
    const [originalDoc, head, existing, member] = await tx.getAll(originalRef, headRef, revisionRef, org.collection('users').doc(actor.uid));
    const original = originalDoc.data();
    if (!original?.snapshot || original.baseReportId) throw new HttpsError('failed-precondition', 'Select an original finalized record.');
    if (existing.exists) {
      const last = existing.data()?.addenda?.at(-1);
      if (last?.note !== input.note || last?.reason !== input.reason || last?.authorId !== actor.uid) throw new HttpsError('already-exists', 'This correction request was already used with different content.');
      return { success: true, reportId: existing.id, revision: existing.data()?.revision };
    }
    const currentRevision = head.data()?.revision || 1;
    if (currentRevision !== input.expectedRevision) throw new HttpsError('failed-precondition', 'A newer correction exists. Reopen the latest record before adding another.');
    const previous = head.exists ? (await tx.get(org.collection('reports').doc(head.data()!.reportId))).data() : original;
    if (!previous) throw new HttpsError('failed-precondition', 'The previous report revision is missing.');
    const revision = buildReportRevision(original, previous, { id: revisionRef.id, note: input.note, reason: input.reason, authorId: actor.uid, authorName: String(member.data()?.displayName || member.data()?.email || actor.uid), createdAt: new Date().toISOString() });
    tx.create(revisionRef, { ...revision, generatedAt: FieldValue.serverTimestamp(), createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
    tx.set(headRef, { orgId: input.orgId, baseReportId: originalRef.id, reportId: revisionRef.id, revision: revision.revision });
    return { success: true, reportId: revisionRef.id, revision: revision.revision };
  });
});
