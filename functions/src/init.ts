import { getApps, initializeApp } from 'firebase-admin/app';
import { setGlobalOptions } from 'firebase-functions/v2';

if (!getApps().length) {
  initializeApp();
}

setGlobalOptions({
  region: 'us-central1',
  memory: '256MiB',
  cpu: 'gcf_gen1',
  concurrency: 1,
  maxInstances: 3,
});
