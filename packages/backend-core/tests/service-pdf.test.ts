import { it, expect } from 'vitest';
import { PDFDocument, PDFName, PDFDict } from 'pdf-lib';
import { createServiceRecordPdf } from '../../../apps/fieldledger/src/lib/service-record-pdf';
it('exports an independently readable PDF with embedded photo evidence and immutable snapshot metadata', async () => {
  const image = Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64'));
  const report: any = { reportNumber: 'SR-HOD-2026-0001', title: 'Kitchen Exhaust Cleaning Service Record', generatedAt: '2026-09-08', outcome: 'completed_with_exceptions', disclaimer: 'Operator observations.', snapshot: { organizationName: 'Original Service Co', siteName: 'Original Kitchen', customerName: 'Restaurant', address: '123 Test Street', technicianName: 'A Technician', completedAt: '2026-09-08', assets: [{ id: 'asset-1', name: 'Roof fan', assetCode: 'RF-1', location: 'Roof' }] }, results: [{ assetId: 'asset-1', outcome: 'exception', notes: 'Access panel unavailable. Follow up required.', checklist: { fan: true }, photoUrls: ['evidence-before'] }] };
  const bytes = await createServiceRecordPdf(report, async () => image);
  const pdf = await PDFDocument.load(bytes);
  expect(pdf.getAuthor()).toBe('Original Service Co');
  expect(pdf.getTitle()).toBe('SR-HOD-2026-0001');
  expect(pdf.getPageCount()).toBeGreaterThanOrEqual(2);
  expect(pdf.getPages().filter(page => (page.node.Resources()?.lookup(PDFName.of('XObject'), PDFDict)?.keys().length || 0) > 0)).toHaveLength(1);
  await expect(createServiceRecordPdf(report, async () => { throw new Error('Evidence unavailable'); })).rejects.toThrow('Evidence unavailable');
});
