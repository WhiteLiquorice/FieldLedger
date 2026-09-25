import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore } from 'firebase-admin/firestore';
import { purgePendingWorkspace } from '../jobs/purge-workspace';
export const purgeDeletedWorkspaces = onSchedule({ schedule: 'every 60 minutes', region: 'us-central1', retryCount: 3 }, async () => {
  const pending = await getFirestore().collection('orgs').where('status', '==', 'pending_deletion').orderBy('deleteAfterMs').limit(25).get();
  const outcomes = await Promise.allSettled(pending.docs.map(doc => purgePendingWorkspace(doc.id)));
  const failures = outcomes.filter(result => result.status === 'rejected');
  if (failures.length) { console.error('workspace_purge_failed', { failures: failures.map(value => String((value as PromiseRejectedResult).reason)) }); throw new Error(`${failures.length} workspace deletions failed; retry required.`); }
});
