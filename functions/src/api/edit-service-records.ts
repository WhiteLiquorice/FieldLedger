import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import { calculateNextServiceDue } from '@compliance-saas/backend-core';
import { authorizeOrganizationRequest } from '../security/authorize-request';
import { parseCallableData } from '../security/parse-callable-data';

const identity = z.string().regex(/^[\w-]{1,128}$/);
const scope = { orgId: identity, customerId: identity, siteId: identity };
const version = z.number().int().positive();
const text = (max = 200) => z.string().trim().min(1).max(max);
const siteSchema = z.object({ ...scope, expectedCustomerVersion: version, expectedSiteVersion: version,
  businessName: text(), siteName: text(), address: text(500), city: text(), state: text(100),
  contactName: z.string().trim().max(200), contactEmail: z.union([z.literal(''), z.string().trim().email().max(254)]), contactPhone: z.string().trim().max(50),
}).strict();
const assetSchema = z.object({ ...scope, assetId: identity, expectedVersion: version, name: text(), assetCode: text(100), location: z.string().trim().max(500), scheduleInterval: z.number().int().min(1).max(1200) }).strict();
function checkVersion(actual: unknown, expected: number) {
  if ((actual ?? 1) !== expected) throw new HttpsError('failed-precondition', 'This record changed. Close the editor and reopen it before saving.');
}

export const updateCustomerSite = onCall({ region: 'us-central1', enforceAppCheck: true }, async request => {
  const input = parseCallableData(siteSchema, request.data);
  const actor = await authorizeOrganizationRequest(request, input.orgId, ['owner', 'manager']);
  const db = getFirestore(), customerRef = db.doc(`orgs/${input.orgId}/customers/${input.customerId}`), siteRef = customerRef.collection('sites').doc(input.siteId);
  return db.runTransaction(async tx => {
    const [customer, site] = await tx.getAll(customerRef, siteRef);
    if (!customer.exists || !site.exists || site.data()?.customerId !== input.customerId) throw new HttpsError('not-found', 'Customer site not found.');
    checkVersion(customer.data()?.version, input.expectedCustomerVersion);
    checkVersion(site.data()?.version, input.expectedSiteVersion);
    const contact = { name: input.contactName, email: input.contactEmail, phone: input.contactPhone };
    const contacts = Array.isArray(customer.data()?.contacts) ? [...customer.data()!.contacts] : [];
    const primaryIndex = contacts.findIndex(item => item.isPrimary);
    if (primaryIndex >= 0) contacts[primaryIndex] = { ...contacts[primaryIndex], ...contact };
    else contacts.unshift({ ...contact, isPrimary: true });
    const previousAddress = site.data()?.address;
    tx.update(customerRef, { businessName: input.businessName, contactName: input.contactName, contactEmail: input.contactEmail, contactPhone: input.contactPhone, contacts, version: input.expectedCustomerVersion + 1, updatedAt: FieldValue.serverTimestamp(), updatedBy: actor.uid });
    tx.update(siteRef, { siteName: input.siteName, address: { ...(typeof previousAddress === 'object' && previousAddress ? previousAddress : {}), street: input.address, city: input.city, state: input.state }, city: input.city, state: input.state, siteContact: contact, version: input.expectedSiteVersion + 1, updatedAt: FieldValue.serverTimestamp(), updatedBy: actor.uid });
    return { success: true, customerVersion: input.expectedCustomerVersion + 1, siteVersion: input.expectedSiteVersion + 1 };
  });
});

export const updateServiceAsset = onCall({ region: 'us-central1', enforceAppCheck: true }, async request => {
  const input = parseCallableData(assetSchema, request.data);
  const actor = await authorizeOrganizationRequest(request, input.orgId, ['owner', 'manager']);
  const db = getFirestore();
  return db.runTransaction(async tx => {
    const org = (await tx.get(db.doc(`orgs/${input.orgId}`))).data();
    const group = { hood_cleaning: 'hood_systems', extinguisher: 'extinguishers', grease_trap: 'grease_traps' }[String(org?.vertical)];
    if (!group) throw new HttpsError('failed-precondition', 'Unknown workspace service.');
    const ref = db.doc(`orgs/${input.orgId}/customers/${input.customerId}/sites/${input.siteId}/${group}/${input.assetId}`);
    const asset = (await tx.get(ref)).data();
    if (!asset || asset.siteId !== input.siteId || asset.customerId !== input.customerId) throw new HttpsError('not-found', 'Equipment not found.');
    checkVersion(asset.version, input.expectedVersion);
    const siblings = await tx.get(ref.parent);
    const queueRef = db.doc(`orgs/${input.orgId}/recurring_queue/asset-${input.assetId}`);
    const queue = (await tx.get(queueRef)).data();
    if (siblings.docs.some(item => item.id !== ref.id && String(item.data().assetCode || item.data().qrCode || '').trim().toLowerCase() === input.assetCode.toLowerCase())) throw new HttpsError('already-exists', 'This site already has equipment with that code.');
    const unit = asset.serviceSchedule?.unit || (org?.vertical === 'grease_trap' ? 'days' : 'months');
    if (!['days', 'months', 'years'].includes(unit)) throw new HttpsError('failed-precondition', 'Invalid service interval unit.');
    const schedule = { unit, interval: input.scheduleInterval };
    const update: Record<string, unknown> = { name: input.name, assetCode: input.assetCode, location: input.location, serviceSchedule: schedule, version: input.expectedVersion + 1, updatedAt: FieldValue.serverTimestamp(), updatedBy: actor.uid };
    if (org?.vertical === 'hood_cleaning') Object.assign(update, { systemName: input.name, locationDescription: input.location, serviceIntervalMonths: input.scheduleInterval });
    if (org?.vertical === 'extinguisher') Object.assign(update, { qrCode: input.assetCode, roomOrArea: input.location });
    if (org?.vertical === 'grease_trap') Object.assign(update, { locationDescription: input.location, serviceIntervalDays: input.scheduleInterval });
    if (asset.lastServicedAt) {
      const due = calculateNextServiceDue(String(asset.lastServicedAt), schedule);
      Object.assign(update, { nextServiceDueAt: due, [org?.vertical === 'hood_cleaning' ? 'nextCleaningDueAt' : org?.vertical === 'extinguisher' ? 'nextAnnualDueAt' : 'nextPumpDueAt']: due });
      if (queue?.status === 'queued') tx.update(queueRef, { scheduledDate: due.slice(0, 10), updatedAt: FieldValue.serverTimestamp() });
    }
    tx.update(ref, update);
    return { success: true, version: input.expectedVersion + 1 };
  });
});
