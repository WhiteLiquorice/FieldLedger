import { onCall } from 'firebase-functions/v2/https';
import { getApps, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import * as crypto from 'crypto';
import { z } from 'zod';
import { authorizeOrganizationRequest } from '../security/authorize-request';
import { parseCallableData } from '../security/parse-callable-data';

if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();

export interface GenerateQrBatchRequest {
  orgId: string;
  count: number;
  prefix?: string;
  notes?: string;
}

const GenerateQrBatchSchema = z.object({
  orgId: z.string().min(1).max(128),
  count: z.number().int().min(1).max(500),
  prefix: z.string().trim().min(2).max(12).regex(/^[A-Za-z0-9-]+$/).default('EXT'),
  notes: z.string().trim().max(500).optional(),
});

export const generateQrBatch = onCall(
  {
    region: 'us-central1',
    enforceAppCheck: true,
  },
  async (request) => {
    const input = parseCallableData(GenerateQrBatchSchema, request.data);
    const { orgId, count, notes } = input;
    const actor = await authorizeOrganizationRequest(request, orgId, ['owner', 'manager']);
    const normalizedPrefix = (input.prefix ?? 'EXT').toUpperCase();

    const batch = db.batch();
    const qrBatchCollection = db.collection(`orgs/${orgId}/qr_batches`).doc();
    const generatedCodes: Array<{ code: string; shortId: string; printIndex: number }> = [];

    const timestamp = Date.now().toString(36).toUpperCase();

    for (let i = 1; i <= count; i++) {
      const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
      const code = `${normalizedPrefix}-${timestamp}-${String(i).padStart(4, '0')}-${randomSuffix}`;
      const shortId = `${normalizedPrefix}-${String(i).padStart(4, '0')}`;

      generatedCodes.push({
        code,
        shortId,
        printIndex: i,
      });

      // Pre-reserve in available_qr_tags registry
      const qrTagRef = db.collection(`orgs/${orgId}/available_qr_tags`).doc(code);
      batch.set(qrTagRef, {
        code,
        shortId,
        batchId: qrBatchCollection.id,
        status: 'unassigned',
        createdAt: FieldValue.serverTimestamp(),
      });
    }

    // Save batch metadata
    batch.set(qrBatchCollection, {
      id: qrBatchCollection.id,
      orgId,
      prefix: normalizedPrefix,
      count,
      notes: notes || '',
      generatedByUserId: actor.uid,
      createdAt: FieldValue.serverTimestamp(),
    });

    await batch.commit();

    return {
      success: true,
      data: {
        batchId: qrBatchCollection.id,
        totalGenerated: count,
        codes: generatedCodes,
      },
    };
  }
);
