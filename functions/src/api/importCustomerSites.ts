import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue, type DocumentReference } from 'firebase-admin/firestore';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { ImportRowSchema, normalizeImportIdentity } from '@compliance-saas/backend-core';
import { authorizeOrganizationRequest } from '../security/authorize-request';
import { parseCallableData } from '../security/parse-callable-data';
import { importSiteIdentity, importAssetIdentity } from '../jobs/customer-import-policy';
const schema = z.object({ orgId: z.string().regex(/^[A-Za-z0-9_-]{1,128}$/), rows: z.array(ImportRowSchema).min(1).max(100) }).strict();
const id = (...parts: string[]) => `import-${createHash('sha256').update(normalizeImportIdentity(...parts)).digest('hex').slice(0, 32)}`;
export const importCustomerSites = onCall({ region: 'us-central1', enforceAppCheck: true }, async request => {
  const input = parseCallableData(schema, request.data);
  await authorizeOrganizationRequest(request, input.orgId, ['owner', 'manager']);
  const db = getFirestore(), orgRef = db.doc(`orgs/${input.orgId}`);
  return db.runTransaction(async tx => {
    const org = (await tx.get(orgRef)).data();
    if (org?.vertical !== 'hood_cleaning') throw new HttpsError('failed-precondition', 'CSV system import currently supports hood-cleaning workspaces.');
    const customers = await tx.get(orgRef.collection('customers'));
    const sites = await tx.get(db.collectionGroup('sites').where('orgId', '==', input.orgId));
    const assets = await tx.get(db.collectionGroup('hood_systems').where('orgId', '==', input.orgId));
    const workflow = (await tx.get(orgRef.collection('workflow_configs').doc('hood_cleaning'))).data();
    const customerIds = new Map(customers.docs.map(doc => [normalizeImportIdentity(doc.data().businessName), doc.id]));
    const siteIds = new Map(sites.docs.map(doc => [importSiteIdentity(doc.data()), doc.id]));
    const assetIds = new Map(assets.docs.map(doc => [importAssetIdentity(doc.data()), doc.id]));
    const writes = new Map<string, { ref: DocumentReference; data: Record<string, unknown> }>();
    for (const row of input.rows) {
      const customerId = customerIds.get(normalizeImportIdentity(row.businessName)) || id(row.businessName);
      const siteId = siteIds.get(normalizeImportIdentity(customerId, row.siteName, row.address)) || id(customerId, row.siteName, row.address);
      const assetId = assetIds.get(importAssetIdentity({ siteId, assetCode: row.assetCode })) || id(siteId, row.assetCode);
      const base = `orgs/${input.orgId}/customers/${customerId}`;
      const add = (path: string, data: Record<string, unknown>) => writes.set(path, { ref: db.doc(path), data: { ...data, orgId: input.orgId, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() } });
      add(base, { id: customerId, businessName: row.businessName, contactName: row.contactName, contactEmail: row.contactEmail, contactPhone: row.contactPhone, active: true, contacts: [{ name: row.contactName, email: row.contactEmail, phone: row.contactPhone, isPrimary: true }] });
      add(`${base}/sites/${siteId}`, { id: siteId, customerId, siteName: row.siteName, address: row.address, city: row.city, state: row.state });
      add(`${base}/sites/${siteId}/hood_systems/${assetId}`, { id: assetId, customerId, siteId, vertical: 'hood_cleaning', assetCode: row.assetCode, name: row.systemName, systemName: row.systemName, location: '', locationDescription: '', status: 'ready', serviceSchedule: workflow?.schedule || { unit: 'months', interval: 3 }, details: {} });
    }
    const existing = await tx.getAll(...[...writes.values()].map(item => item.ref));
    let created = 0;
    existing.forEach(snapshot => { if (!snapshot.exists) { tx.create(snapshot.ref, writes.get(snapshot.ref.path)!.data); created++; } });
    return { success: true, createdDocuments: created, skippedDocuments: writes.size - created };
  });
});
