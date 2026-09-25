import { onCall } from 'firebase-functions/v2/https';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, type Query } from 'firebase-admin/firestore';
import { z } from 'zod';
import { authorizeOrganizationRequest } from '../security/authorize-request';
import { parseCallableData } from '../security/parse-callable-data';

if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();

const ExportComplianceDataSchema = z.object({
  orgId: z.string().min(1).max(128),
  customerId: z.string().min(1).max(128).optional(),
  siteId: z.string().min(1).max(128).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  vertical: z.enum(['extinguisher', 'grease_trap', 'hood_cleaning']).optional(),
  pageSize: z.number().int().min(1).max(500).default(200),
  pageToken: z.string().max(256).optional(),
});

export const exportComplianceData = onCall(
  {
    region: 'us-central1',
    enforceAppCheck: true,
  },
  async (request) => {
    const input = parseCallableData(ExportComplianceDataSchema, request.data);
    const { orgId, customerId, siteId, startDate, endDate, vertical, pageToken } = input;
    const pageSize = input.pageSize ?? 200;
    await authorizeOrganizationRequest(request, orgId, ['owner', 'manager'], false);

    let query: Query = db.collection(`orgs/${orgId}/jobs`);

    if (vertical) {
      query = query.where('vertical', '==', vertical);
    }
    if (customerId) {
      query = query.where('customerId', '==', customerId);
    }
    if (siteId) {
      query = query.where('siteId', '==', siteId);
    }
    if (startDate) {
      query = query.where('scheduledDate', '>=', startDate);
    }
    if (endDate) {
      query = query.where('scheduledDate', '<=', endDate);
    }

    query = query.orderBy('__name__');

    if (pageToken) {
      const cursorDoc = await db.doc(`orgs/${orgId}/jobs/${pageToken}`).get();
      if (cursorDoc.exists) {
        query = query.startAfter(cursorDoc);
      }
    }

    const snapshot = await query.limit(pageSize).get();
    const jobs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    // Fetch open deficiencies
    const defSnapshot = await db
      .collection(`orgs/${orgId}/deficiencies`)
      .where('status', 'in', ['open', 'quoted', 'scheduled_repair'])
      .limit(100)
      .get();
    const openDeficiencies = defSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    // Fetch completed reports
    const reportsSnapshot = await db
      .collection(`orgs/${orgId}/reports`)
      .limit(pageSize)
      .get();
    const reports = reportsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    const orgDoc = await db.doc(`orgs/${orgId}`).get();
    const orgData = orgDoc.data() || {};

    const hasMore = snapshot.size === pageSize;
    const nextPageToken = hasMore ? snapshot.docs[snapshot.size - 1].id : null;

    return {
      success: true,
      data: {
        orgId,
        organization: {
          id: orgId,
          name: orgData.name || 'Organization',
          vertical: orgData.vertical,
        },
        exportedAt: new Date().toISOString(),
        totalJobs: jobs.length,
        jobs,
        reports,
        openDeficiencies,
        nextPageToken,
        truncated: hasMore,
      },
    };
  }
);
