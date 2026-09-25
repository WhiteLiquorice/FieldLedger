import { ExtinguisherAsset, ExtinguisherType } from '../types/extinguisher';
import { CookingVolume } from '../types/hood-cleaning';

export function addDays(date: Date, days: number): Date {
  const result = new Date(date.getTime());
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

export function addMonths(date: Date, months: number): Date {
  const result = new Date(date.getTime());
  const targetDay = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(targetDay, lastDay));
  return result;
}

export function addYears(date: Date, years: number): Date {
  return addMonths(date, years * 12);
}

export function calculateNextServiceDue(
  completedAt: string,
  schedule: { unit: 'days' | 'months' | 'years'; interval: number }
): string {
  const completed = new Date(completedAt);
  if (Number.isNaN(completed.getTime())) throw new Error('completedAt must be a valid ISO date');
  if (!Number.isInteger(schedule.interval) || schedule.interval < 1 || schedule.interval > 1200) {
    throw new Error('schedule interval must be an integer between 1 and 1200');
  }

  if (schedule.unit === 'days') return addDays(completed, schedule.interval).toISOString();
  if (schedule.unit === 'months') return addMonths(completed, schedule.interval).toISOString();
  return addYears(completed, schedule.interval).toISOString();
}

export type ServiceOutcome =
  | 'completed_no_exceptions'
  | 'completed_with_exceptions'
  | 'incomplete';

export function summarizeServiceOutcome(
  totalExpected: number,
  exceptions: number,
  unresolvedOrMissing: number
): ServiceOutcome {
  if (totalExpected < 1 || unresolvedOrMissing > 0) return 'incomplete';
  if (exceptions > 0) return 'completed_with_exceptions';
  return 'completed_no_exceptions';
}

/**
 * Returns the hydrostatic test interval in years based on NFPA 10 standards.
 * Dry chemical (stored pressure), Halon, Halotron: 12 years.
 * CO2, Wet chemical (Class K), Water/AFFF: 5 years.
 */
export function getHydroTestIntervalYears(type: ExtinguisherType): number {
  switch (type) {
    case 'CO2':
    case 'Class_K_Wet_Chemical':
    case 'Water_Pressurized':
      return 5;
    case 'ABC_Dry_Chemical':
    case 'Purple_K':
    case 'Halotron_Clean_Agent':
    case 'Class_D_Dry_Powder':
    default:
      return 12;
  }
}

/**
 * Calculates updated NFPA 10 compliance milestones after an inspection or maintenance event.
 */
export function calculateExtinguisherMilestones(
  asset: Pick<ExtinguisherAsset, 'mfgYear' | 'type' | 'lastSixYearMaintenanceAt' | 'lastHydrostaticTestAt'>,
  serviceDateStr: string,
  serviceType: 'monthly_visual' | 'annual' | 'six_year' | 'hydro_test' = 'annual'
): {
  nextMonthlyDueAt: string;
  nextAnnualDueAt: string;
  nextSixYearDueAt: string;
  nextHydroDueAt: string;
  isHydroDue: boolean;
  isSixYearDue: boolean;
} {
  const serviceDate = new Date(serviceDateStr);
  
  const nextMonthlyDue = addMonths(serviceDate, 1);
  const nextAnnualDue = addYears(serviceDate, 1);
  
  // 6-Year Internal Maintenance due date calculation
  let nextSixYearDue: Date;
  if (serviceType === 'six_year') {
    nextSixYearDue = addYears(serviceDate, 6);
  } else if (asset.lastSixYearMaintenanceAt) {
    nextSixYearDue = addYears(new Date(asset.lastSixYearMaintenanceAt), 6);
  } else {
    // Falls back to mfgYear + 6 in UTC
    nextSixYearDue = new Date(Date.UTC(asset.mfgYear + 6, serviceDate.getUTCMonth(), serviceDate.getUTCDate()));
  }
  
  // Hydrostatic Test due date calculation
  const hydroInterval = getHydroTestIntervalYears(asset.type);
  let nextHydroDue: Date;
  if (serviceType === 'hydro_test') {
    nextHydroDue = addYears(serviceDate, hydroInterval);
  } else if (asset.lastHydrostaticTestAt) {
    nextHydroDue = addYears(new Date(asset.lastHydrostaticTestAt), hydroInterval);
  } else {
    // Falls back to mfgYear + hydroInterval in UTC
    nextHydroDue = new Date(Date.UTC(asset.mfgYear + hydroInterval, serviceDate.getUTCMonth(), serviceDate.getUTCDate()));
  }
  
  return {
    nextMonthlyDueAt: nextMonthlyDue.toISOString(),
    nextAnnualDueAt: nextAnnualDue.toISOString(),
    nextSixYearDueAt: nextSixYearDue.toISOString(),
    nextHydroDueAt: nextHydroDue.toISOString(),
    isHydroDue: nextHydroDue.getTime() <= serviceDate.getTime(),
    isSixYearDue: nextSixYearDue.getTime() <= serviceDate.getTime(),
  };
}

/**
 * Calculates next pumping due date for Grease Traps based on configured interval in days.
 */
export function calculateGreaseTrapNextDue(
  lastPumpedAtStr: string,
  serviceIntervalDays: number
): string {
  const lastPumped = new Date(lastPumpedAtStr);
  return addDays(lastPumped, serviceIntervalDays).toISOString();
}

/**
 * Returns the recommended NFPA 96 cleaning frequency (in months) based on cooking volume.
 * - Solid fuel (wood/charcoal): Monthly (1 mo)
 * - High-volume (24h, wok, charbroil): Quarterly (3 mo)
 * - Moderate-volume: Semi-annually (6 mo)
 * - Low-volume (churches, seasonal): Annually (12 mo)
 */
export function getRecommendedNfpa96IntervalMonths(cookingVolume: CookingVolume): number {
  switch (cookingVolume) {
    case 'solid_fuel':
      return 1;
    case 'high':
      return 3;
    case 'medium':
      return 6;
    case 'low':
      return 12;
  }
}

/**
 * Calculates next cleaning due date for commercial kitchen hood systems.
 */
export function calculateHoodCleaningNextDue(
  lastCleanedAtStr: string,
  intervalMonths: number
): string {
  const lastCleaned = new Date(lastCleanedAtStr);
  return addMonths(lastCleaned, intervalMonths).toISOString();
}

/**
 * Evaluates whether a compliance due date is approaching (within alertWindowDays) or overdue.
 */
export function evaluateComplianceUrgency(
  dueAtStr: string,
  asOfDateStr: string = new Date().toISOString(),
  alertWindowDays: number = 30
): {
  status: 'ok' | 'due_soon' | 'overdue';
  daysRemaining: number;
} {
  const dueAt = new Date(dueAtStr).getTime();
  const asOf = new Date(asOfDateStr).getTime();
  const diffDays = Math.ceil((dueAt - asOf) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { status: 'overdue', daysRemaining: diffDays };
  } else if (diffDays <= alertWindowDays) {
    return { status: 'due_soon', daysRemaining: diffDays };
  } else {
    return { status: 'ok', daysRemaining: diffDays };
  }
}
