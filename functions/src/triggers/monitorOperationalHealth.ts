import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore } from 'firebase-admin/firestore';
import { inspectOperationalHealth } from '../jobs/operational-health';
export const monitorOperationalHealth = onSchedule({ schedule: 'every 15 minutes', region: 'us-central1', retryCount: 2 }, async () => {
  const health = await inspectOperationalHealth(getFirestore());
  if (health.pendingReports.length || health.failedBillingEvents.length || health.overdueDeletions.length || health.truncated) console.error('fieldledger_operational_attention', health);
  else console.info('fieldledger_operational_health_ok', { checkedAt: health.checkedAt });
});
