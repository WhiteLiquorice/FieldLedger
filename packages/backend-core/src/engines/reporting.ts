import type { ComplianceVertical } from '../types/auth.js';

export function getVerticalPrefix(vertical: ComplianceVertical): string {
  switch (vertical) {
    case 'extinguisher':
      return 'EXT';
    case 'grease_trap':
      return 'GRE';
    case 'hood_cleaning':
      return 'HOD';
    default:
      return 'SVC';
  }
}

export function formatReportNumber(
  vertical: ComplianceVertical,
  year: number,
  sequence: number
): string {
  const prefix = getVerticalPrefix(vertical);
  const seqStr = String(sequence).padStart(4, '0');
  return `SR-${prefix}-${year}-${seqStr}`;
}

const REPORT_NUM_REGEX = /^SR-([A-Z]{3})-(\d{4})-(\d{4,})$/;

export function parseReportNumber(reportNumber: string): {
  verticalPrefix: string;
  year: number;
  sequence: number;
} | null {
  const match = REPORT_NUM_REGEX.exec(reportNumber);
  if (!match) return null;
  return {
    verticalPrefix: match[1],
    year: Number(match[2]),
    sequence: Number(match[3]),
  };
}

export function generateDeterministicReportNumber(
  vertical: ComplianceVertical,
  seed: string,
  year: number = new Date().getFullYear()
): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const sequence = (hash % 9000) + 1000;
  return formatReportNumber(vertical, year, sequence);
}
