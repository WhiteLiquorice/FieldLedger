import { expect, it } from 'vitest';
import { formatServiceDate } from '../../../apps/fieldledger/src/lib/format-service-date';
it('keeps date-only service appointments on their recorded calendar day', () => {
  expect(formatServiceDate('2026-10-01', 'America/Chicago')).toBe('Oct 1, 2026');
  expect(formatServiceDate('2026-10-01', 'Pacific/Honolulu')).toBe('Oct 1, 2026');
  expect(formatServiceDate('2026-10-01T00:00:00.000Z', 'America/Chicago')).toBe('Sep 30, 2026');
});
