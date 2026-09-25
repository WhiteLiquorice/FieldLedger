import { calculateNextServiceDue } from '@compliance-saas/backend-core';
export type ServiceSchedule = { unit: 'days' | 'months' | 'years'; interval: number };
export function serviceAssetUpdate(vertical: string, asset: Record<string, any>, result: Record<string, any>, completedAt: string, schedule: ServiceSchedule): Record<string, unknown> | null {
  const previous = asset.lastServiceAttemptAt || asset.lastServicedAt;
  if (previous && Date.parse(previous) > Date.parse(completedAt)) return null;
  const status = result.outcome === 'completed' ? 'ready' : 'service_required';
  const update: Record<string, unknown> = { lastServiceAttemptAt: completedAt, serviceStatus: result.outcome, status };
  if (result.outcome === 'unable') return update;
  const due = calculateNextServiceDue(completedAt, schedule);
  Object.assign(update, { lastServicedAt: completedAt, nextServiceDueAt: due });
  if (vertical === 'hood_cleaning') Object.assign(update, { lastCleanedAt: completedAt, nextCleaningDueAt: due, lastCondition: result.outcome });
  if (vertical === 'extinguisher') Object.assign(update, { lastAnnualInspectionAt: completedAt, nextAnnualDueAt: due });
  if (vertical === 'grease_trap') Object.assign(update, { lastPumpedAt: completedAt, nextPumpDueAt: due, lastGallonsRemoved: Number(result.quantity || 0), lastCondition: result.outcome });
  return update;
}
