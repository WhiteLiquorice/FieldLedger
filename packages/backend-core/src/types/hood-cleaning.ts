export type CookingVolume = 'low' | 'medium' | 'high' | 'solid_fuel';

export type HoodCleanlinessCondition = 
  | 'cleaned_to_bare_metal' 
  | 'moderate_buildup' 
  | 'excessive_buildup' 
  | 'inaccessible_areas' 
  | 'deficiencies_found';

export interface HoodSystemAsset {
  id: string;
  orgId: string;
  customerId: string;
  siteId: string;
  internalId?: string;
  systemName: string;
  locationDescription: string;
  hoodLengthFeet?: number;
  ductType: 'welded_steel' | 'stainless' | 'galvanized' | 'unknown';
  fanType: 'upblast_roof' | 'inline' | 'utility_set' | 'side_wall';
  fanHingesInstalled: boolean;
  accessPanelsCount: number;
  cookingVolume: CookingVolume;
  
  // NFPA 96 Service Interval (Months: 1 for solid fuel, 3 for high-vol, 6 for moderate, 12 for low)
  serviceIntervalMonths: number;
  
  lastCleanedAt?: string;
  nextCleaningDueAt?: string;
  lastCondition?: HoodCleanlinessCondition;
  
  photos?: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type CleanedArea = 
  | 'canopy_hood' 
  | 'grease_filters' 
  | 'horizontal_duct' 
  | 'vertical_duct' 
  | 'exhaust_fan' 
  | 'grease_collection_cup' 
  | 'access_panels';

export interface HoodCleaningServiceResult {
  assetId: string;
  startedAt: string;
  completedAt: string;
  
  areasCleaned: CleanedArea[];
  areasInaccessible: string[];
  inaccessibleReason?: string;
  
  fanHingeInspected: boolean;
  fanBeltInspected: boolean;
  accessPanelsCleanedCount: number;
  filtersCleanedAndReinstalled: boolean;
  
  bareMetalAchieved: boolean;
  cleaningMethod: 'hot_water_pressure' | 'chemical_degrease' | 'steam' | 'manual_scrape';
  
  complianceStickerApplied: boolean;
  complianceStickerNumber?: string;
  nextScheduledCleaningDate: string;
  
  beforePhotoUrls: string[];
  afterPhotoUrls: string[];
  deficiencyIds?: string[];
  condition: HoodCleanlinessCondition;
  notes?: string;
}
