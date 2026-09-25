import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import { formatReportNumber, summarizeServiceOutcome } from '@compliance-saas/backend-core';
import { serviceAssetUpdate } from './recurrence-policy';

/** Report, counter and recurrence commit together. A retried event makes no second write. */
export async function finalizeJobReport(db: Firestore, orgId: string, jobId: string) {
  const orgRef = db.doc(`orgs/${orgId}`), jobRef = orgRef.collection('jobs').doc(jobId), reportRef = orgRef.collection('reports').doc(jobId);
  return db.runTransaction(async tx => {
    const [report, jobDoc, org] = await tx.getAll(reportRef, jobRef, orgRef);
    if (report.exists || !org.exists || org.data()?.disabled) return;
    const job = jobDoc.data();
    if (!job || job.status !== 'completed') return;
    if (!job.sourceSnapshot || !job.workflowSnapshot || !Array.isArray(job.results) || !Number.isFinite(Date.parse(job.completedAt))) throw new Error(`Completed job ${jobId} lacks a valid finalized snapshot.`);
    const group = { hood_cleaning: 'hood_systems', extinguisher: 'extinguishers', grease_trap: 'grease_traps' }[String(job.vertical)];
    if (!group) throw new Error(`Unsupported vertical on job ${jobId}.`);
    const year = new Date(job.completedAt).getUTCFullYear(), counterRef = orgRef.collection('counters').doc(`reports_${year}`);
    const counter = await tx.get(counterRef);
    const assetRefs = job.results.map(result => orgRef.collection('customers').doc(job.customerId).collection('sites').doc(job.siteId).collection(group).doc(result.assetId));
    const assets = assetRefs.length ? await tx.getAll(...assetRefs) : [];
    const sequence = Number(counter.data()?.seq || 0) + 1;
    const reportNumber = formatReportNumber(job.vertical, year, sequence);
    const now = FieldValue.serverTimestamp();
    const outcome = summarizeServiceOutcome(job.totalExpectedAssets || job.results.length, job.results.filter(item => item.outcome === 'exception').length, job.results.filter(item => item.outcome === 'unable').length + Math.max(0, (job.totalExpectedAssets || 0) - job.results.length));
    tx.set(counterRef, { seq: sequence, year, updatedAt: now }, { merge: true });
    tx.create(reportRef, { id: jobId, orgId, jobId, assignedTechId: job.assignedTechId || '', customerId: job.customerId, siteId: job.siteId, vertical: job.vertical, reportNumber, title: job.workflowSnapshot.report.title, disclaimer: job.workflowSnapshot.report.disclaimer, outcome, generatedAt: now, status: 'final', revision: 1, results: job.results, snapshot: job.sourceSnapshot, emailDelivery: { recipients: [], deliveryStatus: 'not_configured' }, createdAt: now, updatedAt: now });
    assets.forEach((assetDoc, index) => {
      if (!assetDoc.exists) return;
      const result = job.results[index], asset = assetDoc.data()!;
      const frozen = job.sourceSnapshot.assets.find((item: { id: string }) => item.id === result.assetId);
      const update = serviceAssetUpdate(job.vertical, asset, result, job.completedAt, frozen?.serviceSchedule || job.workflowSnapshot.schedule);
      if (!update) return;
      tx.update(assetDoc.ref, { ...update, version: Number(asset.version || 1) + 1, updatedAt: now });
      const queueRef = orgRef.collection('recurring_queue').doc(`asset-${result.assetId}`);
      tx.set(queueRef, { id: queueRef.id, orgId, vertical: job.vertical, customerId: job.customerId, siteId: job.siteId, assetId: result.assetId, scheduledDate: typeof update.nextServiceDueAt === 'string' ? update.nextServiceDueAt.slice(0, 10) : '', status: update.nextServiceDueAt ? 'queued' : 'needs_follow_up', reason: update.nextServiceDueAt ? 'company_configured_recurrence' : 'service_unable_to_complete', sourceJobId: jobId, createdAt: now });
    });
    tx.update(jobRef, { reportId: jobId, reportState: 'ready', updatedAt: now });
  });
}
