import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { z } from 'zod';
import {
  canTransitionJobStatus,
  validateConcurrency,
  validateJobAssignment,
  buildJobAuditEvent,
  type JobStatus,
} from '@compliance-saas/backend-core';
import { authorizeOrganizationRequest } from '../security/authorize-request';
import { parseCallableData } from '../security/parse-callable-data';

const createJobSchema = z
  .object({
    orgId: z.string().min(1).max(128).regex(/^[^/]+$/),
    siteId: z.string().min(1).max(128).regex(/^[^/]+$/),
    scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'scheduledDate must be YYYY-MM-DD'),
    assignedTechId: z.string().max(128).optional(),
  })
  .strict();

export const createServiceJob = onCall(
  { region: 'us-central1', enforceAppCheck: true },
  async (request) => {
    const input = parseCallableData(createJobSchema, request.data);
    const actor = await authorizeOrganizationRequest(request, input.orgId, ['owner', 'manager']);
    const db = getFirestore();

    const orgDoc = await db.doc(`orgs/${input.orgId}`).get();
    if (!orgDoc.exists) {
      throw new HttpsError('not-found', 'Organization not found.');
    }
    const orgData = orgDoc.data() || {};
    const vertical = orgData.vertical;

    // Find the site
    const sitesQuery = await db
      .collectionGroup('sites')
      .where('orgId', '==', input.orgId)
      .get();
    const siteDoc = sitesQuery.docs.find((d) => d.id === input.siteId);
    if (!siteDoc) {
      throw new HttpsError('not-found', 'Customer site not found in this organization.');
    }
    const siteData = siteDoc.data();
    const customerId = siteData.customerId || '';

    // Validate assigned technician if provided
    let initialStatus: JobStatus = 'scheduled';
    if (input.assignedTechId && input.assignedTechId.trim()) {
      const techDoc = await db.doc(`orgs/${input.orgId}/users/${input.assignedTechId}`).get();
      if (!techDoc.exists) {
        throw new HttpsError('not-found', 'Assigned technician not found.');
      }
      const techData = techDoc.data() || {};
      const assignmentValidation = validateJobAssignment(actor.role, {
        userId: input.assignedTechId,
        role: techData.role || 'technician',
        active: techData.active !== false,
      });
      if (!assignmentValidation.allowed) {
        throw new HttpsError('invalid-argument', assignmentValidation.reason || 'Invalid technician assignment.');
      }
      initialStatus = 'dispatched';
    }

    const jobRef = db.collection(`orgs/${input.orgId}/jobs`).doc();
    const jobId = jobRef.id;
    const now = new Date().toISOString();

    const jobPayload = {
      id: jobId,
      orgId: input.orgId,
      vertical,
      customerId,
      siteId: input.siteId,
      assignedTechId: input.assignedTechId || '',
      scheduledDate: input.scheduledDate,
      status: initialStatus,
      version: 1,
      results: [],
      photos: [],
      deficiencyIds: [],
      createdBy: actor.uid,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    const eventId = db.collection(`orgs/${input.orgId}/jobs/${jobId}/events`).doc().id;
    const auditEvent = buildJobAuditEvent({
      id: eventId,
      orgId: input.orgId,
      jobId,
      eventType: 'created',
      toStatus: initialStatus,
      actorId: actor.uid,
      actorRole: actor.role,
      timestamp: now,
      details: {
        scheduledDate: input.scheduledDate,
        assignedTechId: input.assignedTechId || null,
        siteId: input.siteId,
      },
    });

    const batch = db.batch();
    batch.set(jobRef, jobPayload);
    batch.set(db.doc(`orgs/${input.orgId}/jobs/${jobId}/events/${eventId}`), auditEvent);
    await batch.commit();

    return { success: true, jobId, version: 1, status: initialStatus };
  }
);

const assignJobSchema = z
  .object({
    orgId: z.string().min(1).max(128).regex(/^[^/]+$/),
    jobId: z.string().min(1).max(128).regex(/^[^/]+$/),
    targetTechId: z.string().min(1).max(128).regex(/^[^/]+$/),
    expectedVersion: z.number().int().positive().optional(),
  })
  .strict();

export const assignServiceJob = onCall(
  { region: 'us-central1', enforceAppCheck: true },
  async (request) => {
    const input = parseCallableData(assignJobSchema, request.data);
    const actor = await authorizeOrganizationRequest(request, input.orgId, ['owner', 'manager']);
    const db = getFirestore();

    return db.runTransaction(async (tx) => {
      const jobRef = db.doc(`orgs/${input.orgId}/jobs/${input.jobId}`);
      const jobSnap = await tx.get(jobRef);
      if (!jobSnap.exists) {
        throw new HttpsError('not-found', 'Job not found.');
      }
      const job = jobSnap.data() || {};

      if (job.status === 'completed' || job.status === 'cancelled') {
        throw new HttpsError(
          'failed-precondition',
          `Cannot assign a job that is already ${job.status}.`
        );
      }

      const concurrency = validateConcurrency(job.version || 1, input.expectedVersion);
      if (!concurrency.allowed) {
        throw new HttpsError('failed-precondition', concurrency.reason || 'Concurrency error.');
      }

      const techDoc = await tx.get(db.doc(`orgs/${input.orgId}/users/${input.targetTechId}`));
      if (!techDoc.exists) {
        throw new HttpsError('not-found', 'Designated technician not found.');
      }
      const techData = techDoc.data() || {};
      const validation = validateJobAssignment(actor.role, {
        userId: input.targetTechId,
        role: techData.role || 'technician',
        active: techData.active !== false,
      });
      if (!validation.allowed) {
        throw new HttpsError('invalid-argument', validation.reason || 'Invalid technician assignment.');
      }

      const nextStatus = job.status === 'scheduled' ? 'dispatched' : job.status;
      const nextVersion = (job.version || 1) + 1;
      const now = new Date().toISOString();

      const eventRef = db.collection(`orgs/${input.orgId}/jobs/${input.jobId}/events`).doc();
      const auditEvent = buildJobAuditEvent({
        id: eventRef.id,
        orgId: input.orgId,
        jobId: input.jobId,
        eventType: 'assigned',
        fromStatus: job.status,
        toStatus: nextStatus,
        actorId: actor.uid,
        actorRole: actor.role,
        timestamp: now,
        details: {
          previousTechId: job.assignedTechId || null,
          newTechId: input.targetTechId,
          version: nextVersion,
        },
      });

      tx.update(jobRef, {
        assignedTechId: input.targetTechId,
        status: nextStatus,
        version: nextVersion,
        updatedAt: FieldValue.serverTimestamp(),
      });
      tx.set(eventRef, auditEvent);

      return { success: true, jobId: input.jobId, version: nextVersion, status: nextStatus };
    });
  }
);

const startJobSchema = z
  .object({
    orgId: z.string().min(1).max(128).regex(/^[^/]+$/),
    jobId: z.string().min(1).max(128).regex(/^[^/]+$/),
    expectedVersion: z.number().int().positive().optional(),
  })
  .strict();

export const startServiceJob = onCall(
  { region: 'us-central1', enforceAppCheck: true },
  async (request) => {
    const input = parseCallableData(startJobSchema, request.data);
    const actor = await authorizeOrganizationRequest(request, input.orgId);
    const db = getFirestore();

    return db.runTransaction(async (tx) => {
      const jobRef = db.doc(`orgs/${input.orgId}/jobs/${input.jobId}`);
      const jobSnap = await tx.get(jobRef);
      if (!jobSnap.exists) {
        throw new HttpsError('not-found', 'Job not found.');
      }
      const job = jobSnap.data() || {};

      if (actor.role === 'technician' && job.assignedTechId !== actor.uid) {
        throw new HttpsError('permission-denied', 'This job is assigned to another technician.');
      }

      const transition = canTransitionJobStatus(job.status, 'in_progress');
      if (!transition.allowed) {
        throw new HttpsError('failed-precondition', transition.reason || 'Cannot start job.');
      }

      const concurrency = validateConcurrency(job.version || 1, input.expectedVersion);
      if (!concurrency.allowed) {
        throw new HttpsError('failed-precondition', concurrency.reason || 'Concurrency error.');
      }

      const nextVersion = (job.version || 1) + 1;
      const now = new Date().toISOString();

      const eventRef = db.collection(`orgs/${input.orgId}/jobs/${input.jobId}/events`).doc();
      const auditEvent = buildJobAuditEvent({
        id: eventRef.id,
        orgId: input.orgId,
        jobId: input.jobId,
        eventType: 'started',
        fromStatus: job.status,
        toStatus: 'in_progress',
        actorId: actor.uid,
        actorRole: actor.role,
        timestamp: now,
        details: { startedAt: now, version: nextVersion },
      });

      tx.update(jobRef, {
        status: 'in_progress',
        startedAt: now,
        version: nextVersion,
        updatedAt: FieldValue.serverTimestamp(),
      });
      tx.set(eventRef, auditEvent);

      return { success: true, jobId: input.jobId, version: nextVersion, status: 'in_progress' };
    });
  }
);

const cancelJobSchema = z
  .object({
    orgId: z.string().min(1).max(128).regex(/^[^/]+$/),
    jobId: z.string().min(1).max(128).regex(/^[^/]+$/),
    reason: z.string().min(3).max(500),
    expectedVersion: z.number().int().positive().optional(),
  })
  .strict();

export const cancelServiceJob = onCall(
  { region: 'us-central1', enforceAppCheck: true },
  async (request) => {
    const input = parseCallableData(cancelJobSchema, request.data);
    const actor = await authorizeOrganizationRequest(request, input.orgId);
    const db = getFirestore();

    return db.runTransaction(async (tx) => {
      const jobRef = db.doc(`orgs/${input.orgId}/jobs/${input.jobId}`);
      const jobSnap = await tx.get(jobRef);
      if (!jobSnap.exists) {
        throw new HttpsError('not-found', 'Job not found.');
      }
      const job = jobSnap.data() || {};

      if (actor.role === 'technician' && job.assignedTechId !== actor.uid) {
        throw new HttpsError('permission-denied', 'You cannot cancel a job assigned to another technician.');
      }

      const transition = canTransitionJobStatus(job.status, 'cancelled');
      if (!transition.allowed) {
        throw new HttpsError('failed-precondition', transition.reason || 'Cannot cancel job.');
      }

      const concurrency = validateConcurrency(job.version || 1, input.expectedVersion);
      if (!concurrency.allowed) {
        throw new HttpsError('failed-precondition', concurrency.reason || 'Concurrency error.');
      }

      const nextVersion = (job.version || 1) + 1;
      const now = new Date().toISOString();

      const eventRef = db.collection(`orgs/${input.orgId}/jobs/${input.jobId}/events`).doc();
      const auditEvent = buildJobAuditEvent({
        id: eventRef.id,
        orgId: input.orgId,
        jobId: input.jobId,
        eventType: 'cancelled',
        fromStatus: job.status,
        toStatus: 'cancelled',
        actorId: actor.uid,
        actorRole: actor.role,
        timestamp: now,
        details: { reason: input.reason, cancelledBy: actor.uid, version: nextVersion },
      });

      tx.update(jobRef, {
        status: 'cancelled',
        cancellationReason: input.reason,
        cancelledBy: actor.uid,
        cancelledAt: now,
        version: nextVersion,
        updatedAt: FieldValue.serverTimestamp(),
      });
      tx.set(eventRef, auditEvent);

      return { success: true, jobId: input.jobId, version: nextVersion, status: 'cancelled' };
    });
  }
);
