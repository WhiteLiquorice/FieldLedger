export type ExtinguisherType = 
  | 'ABC_Dry_Chemical' 
  | 'CO2' 
  | 'Class_K_Wet_Chemical' 
  | 'Water_Pressurized' 
  | 'Halotron_Clean_Agent' 
  | 'Purple_K' 
  | 'Class_D_Dry_Powder' 
  | 'Other';

export type ExtinguisherStatus = 
  | 'pass' 
  | 'service_required' 
  | 'replace' 
  | 'missing' 
  | 'inaccessible' 
  | 'decommissioned';

export interface ExtinguisherAsset {
  id: string;
  orgId: string;
  customerId: string;
  siteId: string;
  qrCode: string;
  barcode?: string;
  serialNumber: string;
  internalId?: string;
  manufacturer: string;
  model: string;
  type: ExtinguisherType;
  capacityLbs: number;
  mfgYear: number;
  
  // Location Hierarchy
  building?: string;
  floor?: string;
  roomOrArea: string;
  locationDetails?: string;

  // NFPA 10 Compliance Timers
  lastMonthlyVisualAt?: string;
  lastAnnualInspectionAt?: string;
  lastSixYearMaintenanceAt?: string;
  lastHydrostaticTestAt?: string;
  
  nextMonthlyDueAt?: string;
  nextAnnualDueAt?: string;
  nextSixYearDueAt?: string;
  nextHydroDueAt?: string;

  status: ExtinguisherStatus;
  photoUrl?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExtinguisherChecklistResult {
  assetId: string;
  qrScanned: boolean;
  gaugePressureStatus: 'pass' | 'recharge' | 'overcharged' | 'na';
  sealAndPinIntact: boolean;
  hoseAndNozzleClear: boolean;
  physicalDamageFound: boolean;
  mountingHeightCompliant: boolean;
  operatingInstructionsLegible: boolean;
  cabinetOrAreaAccessible: boolean;
  hydroTestOverdue: boolean;
  sixYearMaintenanceOverdue: boolean;
  resultStatus: ExtinguisherStatus;
  deficiencyIds?: string[];
  photoUrls?: string[];
  notes?: string;
  inspectedAt: string;
}
