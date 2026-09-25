import { 
  ComplianceRequirement, 
  ExtractedDocumentData, 
  ComplianceItemState, 
  OrganizationComplianceScore 
} from './types';

export function evaluateOrganizationCompliance(
  organizationId: string,
  requirements: ComplianceRequirement[],
  documents: ExtractedDocumentData[],
  nowIso?: string
): OrganizationComplianceScore {
  const now = nowIso ? new Date(nowIso) : new Date();
  const items: ComplianceItemState[] = [];

  let metRequirements = 0;
  let expiringCount = 0;
  let deficientCount = 0;

  for (const req of requirements) {
    const matchingDocs = documents.filter((d) => d.detectedCategory === req.category);
    if (matchingDocs.length === 0) {
      items.push({
        requirementId: req.id,
        requirementTitle: req.title,
        category: req.category,
        status: 'MISSING_EVIDENCE',
        daysUntilExpiration: null,
        lastVerifiedDate: null,
        missingItems: req.requiredEvidenceTypes,
      });
      deficientCount++;
      continue;
    }

    // Sort by latest expiration
    const bestDoc = matchingDocs.sort(
      (a, b) => new Date(b.expirationDate).getTime() - new Date(a.expirationDate).getTime()
    )[0];

    if (!bestDoc.verifiedByHuman) {
      items.push({
        requirementId: req.id,
        requirementTitle: req.title,
        category: req.category,
        status: 'PENDING_VERIFICATION',
        daysUntilExpiration: null,
        lastVerifiedDate: null,
        evidenceDocument: bestDoc,
        missingItems: ['Human confirmation of source fields required'],
      });
      deficientCount++;
      continue;
    }

    const expTime = new Date(bestDoc.expirationDate).getTime();
    const diffDays = Math.ceil((expTime - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      items.push({
        requirementId: req.id,
        requirementTitle: req.title,
        category: req.category,
        status: 'EXPIRED',
        daysUntilExpiration: diffDays,
        lastVerifiedDate: bestDoc.effectiveDate,
        evidenceDocument: bestDoc,
        missingItems: ['Valid unexpired certificate required'],
      });
      deficientCount++;
    } else if (diffDays <= req.expirationWarningDays) {
      items.push({
        requirementId: req.id,
        requirementTitle: req.title,
        category: req.category,
        status: 'EXPIRING_SOON',
        daysUntilExpiration: diffDays,
        lastVerifiedDate: bestDoc.effectiveDate,
        evidenceDocument: bestDoc,
        missingItems: [`Renewal due in ${diffDays} days`],
      });
      expiringCount++;
      metRequirements++;
    } else {
      items.push({
        requirementId: req.id,
        requirementTitle: req.title,
        category: req.category,
        status: 'AUDIT_READY',
        daysUntilExpiration: diffDays,
        lastVerifiedDate: bestDoc.effectiveDate,
        evidenceDocument: bestDoc,
        missingItems: [],
      });
      metRequirements++;
    }
  }

  const totalRequirements = requirements.length;
  const overallScorePercentage = totalRequirements > 0 ? Math.round((metRequirements / totalRequirements) * 100) : 100;

  let auditReadinessLevel: OrganizationComplianceScore['auditReadinessLevel'] = 'CERTIFIED_AUDIT_READY';
  if (overallScorePercentage < 70) {
    auditReadinessLevel = 'CRITICAL_DEFICIENCIES';
  } else if (overallScorePercentage < 95 || expiringCount > 0) {
    auditReadinessLevel = 'NEEDS_ATTENTION';
  }

  return {
    organizationId,
    totalRequirements,
    metRequirements,
    expiringCount,
    deficientCount,
    overallScorePercentage,
    auditReadinessLevel,
    items,
    generatedAt: now.toISOString(),
  };
}
