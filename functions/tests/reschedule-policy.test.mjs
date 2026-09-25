import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateReschedule } from '../lib/jobs/reschedule-policy.js';

test('rescheduling accepts real calendar dates only and preserves started or final jobs', () => {
  assert.equal(validateReschedule('scheduled', '2028-02-29'), '2028-02-29');
  assert.equal(validateReschedule('dispatched', '2026-10-01'), '2026-10-01');
  for (const date of ['2026-02-30', '2026-13-01', 'tomorrow', '2026-1-1']) assert.throws(() => validateReschedule('scheduled', date), /date/i);
  for (const status of ['completed', 'cancelled', 'in_progress']) assert.throws(() => validateReschedule(status, '2026-10-01'), /not started/i);
});
