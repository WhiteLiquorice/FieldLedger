import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { z } from 'zod';
import { validateConcurrency, buildJobAuditEvent } from '@compliance-saas/backend-core';
import { authorizeOrganizationRequest } from '../security/authorize-request';
import { parseCallableData } from '../security/parse-callable-data';
import { validateCompletion } from '../jobs/completion-policy';
import { DEFAULT_VERTICAL_CONFIGS } from '../jobs/default-workflows';

const schema = z
  .object({
    orgId: z.string().min(1).max(128).regex(/^[^/]+$/),
    jobId: z.string().min(1).max(128).regex(/^[^/]+$/),
    results: z.unknown(),
    expectedVersion: z.number().int().positive().optional(),
  })
  .strict();

export const completeServiceJob = onCall(
  { region: 'us-central1', enforceAppCheck: true },
  async (request) => {
    const input = parseCallableData(schema, request.data);
    const actor = await authorizeOrganizationRequest(request, input.orgId);
    const db = getFirestore();
    const jobRef = db.doc(`orgs/${input.orgId}/jobs/${input.jobId}`);

    return db.runTransaction(async (tx) => {
      const job = (await tx.get(jobRef)).data();
      if (!job) throw new HttpsError('not-found', 'Job not found.');
      if (actor.role === 'technician' && job.assignedTechId !== actor.uid) {
        throw new HttpsError('permission-denied', 'This job is assigned to another technician.');
      }
      if (job.status === 'completed') return { success: true, jobId: input.jobId, version: job.version || 1 };
      if (job.status === 'cancelled') {
        throw new HttpsError('failed-precondition', 'A cancelled job cannot be completed.');
      }

      const concurrency = validateConcurrency(job.version || 1, input.expectedVersion);
      if (job.status !== 'in_progress') throw new HttpsError('failed-precondition', 'Start the visit before completing its record.');
      if (!concurrency.allowed) {
        throw new HttpsError('failed-precondition', concurrency.reason || 'Concurrency error.');
      }

      const org = (await tx.get(db.doc(`orgs/${input.orgId}`))).data();
      if (!org || job.vertical !== org.vertical) {
        throw new HttpsError('failed-precondition', 'Job does not match the company service.');
      }
      const vertical = job.vertical as keyof typeof DEFAULT_VERTICAL_CONFIGS;
      const workflow =
        (await tx.get(db.doc(`orgs/${input.orgId}/workflow_configs/${vertical}`))).data() ||
        DEFAULT_VERTICAL_CONFIGS[vertical];
      const group =
        vertical === 'extinguisher'
          ? 'extinguishers'
          : vertical === 'hood_cleaning'
            ? 'hood_systems'
            : 'grease_traps';
      const assets = await tx.get(
        db.collection(`orgs/${input.orgId}/customers/${job.customerId}/sites/${job.siteId}/${group}`)
      );
      const customer = (await tx.get(db.doc(`orgs/${input.orgId}/customers/${job.customerId}`))).data();
      const site = (await tx.get(db.doc(`orgs/${input.orgId}/customers/${job.customerId}/sites/${job.siteId}`))).data();
      const technician = (await tx.get(db.doc(`orgs/${input.orgId}/users/${actor.uid}`))).data();
      if (!customer || !site) throw new HttpsError('failed-precondition', 'The job customer or site is missing.');
      let results;
      try {
        results = validateCompletion(
          input.results,
          assets.docs.map((d) => d.id),
          workflow.checklist.filter((f: { required: boolean }) => f.required).map((f: { id: string }) => f.id),
          vertical
        );
      } catch (error) {
        throw new HttpsError('invalid-argument', error instanceof Error ? error.message : 'Invalid service results.');
      }
      for (const result of results) {
        for (const photo of result.photoUrls) {
          let objectPath = '';
          try {
            const url = new URL(photo);
            if (url.hostname === 'firebasestorage.googleapis.com') {
              objectPath = decodeURIComponent(url.pathname.split('/o/')[1] || '');
            }
            if (process.env.FUNCTIONS_EMULATOR === 'true' && process.env.GCLOUD_PROJECT?.startsWith('demo-') && url.hostname === '127.0.0.1') {
              objectPath = decodeURIComponent(url.pathname.split('/o/')[1] || '');
            }
          } catch {
            throw new HttpsError('invalid-argument', 'Invalid evidence URL.');
          }
          if (!objectPath.startsWith(`orgs/${input.orgId}/jobs/${input.jobId}/assets/${result.assetId}/`)) {
            throw new HttpsError('permission-denied', 'Evidence must belong to this job and asset.');
          }
          const bucket = getStorage().bucket();
          const suppliedBucket = decodeURIComponent(new URL(photo).pathname.split('/b/')[1]?.split('/')[0] || '');
          if (suppliedBucket !== bucket.name) throw new HttpsError('permission-denied', 'Evidence must use this application storage bucket.');
          const [metadata] = await bucket.file(objectPath).getMetadata();
          if (!['image/jpeg', 'image/png', 'image/webp'].includes(metadata.contentType || '') || Number(metadata.size) < 1 || Number(metadata.size) >= 20 * 1024 * 1024) {
            throw new HttpsError('invalid-argument', 'Evidence file is missing or invalid.');
          }
        }
      }
      const now = new Date().toISOString();
      const nextVersion = (job.version || 1) + 1;
      const mapped = results.map((r) => ({
        assetId: r.assetId,
        resultStatus:
          r.outcome === 'completed'
            ? 'pass'
            : r.outcome === 'unable'
              ? 'inaccessible'
              : 'service_required',
        condition:
          r.outcome === 'completed'
            ? 'completed'
            : r.outcome === 'unable'
              ? 'unable_to_complete'
              : 'service_required',
        notes: r.notes || '',
        photoUrls: r.photoUrls,
        gallonsPumped: r.quantity || r.checklist.quantity || 0,
      }));

      const eventRef = db.collection(`orgs/${input.orgId}/jobs/${input.jobId}/events`).doc();
      const auditEvent = buildJobAuditEvent({
        id: eventRef.id,
        orgId: input.orgId,
        jobId: input.jobId,
        eventType: 'completed',
        fromStatus: job.status,
        toStatus: 'completed',
        actorId: actor.uid,
        actorRole: actor.role,
        timestamp: now,
        details: { totalAssets: assets.size, resolvedResults: results.length, version: nextVersion },
      });

      tx.update(jobRef, {
        status: 'completed',
        reportState: 'pending',
        results,
        sourceSnapshot: {
          organizationName: String(org.branding?.companyName || org.name),
          customerName: String(customer.businessName),
          siteName: String(site.siteName),
          address: [typeof site.address === 'string' ? site.address : site.address?.street, site.address?.city || site.city, site.address?.state || site.state].filter(Boolean).join(', '),
          technicianName: String(technician?.displayName || technician?.email || actor.uid),
          completedAt: now,
          checklistLabels: Object.fromEntries(workflow.checklist.map((field: { id: string; label: string }) => [field.id, field.label])),
          assets: assets.docs.map(asset => ({ id: asset.id, name: String(asset.data().name || asset.data().systemName || asset.data().serialNumber || 'Service item'), assetCode: String(asset.data().assetCode || asset.data().qrCode || asset.id), location: String(asset.data().location || asset.data().locationDescription || asset.data().roomOrArea || ''), serviceSchedule: asset.data().serviceSchedule || workflow.schedule })),
        },
        workflowSnapshot: workflow,
        totalExpectedAssets: assets.size,
        [vertical === 'extinguisher'
          ? 'extinguisherResults'
          : vertical === 'hood_cleaning'
            ? 'hoodCleaningResults'
            : 'greaseTrapResults']: mapped,
        completedBy: actor.uid,
        completedAt: now,
        version: nextVersion,
        updatedAt: FieldValue.serverTimestamp(),
      });
      tx.set(eventRef, auditEvent);

      return { success: true, jobId: input.jobId, version: nextVersion, status: 'completed' };
    });
  }
);
