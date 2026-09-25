export type GreaseTrapType = 
  | 'hydro' 
  | 'gravity' 
  | 'indoor_interceptor' 
  | 'outdoor_vault' 
  | 'automatic_grease_removal_unit';

export type TrapCondition = 'good' | 'heavy_fog' | 'baffle_damaged' | 'needs_cleaning' | 'needs_repair';

export type WasteType = 'grease_fog' | 'septage' | 'mixed' | 'yellow_grease';

export interface GreaseTrapAsset {
  id: string;
  orgId: string;
  customerId: string;
  siteId: string;
  internalId?: string;
  trapType: GreaseTrapType;
  capacityGallons: number;
  flowRateGpm?: number;
  locationDescription: string;
  accessNotes?: string;
  
  // Recurrence configuration
  serviceIntervalDays: number; // e.g. 30, 60, 90, 180
  
  lastPumpedAt?: string;
  nextPumpDueAt?: string;
  lastGallonsRemoved?: number;
  lastCondition?: TrapCondition;
  
  defaultDisposalFacility?: {
    name: string;
    permitNumber?: string;
    address?: string;
  };
  
  photos?: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GreaseTrapServiceResult {
  assetId: string;
  arrivalAt: string;
  completedAt: string;
  
  gallonsPumped: number;
  inchesGrease?: number;
  inchesSolids?: number;
  totalDepthInches?: number;
  fogPercentage?: number; // 25% rule compliance
  
  baffleCondition: 'intact' | 'deteriorated' | 'missing' | 'na';
  inletOutletInspected: boolean;
  trapScrapedClean: boolean;
  lidReplacedSecurely: boolean;
  
  disposalFacilityName: string;
  disposalManifestNumber?: string;
  wasteType: WasteType;
  
  beforePhotoUrls: string[];
  afterPhotoUrls: string[];
  deficiencyIds?: string[];
  condition: TrapCondition;
  notes?: string;
}
