import { ComplianceCategory, ExtractedDocumentData } from './types';

export interface RawOcrInput {
  documentId: string;
  fileName: string;
  rawText: string;
  nowIso?: string;
}

export function classifyAndExtractComplianceDocument(input: RawOcrInput): ExtractedDocumentData {
  const text = input.rawText.toLowerCase();
  let detectedCategory: ComplianceCategory = 'TRADE_LICENSE';
  const issuerName = 'Not extracted — human entry required';
  let policyOrCertNumber = 'Not extracted';
  const effectiveDate = '';
  let expirationDate = '';
  let coverageAmount: number | undefined = undefined;
  const confidenceScore = 0.60;

  if (text.includes('workers compensation') || text.includes('workers\' comp') || text.includes('statutory limits')) {
    detectedCategory = 'WORKERS_COMP';
  } else if (text.includes('certificate of liability') || text.includes('acord 25') || text.includes('general liability')) {
    detectedCategory = 'COMMERCIAL_GENERAL_LIABILITY';
  } else if (text.includes('osha') || text.includes('form 300') || text.includes('safety training') || text.includes('hazard communication')) {
    detectedCategory = 'OSHA_SAFETY';
  } else if (text.includes('nfpa') || text.includes('fire marshal') || text.includes('kitchen exhaust certification')) {
    detectedCategory = 'NFPA_CERTIFICATION';
  } else if (text.includes('grease') || text.includes('epa') || text.includes('discharge permit') || text.includes('manifest')) {
    detectedCategory = 'EPA_ENVIRONMENTAL';
  }

  // Regex extract policy number if present (e.g. POL-123456 or # 987654)
  const policyMatch = input.rawText.match(/(?:policy|certificate|license|permit)\s*(?:no\.?|number|#)?\s*:?\s*([A-Z0-9-]{5,20})/i);
  if (policyMatch && policyMatch[1]) {
    policyOrCertNumber = policyMatch[1].trim();
  }

  // Regex extract expiration date if present
  const expMatch = input.rawText.match(/(?:expiration|expires|valid through|thru)\s*:?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}-\d{2}-\d{2})/i);
  if (expMatch && expMatch[1]) {
    const parsed = new Date(expMatch[1]);
    if (!isNaN(parsed.getTime())) {
      expirationDate = parsed.toISOString();
    }
  }

  return {
    documentId: input.documentId,
    fileName: input.fileName,
    detectedCategory,
    issuerName,
    policyOrCertNumber,
    effectiveDate,
    expirationDate,
    coverageAmount,
    coveredEntities: [],
    confidenceScore,
    verifiedByHuman: false,
  };
}
