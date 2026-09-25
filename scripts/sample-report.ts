import fs from 'node:fs';
import { createServiceRecordPdf } from '../apps/fieldledger/src/lib/service-record-pdf';
import type { ReportRecord } from '../apps/fieldledger/src/domain';

async function main() {
  const report: ReportRecord = {
    id: 'sample', orgId: 'sample', jobId: 'sample', vertical: 'hood_cleaning', customerId: 'sample', siteId: 'sample',
    reportNumber: 'SAMPLE-SR-HOD-2026-0001', title: 'Kitchen Exhaust Cleaning Service Record', outcome: 'completed_with_exceptions', generatedAt: '2026-09-09T06:30:00.000Z',
    snapshot: {
      organizationName: 'FieldLedger - Fictional Service Company', customerName: 'Example Restaurant', siteName: 'Main Kitchen', address: '100 Example Street, Sample City', technicianName: 'Sample Technician', completedAt: '2026-09-09T06:30:00.000Z',
      checklistLabels: { cleaned: 'Areas and components cleaned', inaccessible: 'Inaccessible areas', deficiencies: 'Observed deficiencies', next_visit: 'Proposed next visit' },
      assets: [{ id: 'hood', name: 'Main cookline exhaust hood', assetCode: 'HOOD-001', location: 'Main kitchen, north cookline' }],
    },
    disclaimer: 'FICTIONAL SAMPLE. Names, observations and generated images are illustrative. No work was performed or verified. FieldLedger records contractor-entered observations; it does not independently certify compliance or guarantee acceptance.',
    results: [{ assetId: 'hood', outcome: 'exception', notes: 'Sample follow-up: arrange access to the locked rooftop enclosure before the next visit. This example demonstrates how an unresolved access issue appears in a customer record.', checklist: { cleaned: 'Canopy interior, removable baffle filters and accessible plenum (example only).', inaccessible: 'Rooftop fan enclosure locked; fan and upper duct not serviced (example only).', deficiencies: 'Roof access required for remaining areas. No claim is made about inaccessible sections.', next_visit: 'December 9, 2026 - confirm with customer.', photo_label_0: 'Illustrative before/after panels - generated images, not field evidence' }, photoUrls: ['illustrative-hood-cleaning.png'] }],
  };
  const bytes = await createServiceRecordPdf(report, async () => new Uint8Array(fs.readFileSync('output/pdf/illustrative-hood-cleaning.png')));
  fs.mkdirSync('output/pdf', { recursive: true });
  fs.writeFileSync('output/pdf/FieldLedger-Sample-Service-Record.pdf', bytes);
  console.log('Created output/pdf/FieldLedger-Sample-Service-Record.pdf using the application PDF renderer.');
}
void main();
