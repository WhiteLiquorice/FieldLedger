import { ComplianceVertical } from './auth';
import { ExtinguisherChecklistResult } from './extinguisher';
import { GreaseTrapServiceResult } from './grease-trap';
import { HoodCleaningServiceResult } from './hood-cleaning';

export type JobStatus = 'scheduled' | 'dispatched' | 'in_progress' | 'completed' | 'cancelled';

export interface JobSignature {
  signatureUrl: string;
  signerName: string;
  signerTitle?: string;
  signedAt: string;
}

export interface JobSignatures {
  technician: JobSignature;
  customer?: JobSignature;
}

export interface JobPhoto {
  id: string;
  url: string;
  tag: 'before' | 'after' | 'deficiency' | 'nameplate' | 'gauge' | 'duct' | 'signature' | 'other';
  assetId?: string;
  caption?: string;
  capturedAt: string;
}

export interface ServiceJob {
  id: string;
  orgId: string;
  vertical: ComplianceVertical;
  customerId: string;
  siteId: string;
  assignedTechId: string;
  assignedTruckId?: string;
  
  scheduledDate: string; // YYYY-MM-DD
  scheduledTimeWindow?: string; // e.g. "08:00 - 12:00"
  status: JobStatus;
  
  startedAt?: string;
  completedAt?: string;
  
  // Results by vertical
  extinguisherResults?: ExtinguisherChecklistResult[];
  greaseTrapResults?: GreaseTrapServiceResult[];
  hoodCleaningResults?: HoodCleaningServiceResult[];
  
  // Reconciliation summary
  totalExpectedAssets?: number;
  totalInspectedAssets?: number;
  missingAssetsCount?: number;
  
  photos: JobPhoto[];
  deficiencyIds: string[];
  signatures?: JobSignatures;
  
  technicianNotes?: string;
  customerNotes?: string;
  
  reportId?: string;
  createdAt: string;
  updatedAt: string;
}
