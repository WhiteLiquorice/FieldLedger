export function formatServiceDate(value?: string, timeZone?: string): string {
  if (!value) return 'Not recorded';
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', ...(dateOnly ? { timeZone: 'UTC' } : timeZone ? { timeZone } : {}) }).format(new Date(value));
}
