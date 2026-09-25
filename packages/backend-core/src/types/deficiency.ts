export type DeficiencySeverity = 'minor' | 'major' | 'critical';

export type DeficiencyStatus = 'open' | 'quoted' | 'scheduled_repair' | 'resolved';

export interface Deficiency {
  id: string;
  orgId: string;
  jobId: string;
  customerId: string;
  siteId: string;
  assetId: string;
  assetType: 'extinguisher' | 'grease_trap' | 'hood_system';
  
  issueTitle: string;
  description: string;
  severity: DeficiencySeverity;
  status: DeficiencyStatus;
  
  photoUrls: string[];
  recommendedAction: string;
  estimatedCostCents?: number;
  
  // Resolution details
  resolvedAt?: string;
  resolvedByTechId?: string;
  resolutionNotes?: string;
  resolutionPhotoUrls?: string[];
  
  createdAt: string;
  updatedAt: string;
}
