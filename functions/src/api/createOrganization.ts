import { DEFAULT_VERTICAL_CONFIGS } from '../jobs/default-workflows';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { z } from 'zod';
import { parseCallableData } from '../security/parse-callable-data';

if (!getApps().length) initializeApp();

const CreateOrganizationSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).min(3).max(48),
  vertical: z.enum(['extinguisher', 'grease_trap', 'hood_cleaning']),
  branding: z.object({
    companyName: z.string().trim().min(2).max(120),
    phone: z.string().trim().min(5).max(30),
    email: z.string().email(),
    address: z.string().trim().min(3).max(160),
    city: z.string().trim().min(2).max(80),
    state: z.string().trim().min(2).max(40),
    zip: z.string().trim().min(3).max(16),
    licenseNumber: z.string().trim().max(80).optional(),
  }),
});

export const createOrganization = onCall(
  { region: 'us-central1', enforceAppCheck: true },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Authentication is required.');
    if (!request.auth.token.email_verified) throw new HttpsError('failed-precondition', 'Verify your email before creating a workspace.');
    const input = parseCallableData(CreateOrganizationSchema, request.data);
    const db = getFirestore();
    const identityRef = db.collection('account_workspaces').doc(request.auth.uid);
    const identity = await identityRef.get();
    const orgRef = db.collection('orgs').doc(identity.data()?.orgId || `owner-${request.auth.uid}`);
    const slugRef = db.collection('org_slugs').doc(input.slug);
    const userRef = orgRef.collection('users').doc(request.auth.uid);
    const now = FieldValue.serverTimestamp();

    await db.runTransaction(async (transaction) => {
      const existingOrg = await transaction.get(orgRef);
      if (existingOrg.exists) {
        if (existingOrg.data()?.createdByUserId !== request.auth!.uid) throw new HttpsError('permission-denied', 'Workspace ownership mismatch.');
        return;
      }
      if ((await transaction.get(slugRef)).exists) {
        throw new HttpsError('already-exists', 'That organization URL is already in use.');
      }

      transaction.set(identityRef, {orgId: orgRef.id, userId: request.auth!.uid});
      transaction.set(orgRef.collection('workflow_configs').doc(input.vertical), DEFAULT_VERTICAL_CONFIGS[input.vertical]);
      transaction.create(slugRef, { orgId: orgRef.id, createdAt: now });
      transaction.create(orgRef, {
        id: orgRef.id,
        name: input.name,
        slug: input.slug,
        branding: input.branding,
        vertical: input.vertical,
        subscriptionTier: 'starter',
        maxUsers: 3,
        status: 'onboarding',
        subscriptionStatus: 'not_started',
        trialStartedAt: new Date().toISOString(),
        trialEndsAt: new Date(Date.now() + 14 * 86400000).toISOString(),
        trialEndsAtMs: Date.now() + 14 * 86400000,
        maxTechnicians: 3,
        createdByUserId: request.auth!.uid,
        createdAt: now,
        updatedAt: now,
      });
      transaction.create(userRef, {
        id: request.auth!.uid,
        userId: request.auth!.uid,
        orgId: orgRef.id,
        email: request.auth!.token.email || input.branding.email,
        displayName: request.auth!.token.name || 'Account owner',
        role: 'owner',
        active: true,
        createdAt: now,
        updatedAt: now,
      });
    });

    const auth = getAuth();
    const userRecord = await auth.getUser(request.auth.uid);
    await auth.setCustomUserClaims(request.auth.uid, {
      ...userRecord.customClaims,
      org_id: orgRef.id,
      role: 'owner',
    });

    return { success: true, data: { orgId: orgRef.id, slug: input.slug } };
  }
);
