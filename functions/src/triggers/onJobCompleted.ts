import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { getFirestore } from 'firebase-admin/firestore';
import { finalizeJobReport } from '../jobs/finalize-job-report';

export const onJobCompleted = onDocumentWritten(
  { document: 'orgs/{orgId}/jobs/{jobId}', region: 'us-central1', retry: true },
  async event => {
    if (event.data?.after.data()?.status !== 'completed' || event.data?.before.data()?.status === 'completed') return;
    await finalizeJobReport(getFirestore(), event.params.orgId, event.params.jobId);
  },
);
