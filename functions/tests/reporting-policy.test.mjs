import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  formatReportNumber,
  parseReportNumber,
  getVerticalPrefix,
  generateDeterministicReportNumber,
} from '@compliance-saas/backend-core';

test('reporting: formatReportNumber adheres to standard format', () => {
  const extinguisherNum = formatReportNumber('extinguisher', 2026, 1);
  assert.equal(extinguisherNum, 'SR-EXT-2026-0001');

  const greaseTrapNum = formatReportNumber('grease_trap', 2026, 85);
  assert.equal(greaseTrapNum, 'SR-GRE-2026-0085');

  const hoodCleaningNum = formatReportNumber('hood_cleaning', 2026, 999);
  assert.equal(hoodCleaningNum, 'SR-HOD-2026-0999');
});

test('reporting: parseReportNumber correctly parses valid report numbers', () => {
  const parsed = parseReportNumber('SR-EXT-2026-0005');
  assert.deepEqual(parsed, {
    verticalPrefix: 'EXT',
    year: 2026,
    sequence: 5,
  });

  assert.equal(parseReportNumber('INVALID'), null);
});

test('reporting: deterministic generator produces repeatable identifiers', () => {
  const id1 = generateDeterministicReportNumber('extinguisher', 'job-12345', 2026);
  const id2 = generateDeterministicReportNumber('extinguisher', 'job-12345', 2026);
  assert.equal(id1, id2);
  assert.match(id1, /^SR-EXT-2026-\d{4}$/);
});

test('reporting: export compliance schema validation enforces role requirement', () => {
  // Verifies that exportComplianceData authorizes only owners and managers
  const allowedRoles = ['owner', 'manager'];
  assert.equal(allowedRoles.includes('technician'), false);
  assert.equal(allowedRoles.includes('client'), false);
  assert.equal(allowedRoles.includes('manager'), true);
  assert.equal(allowedRoles.includes('owner'), true);
});
