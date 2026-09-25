import { OrganizationComplianceScore } from './types';

export function generateExportableComplianceReport(score: OrganizationComplianceScore, orgName: string): string {
  const dateFormatted = new Date(score.generatedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return `
================================================================================
                   FIELDLEDGER DOCUMENT REVIEW WORKSHEET
================================================================================
ORGANIZATION:   ${orgName} (Org ID: ${score.organizationId})
DATE GENERATED: ${dateFormatted}
REVIEW STATUS:  ${score.auditReadinessLevel.replace(/_/g, ' ')}
OVERALL SCORE:  ${score.overallScorePercentage}% (${score.metRequirements}/${score.totalRequirements} Requirements Met)
--------------------------------------------------------------------------------

EXECUTIVE SUMMARY:
- Human-verified current items:  ${score.metRequirements}
- Expiring Within 30-60 Days:   ${score.expiringCount}
- Critical Deficiencies:        ${score.deficientCount}

--------------------------------------------------------------------------------
REQUIREMENTS & EVIDENCE BREAKDOWN:
--------------------------------------------------------------------------------
${score.items
  .map((item, idx) => {
    const docInfo = item.evidenceDocument
      ? `\n  - Evidence: ${item.evidenceDocument.issuerName} (#${item.evidenceDocument.policyOrCertNumber})\n  - Valid Thru: ${new Date(item.evidenceDocument.expirationDate).toLocaleDateString()}`
      : '\n  - Evidence: [NO VALID CERTIFICATE ON FILE]';

    const warnings = item.missingItems.length > 0
      ? `\n  - Action Needed: ${item.missingItems.join('; ')}`
      : '';

    return `[${idx + 1}] ${item.requirementTitle.toUpperCase()} [${item.category}]
  - Status: ${item.status}${docInfo}${warnings}`;
  })
  .join('\n\n')}

================================================================================
NOTICE: This worksheet organizes user-provided document fields. It is not a
certificate, regulatory determination, or substitute for source-document review.
================================================================================
`.trim();
}
