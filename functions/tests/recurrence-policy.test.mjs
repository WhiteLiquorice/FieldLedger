import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { serviceAssetUpdate } = require('../lib/jobs/recurrence-policy.js');
test('unable visits and older completions do not advance or regress service dates', () => {
  const schedule = { unit: 'months', interval: 3 };
  assert.equal(serviceAssetUpdate('hood_cleaning', { lastServicedAt: '2026-06-01T00:00:00.000Z' }, { outcome: 'completed' }, '2026-05-01T00:00:00.000Z', schedule), null);
  const unable = serviceAssetUpdate('hood_cleaning', {}, { outcome: 'unable' }, '2026-05-01T00:00:00.000Z', schedule);
  assert.equal(unable.status, 'service_required');
  assert.equal(unable.lastServicedAt, undefined);
  assert.equal(unable.nextServiceDueAt, undefined);
  const completed = serviceAssetUpdate('hood_cleaning', {}, { outcome: 'completed' }, '2026-01-31T00:00:00.000Z', { unit: 'months', interval: 1 });
  assert.equal(completed.nextServiceDueAt, '2026-02-28T00:00:00.000Z');
});
