import { ComplianceVertical } from './auth';

export interface ComplianceReportMetadata {
  id: string;
  orgId: string;
  jobId: string;
  customerId: string;
  siteId: string;
  vertical: ComplianceVertical;
  
  reportNumber: string; // e.g. "REP-EXT-2026-00124"
  title: string;
  generatedAt: string;
  pdfStoragePath?: string;
  pdfDownloadUrl?: string;
  
  complianceStandard: 'NFPA_10' | 'EPA_FOG_LOCAL_ORDINANCE' | 'NFPA_96' | 'CUSTOM';
  complianceStatus: 'compliant' | 'non_compliant_deficiencies_found' | 'inaccessible_areas';
  
  summary: {
    totalUnitsServiced: number;
    passedUnitsCount: number;
    failedUnitsCount: number;
    openDeficienciesCount: number;
    totalGallonsRemoved?: number;
    nextServiceRecommendedDate: string;
  };
  
  emailDelivery: {
    recipients: string[];
    sentAt?: string;
    deliveryStatus: 'pending' | 'sent' | 'failed';
  };
  
  createdAt: string;
  updatedAt: string;
}
