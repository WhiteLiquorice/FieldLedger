import { describe, it, expect } from 'vitest';
import { 
  classifyAndExtractComplianceDocument,
  evaluateOrganizationCompliance,
  generateExportableComplianceReport,
  ComplianceRequirement
} from '../src';

describe('FieldLedger AI-Native Compliance Feature Tier', () => {
  const sampleRequirements: ComplianceRequirement[] = [
    {
      id: 'req-wc-01',
      category: 'WORKERS_COMP',
      title: 'State Workers Compensation Policy',
      description: 'Statutory limits for all active field technicians',
      frequency: 'ANNUAL',
      jurisdiction: 'US-TX',
      mandatoryForRoles: ['TECHNICIAN', 'LEAD_INSPECTOR'],
      requiredEvidenceTypes: ['ACORD 25 Certificate of Insurance'],
      expirationWarningDays: 30,
    },
    {
      id: 'req-gl-01',
      category: 'COMMERCIAL_GENERAL_LIABILITY',
      title: 'General Liability Insurance ($2M Aggregate)',
      description: 'Commercial liability coverage for service operations',
      frequency: 'ANNUAL',
      jurisdiction: 'US-TX',
      mandatoryForRoles: ['ALL'],
      requiredEvidenceTypes: ['ACORD 25 Certificate of Insurance'],
      expirationWarningDays: 30,
    },
    {
      id: 'req-nfpa-01',
      category: 'NFPA_CERTIFICATION',
      title: 'NFPA 96 Hood Cleaning Certification',
      description: 'Certified exhaust cleaning technician status',
      frequency: 'BIENNIAL',
      jurisdiction: 'US-NATIONAL',
      mandatoryForRoles: ['HOOD_CLEANER'],
      requiredEvidenceTypes: ['NFPA Certification Card'],
      expirationWarningDays: 45,
    }
  ];

  it('classifies workers comp documents and extracts policy metadata', () => {
    const rawOcr = `
      CERTIFICATE OF INSURANCE
      TRAVELERS INSURANCE COMPANY
      PRODUCER: Commercial Lines Brokerage
      INSURED: Wright Solutions LLC
      COVERAGE: WORKERS COMPENSATION AND EMPLOYERS LIABILITY
      POLICY NUMBER: WC-988421-TX
      EFFECTIVE DATE: 2026-01-01
      EXPIRATION DATE: 2027-01-01
      STATUTORY LIMITS: $1,000,000
    `;

    const extracted = classifyAndExtractComplianceDocument({
      documentId: 'doc-001',
      fileName: 'workers_comp_2026.pdf',
      rawText: rawOcr,
      nowIso: '2026-08-28T00:00:00.000Z',
    });

    expect(extracted.detectedCategory).toBe('WORKERS_COMP');
    expect(extracted.issuerName).toBe('Not extracted — human entry required');
    expect(extracted.policyOrCertNumber).toBe('WC-988421-TX');
    expect(extracted.coverageAmount).toBeUndefined();
    expect(extracted.verifiedByHuman).toBe(false);
  });

  it('detects missing requirements and computes audit score accurately', () => {
    const wcDoc = classifyAndExtractComplianceDocument({
      documentId: 'doc-001',
      fileName: 'workers_comp.pdf',
      rawText: 'Workers Compensation Policy #WC-12345 Expiration: 2026-12-31',
      nowIso: '2026-08-28T00:00:00.000Z',
    });

    const score = evaluateOrganizationCompliance(
      'org-wright-01',
      sampleRequirements,
      [wcDoc],
      '2026-08-28T00:00:00.000Z'
    );

    expect(score.totalRequirements).toBe(3);
    expect(score.metRequirements).toBe(0);
    expect(score.deficientCount).toBe(3);
    expect(score.overallScorePercentage).toBe(0);
    expect(score.items[0].status).toBe('PENDING_VERIFICATION');
    expect(score.auditReadinessLevel).toBe('CRITICAL_DEFICIENCIES');
  });

  it('generates a review worksheet without certification claims', () => {
    const wcDoc = classifyAndExtractComplianceDocument({
      documentId: 'doc-001',
      fileName: 'workers_comp.pdf',
      rawText: 'Workers Compensation Policy #WC-12345 Expiration: 2027-01-01',
      nowIso: '2026-08-28T00:00:00.000Z',
    });

    const score = evaluateOrganizationCompliance(
      'org-wright-01',
      sampleRequirements,
      [wcDoc],
      '2026-08-28T00:00:00.000Z'
    );

    const report = generateExportableComplianceReport(score, 'Wright Solutions Field Services');
    expect(report).toContain('FIELDLEDGER DOCUMENT REVIEW WORKSHEET');
    expect(report).not.toContain('ENTERPRISE COMPLIANCE AUDIT CERTIFICATE');
    expect(report).not.toContain('DIGITAL VERIFICATION SEAL');
    expect(report).toContain('Wright Solutions Field Services');
    expect(report).toContain('STATE WORKERS COMPENSATION POLICY');
  });
});
