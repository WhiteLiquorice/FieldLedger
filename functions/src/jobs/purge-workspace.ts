import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { getAuth } from 'firebase-admin/auth';

/** Server-only, retryable teardown. The disabled organization is deleted last. */
export async function purgePendingWorkspace(orgId: string, now = Date.now()) {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(orgId)) throw new Error('Invalid workspace identifier.');
  const db = getFirestore();
  const orgRef = db.doc(`orgs/${orgId}`);
  const org = (await orgRef.get()).data();
  if (!org) return { deleted: true };
  if (org.status !== 'pending_deletion' || org.disabled !== true) throw new Error('Workspace is not pending deletion.');
  if (!Number.isFinite(org.deleteAfterMs) || now < org.deleteAfterMs) return { deleted: false };
  if (!['not_started', 'canceled', 'expired'].includes(org.subscriptionStatus)) throw new Error('Cancel billing before purging a workspace.');
  const identities = await db.collection('account_workspaces').where('orgId', '==', orgId).get();
  for (const identity of identities.docs) {
    try {
      const account = await getAuth().getUser(identity.id);
      if (account.customClaims?.org_id === orgId) {
        const claims = { ...account.customClaims }; delete claims.org_id; delete claims.role;
        await getAuth().setCustomUserClaims(identity.id, claims);
        await getAuth().revokeRefreshTokens(identity.id);
      }
    } catch (error) {
      if ((error as { code?: string }).code !== 'auth/user-not-found') throw error;
    }
    await identity.ref.delete();
  }
  await getStorage().bucket().deleteFiles({ prefix: `orgs/${orgId}/` });
  for (const collection of ['invitation_tokens', 'org_slugs']) {
    const records = await db.collection(collection).where('orgId', '==', orgId).get();
    for (const record of records.docs) await record.ref.delete();
  }
  await db.recursiveDelete(orgRef);
  console.info('workspace_purged', { orgId });
  return { deleted: true };
}
