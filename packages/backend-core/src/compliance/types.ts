export type ComplianceCategory = 
  | 'WORKERS_COMP'
  | 'COMMERCIAL_GENERAL_LIABILITY'
  | 'OSHA_SAFETY'
  | 'TRADE_LICENSE'
  | 'NFPA_CERTIFICATION'
  | 'EPA_ENVIRONMENTAL';

export type ComplianceFrequency = 'ANNUAL' | 'BIENNIAL' | 'MONTHLY' | 'QUARTERLY' | 'SEMI_ANNUAL' | 'ONE_TIME';

export type RequirementStatus = 'AUDIT_READY' | 'EXPIRING_SOON' | 'EXPIRED' | 'MISSING_EVIDENCE' | 'PENDING_VERIFICATION';

export interface ComplianceRequirement {
  id: string;
  category: ComplianceCategory;
  title: string;
  description: string;
  frequency: ComplianceFrequency;
  jurisdiction: string;
  mandatoryForRoles: string[];
  requiredEvidenceTypes: string[];
  expirationWarningDays: number;
}

export interface ExtractedDocumentData {
  documentId: string;
  fileName: string;
  detectedCategory: ComplianceCategory;
  issuerName: string;
  policyOrCertNumber: string;
  effectiveDate: string; // ISO 8601
  expirationDate: string; // ISO 8601
  coverageAmount?: number;
  coveredEntities: string[];
  confidenceScore: number; // 0.0 - 1.0
  verifiedByHuman: boolean;
}

export interface ComplianceItemState {
  requirementId: string;
  requirementTitle: string;
  category: ComplianceCategory;
  status: RequirementStatus;
  daysUntilExpiration: number | null;
  lastVerifiedDate: string | null;
  evidenceDocument?: ExtractedDocumentData;
  missingItems: string[];
}

export interface OrganizationComplianceScore {
  organizationId: string;
  totalRequirements: number;
  metRequirements: number;
  expiringCount: number;
  deficientCount: number;
  overallScorePercentage: number; // 0 - 100
  auditReadinessLevel: 'CERTIFIED_AUDIT_READY' | 'NEEDS_ATTENTION' | 'CRITICAL_DEFICIENCIES';
  items: ComplianceItemState[];
  generatedAt: string;
}
