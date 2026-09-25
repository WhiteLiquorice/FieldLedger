import { describe, it, expect } from 'vitest';
import {
  formatReportNumber,
  parseReportNumber,
  getVerticalPrefix,
  generateDeterministicReportNumber,
} from '../src/engines/reporting.js';

describe('Reporting engine', () => {
  describe('getVerticalPrefix', () => {
    it('maps verticals to 3-letter uppercase prefixes', () => {
      expect(getVerticalPrefix('extinguisher')).toBe('EXT');
      expect(getVerticalPrefix('grease_trap')).toBe('GRE');
      expect(getVerticalPrefix('hood_cleaning')).toBe('HOD');
    });
  });

  describe('formatReportNumber', () => {
    it('formats sequential numbers as SR-<PREFIX>-<YEAR>-<4+ DIGITS>', () => {
      expect(formatReportNumber('extinguisher', 2026, 1)).toBe('SR-EXT-2026-0001');
      expect(formatReportNumber('grease_trap', 2026, 42)).toBe('SR-GRE-2026-0042');
      expect(formatReportNumber('hood_cleaning', 2026, 1234)).toBe('SR-HOD-2026-1234');
      expect(formatReportNumber('extinguisher', 2026, 10005)).toBe('SR-EXT-2026-10005');
    });
  });

  describe('parseReportNumber', () => {
    it('extracts vertical prefix, year, and sequence from report number', () => {
      const parsed = parseReportNumber('SR-EXT-2026-0042');
      expect(parsed).toEqual({
        verticalPrefix: 'EXT',
        year: 2026,
        sequence: 42,
      });
    });

    it('returns null for invalid report number format', () => {
      expect(parseReportNumber('INVALID-NUMBER')).toBeNull();
      expect(parseReportNumber('SR-2026-01')).toBeNull();
    });
  });

  describe('generateDeterministicReportNumber', () => {
    it('creates deterministic report number for fallback or demo modes', () => {
      const num1 = generateDeterministicReportNumber('extinguisher', 'job-abc-123', 2026);
      const num2 = generateDeterministicReportNumber('extinguisher', 'job-abc-123', 2026);
      expect(num1).toBe(num2);
      expect(num1).toMatch(/^SR-EXT-2026-\d{4}$/);
    });
  });
});
