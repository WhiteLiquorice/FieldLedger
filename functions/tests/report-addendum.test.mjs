import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { buildReportRevision } = require('../lib/jobs/report-revision.js');
test('corrections append attributed notes without changing original results or identity', () => {
  const original = { id: 'job', reportNumber: 'SR-HOD-2026-0001', revision: 1, snapshot: { customerName: 'Original' }, results: [{ notes: 'Original observation' }] };
  const before = structuredClone(original);
  const amended = buildReportRevision(original, original, { id: 'revision', note: 'Access panel was on the north side.', reason: 'Location clarification', authorId: 'owner', authorName: 'Office', createdAt: '2026-09-09T00:00:00.000Z' });
  assert.deepEqual(original, before);
  assert.deepEqual(amended.results, original.results);
  assert.deepEqual(amended.snapshot, original.snapshot);
  assert.equal(amended.revision, 2);
  assert.equal(amended.reportNumber, 'SR-HOD-2026-0001-R2');
  assert.equal(amended.addenda[0].authorId, 'owner');
  assert.equal(amended.previousReportId, 'job');
});
