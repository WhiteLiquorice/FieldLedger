import { describe, it, expect } from 'vitest';
import {
  calculateExtinguisherMilestones,
  getHydroTestIntervalYears,
  calculateGreaseTrapNextDue,
  calculateHoodCleaningNextDue,
  getRecommendedNfpa96IntervalMonths,
  evaluateComplianceUrgency,
} from '../src/engines/recurrence';

describe('Recurrence Engine', () => {
  describe('Extinguisher NFPA 10 Milestones', () => {
    it('returns 12 years hydro interval for ABC dry chemical and 5 years for CO2/Class K', () => {
      expect(getHydroTestIntervalYears('ABC_Dry_Chemical')).toBe(12);
      expect(getHydroTestIntervalYears('CO2')).toBe(5);
      expect(getHydroTestIntervalYears('Class_K_Wet_Chemical')).toBe(5);
      expect(getHydroTestIntervalYears('Water_Pressurized')).toBe(5);
      expect(getHydroTestIntervalYears('Halotron_Clean_Agent')).toBe(12);
    });

    it('calculates 1-year annual and 6-year/12-year maintenance milestones correctly', () => {
      const asset = {
        mfgYear: 2020,
        type: 'ABC_Dry_Chemical' as const,
      };

      const milestones = calculateExtinguisherMilestones(asset, '2026-08-17T00:00:00.000Z', 'annual');

      // Next annual inspection should be exactly 1 year later
      expect(milestones.nextAnnualDueAt.startsWith('2027-08-17')).toBe(true);
      // Next 6-year maintenance should be 2020 + 6 = 2026
      expect(milestones.nextSixYearDueAt.startsWith('2026-08-17')).toBe(true);
      // Next 12-year hydro should be 2020 + 12 = 2032
      expect(milestones.nextHydroDueAt.startsWith('2032-08-17')).toBe(true);
      expect(milestones.isHydroDue).toBe(false);
      expect(milestones.isSixYearDue).toBe(true);
    });
  });

  describe('Grease Trap FOG Interval Calculation', () => {
    it('calculates next pump date based on 90-day interval', () => {
      const nextDue = calculateGreaseTrapNextDue('2026-01-01T00:00:00.000Z', 90);
      expect(nextDue.startsWith('2026-04-01')).toBe(true);
    });
  });

  describe('Hood Cleaning NFPA 96 Frequency', () => {
    it('maps cooking volume to NFPA 96 recommended interval months', () => {
      expect(getRecommendedNfpa96IntervalMonths('solid_fuel')).toBe(1);
      expect(getRecommendedNfpa96IntervalMonths('high')).toBe(3);
      expect(getRecommendedNfpa96IntervalMonths('medium')).toBe(6);
      expect(getRecommendedNfpa96IntervalMonths('low')).toBe(12);
    });

    it('calculates next cleaning due date properly', () => {
      const nextDue = calculateHoodCleaningNextDue('2026-06-15T00:00:00.000Z', 3);
      expect(nextDue.startsWith('2026-09-15')).toBe(true);
    });
  });

  describe('Compliance Urgency Evaluation', () => {
    it('identifies overdue, due_soon, and ok statuses', () => {
      const today = '2026-08-17T00:00:00.000Z';
      
      const overdue = evaluateComplianceUrgency('2026-08-10T00:00:00.000Z', today, 30);
      expect(overdue.status).toBe('overdue');
      expect(overdue.daysRemaining).toBeLessThan(0);

      const dueSoon = evaluateComplianceUrgency('2026-08-25T00:00:00.000Z', today, 30);
      expect(dueSoon.status).toBe('due_soon');
      expect(dueSoon.daysRemaining).toBe(8);

      const ok = evaluateComplianceUrgency('2026-11-01T00:00:00.000Z', today, 30);
      expect(ok.status).toBe('ok');
      expect(ok.daysRemaining).toBeGreaterThan(30);
    });
  });
});
