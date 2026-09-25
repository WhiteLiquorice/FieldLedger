import type { Firestore } from 'firebase-admin/firestore';
/** Read-only health signals. Alert delivery must be configured separately in Cloud Monitoring. */
export async function inspectOperationalHealth(db: Firestore, now = Date.now()) {
  const cutoff = new Date(now - 15 * 60000).toISOString();
  const pendingReports = await db.collectionGroup('jobs').where('reportState', '==', 'pending').where('completedAt', '<=', cutoff).limit(100).get();
  const failedBilling = await db.collection('stripe_webhook_events').where('status', '==', 'failed').limit(100).get();
  const lateDeletion = await db.collection('orgs').where('status', '==', 'pending_deletion').where('deleteAfterMs', '<=', now - 2 * 3600000).limit(100).get();
  return {
    checkedAt: new Date(now).toISOString(),
    pendingReports: pendingReports.docs.map(item => ({ path: item.ref.path, orgId: item.data().orgId, jobId: item.id })),
    failedBillingEvents: failedBilling.docs.map(item => item.id),
    overdueDeletions: lateDeletion.docs.map(item => item.id),
    truncated: [pendingReports, failedBilling, lateDeletion].some(items => items.size === 100),
  };
}
