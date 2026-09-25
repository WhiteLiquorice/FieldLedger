export function validateReschedule(status: string, date: string): string {
  if (!['scheduled', 'dispatched'].includes(status)) throw new Error('Only visits that have not started can be rescheduled.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(`${date}T12:00:00Z`)) || new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) !== date) throw new Error('Choose a valid calendar date.');
  return date;
}
