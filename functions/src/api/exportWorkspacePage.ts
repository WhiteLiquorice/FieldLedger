import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { FieldPath, getFirestore, type Query } from 'firebase-admin/firestore';
import { z } from 'zod';
import { authorizeOrganizationRequest } from '../security/authorize-request';
import { parseCallableData } from '../security/parse-callable-data';

const schema = z.object({ orgId: z.string().regex(/^[\w-]{1,128}$/), collection: z.enum(['customers', 'sites', 'extinguishers', 'hood_systems', 'grease_traps', 'jobs', 'reports', 'deficiencies', 'recurring_queue', 'users', 'workflow_configs', 'events', 'evidence']), pageToken: z.string().max(1500).optional() }).strict();
const groups = new Set(['sites', 'extinguishers', 'hood_systems', 'grease_traps', 'events', 'evidence']);
export const exportWorkspacePage = onCall({ region: 'us-central1', enforceAppCheck: true }, async request => {
  const input = parseCallableData(schema, request.data);
  await authorizeOrganizationRequest(request, input.orgId, ['owner', 'manager'], false);
  const db = getFirestore(), prefix = `orgs/${input.orgId}/`;
  let query: Query = groups.has(input.collection)
    ? db.collectionGroup(input.collection).where('orgId', '==', input.orgId)
    : db.collection(`${prefix}${input.collection}`);
  query = query.orderBy(FieldPath.documentId());
  if (input.pageToken) {
    const segments = input.pageToken.split('/');
    if (!input.pageToken.startsWith(prefix) || segments.length % 2 || segments.at(-2) !== input.collection || segments.some(item => !item || item === '.' || item === '..')) throw new HttpsError('invalid-argument', 'Invalid export cursor.');
    query = query.startAfter(db.doc(input.pageToken));
  }
  const snapshot = await query.limit(20).get();
  if (snapshot.docs.some(doc => !doc.ref.path.startsWith(prefix))) throw new HttpsError('internal', 'Export encountered an invalid tenant identity.');
  return { documents: snapshot.docs.map(doc => ({ path: doc.ref.path, data: doc.data() })), nextPageToken: snapshot.size === 20 ? snapshot.docs.at(-1)!.ref.path : null, exportedAt: new Date().toISOString() };
});
