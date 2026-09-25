import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getApps, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

if (!getApps().length) initializeApp();

const db = getFirestore();

export const refreshOverdueAssets = onSchedule(
  { schedule: 'every day 02:15', timeZone: 'America/Chicago', region: 'us-central1' },
  async () => {
    const now = new Date().toISOString();
    const collections = ['extinguishers', 'grease_traps', 'hood_systems'];

    for (const collectionName of collections) {
      const snapshot = await db.collectionGroup(collectionName)
        .where('nextServiceDueAt', '<', now)
        .limit(400)
        .get();
      if (snapshot.empty) continue;

      const batch = db.batch();
      snapshot.docs.forEach((asset) => {
        if (asset.data().serviceStatus !== 'overdue') {
          batch.update(asset.ref, {
            serviceStatus: 'overdue',
            updatedAt: FieldValue.serverTimestamp(),
          });
        }
      });
      await batch.commit();
    }
  }
);
