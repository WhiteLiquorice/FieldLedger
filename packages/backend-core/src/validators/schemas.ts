import { z } from 'zod';

export const ServiceScheduleSchema = z.object({
  unit: z.enum(['days', 'months', 'years']),
  interval: z.number().int().min(1).max(1200),
});

export const ChecklistFieldDefinitionSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9_]*$/),
  label: z.string().min(2).max(160),
  type: z.enum(['boolean', 'select', 'number', 'text', 'photo']),
  required: z.boolean(),
  helpText: z.string().max(500).optional(),
  options: z.array(z.string().min(1).max(100)).max(30).optional(),
  exceptionValues: z.array(z.union([z.string(), z.number(), z.boolean()])).optional(),
}).superRefine((field, ctx) => {
  if (field.type === 'select' && (!field.options || field.options.length < 2)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['options'], message: 'Select fields require at least two options.' });
  }
});

export const VerticalWorkflowConfigSchema = z.object({
  version: z.literal(1),
  vertical: z.enum(['extinguisher', 'grease_trap', 'hood_cleaning']),
  displayName: z.string().min(2).max(100),
  assetLabel: z.string().min(2).max(60),
  assetLabelPlural: z.string().min(2).max(80),
  jobLabel: z.string().min(2).max(80),
  coreQuestion: z.string().min(10).max(240),
  checklist: z.array(ChecklistFieldDefinitionSchema).min(4).max(50),
  schedule: ServiceScheduleSchema.extend({
    allowTechnicianOverride: z.literal(true),
    source: z.literal('company_default'),
  }),
  report: z.object({
    title: z.string().min(3).max(120),
    claimMode: z.literal('service_record'),
    standardReference: z.string().max(500).optional(),
    disclaimer: z.string().min(20).max(1000),
  }),
});

export const UserRoleSchema = z.enum(['owner', 'manager', 'technician', 'client']);
export const ComplianceVerticalSchema = z.enum(['extinguisher', 'grease_trap', 'hood_cleaning']);

export const OrganizationBrandingSchema = z.object({
  logoUrl: z.string().url().optional(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  companyName: z.string().min(1),
  phone: z.string().min(5),
  email: z.string().email(),
  address: z.string().min(1),
  city: z.string().min(1),
  state: z.string().length(2),
  zip: z.string().min(5),
  licenseNumber: z.string().optional(),
});

export const OrganizationSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  slug: z.string().min(1),
  branding: OrganizationBrandingSchema,
  vertical: ComplianceVerticalSchema,
  subscriptionTier: z.enum(['starter', 'custom']),
  maxUsers: z.number().int().positive(),
  maxAssets: z.number().int().positive().optional(),
  maxTrucks: z.number().int().positive().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const ExtinguisherTypeSchema = z.enum([
  'ABC_Dry_Chemical',
  'CO2',
  'Class_K_Wet_Chemical',
  'Water_Pressurized',
  'Halotron_Clean_Agent',
  'Purple_K',
  'Class_D_Dry_Powder',
  'Other',
]);

export const ExtinguisherStatusSchema = z.enum([
  'pass',
  'service_required',
  'replace',
  'missing',
  'inaccessible',
  'decommissioned',
]);

export const ExtinguisherAssetSchema = z.object({
  id: z.string().min(1),
  orgId: z.string().min(1),
  customerId: z.string().min(1),
  siteId: z.string().min(1),
  qrCode: z.string().min(1),
  barcode: z.string().optional(),
  serialNumber: z.string().min(1),
  internalId: z.string().optional(),
  manufacturer: z.string().min(1),
  model: z.string().min(1),
  type: ExtinguisherTypeSchema,
  capacityLbs: z.number().positive(),
  mfgYear: z.number().int().min(1950).max(2100),
  building: z.string().optional(),
  floor: z.string().optional(),
  roomOrArea: z.string().min(1),
  locationDetails: z.string().optional(),
  lastMonthlyVisualAt: z.string().datetime().optional(),
  lastAnnualInspectionAt: z.string().datetime().optional(),
  lastSixYearMaintenanceAt: z.string().datetime().optional(),
  lastHydrostaticTestAt: z.string().datetime().optional(),
  nextMonthlyDueAt: z.string().datetime().optional(),
  nextAnnualDueAt: z.string().datetime().optional(),
  nextSixYearDueAt: z.string().datetime().optional(),
  nextHydroDueAt: z.string().datetime().optional(),
  status: ExtinguisherStatusSchema,
  photoUrl: z.string().url().optional(),
  notes: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const ExtinguisherChecklistResultSchema = z.object({
  assetId: z.string().min(1),
  qrScanned: z.boolean(),
  gaugePressureStatus: z.enum(['pass', 'recharge', 'overcharged', 'na']),
  sealAndPinIntact: z.boolean(),
  hoseAndNozzleClear: z.boolean(),
  physicalDamageFound: z.boolean(),
  mountingHeightCompliant: z.boolean(),
  operatingInstructionsLegible: z.boolean(),
  cabinetOrAreaAccessible: z.boolean(),
  hydroTestOverdue: z.boolean(),
  sixYearMaintenanceOverdue: z.boolean(),
  resultStatus: ExtinguisherStatusSchema,
  deficiencyIds: z.array(z.string()).optional(),
  photoUrls: z.array(z.string().url()).optional(),
  notes: z.string().optional(),
  inspectedAt: z.string().datetime(),
});

export const GreaseTrapTypeSchema = z.enum([
  'hydro',
  'gravity',
  'indoor_interceptor',
  'outdoor_vault',
  'automatic_grease_removal_unit',
]);

export const GreaseTrapAssetSchema = z.object({
  id: z.string().min(1),
  orgId: z.string().min(1),
  customerId: z.string().min(1),
  siteId: z.string().min(1),
  internalId: z.string().optional(),
  trapType: GreaseTrapTypeSchema,
  capacityGallons: z.number().int().positive(),
  flowRateGpm: z.number().positive().optional(),
  locationDescription: z.string().min(1),
  accessNotes: z.string().optional(),
  serviceIntervalDays: z.number().int().positive(),
  lastPumpedAt: z.string().datetime().optional(),
  nextPumpDueAt: z.string().datetime().optional(),
  lastGallonsRemoved: z.number().positive().optional(),
  lastCondition: z.enum(['good', 'heavy_fog', 'baffle_damaged', 'needs_cleaning', 'needs_repair']).optional(),
  defaultDisposalFacility: z.object({
    name: z.string().min(1),
    permitNumber: z.string().optional(),
    address: z.string().optional(),
  }).optional(),
  photos: z.array(z.string().url()).optional(),
  notes: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const HoodSystemAssetSchema = z.object({
  id: z.string().min(1),
  orgId: z.string().min(1),
  customerId: z.string().min(1),
  siteId: z.string().min(1),
  internalId: z.string().optional(),
  systemName: z.string().min(1),
  locationDescription: z.string().min(1),
  hoodLengthFeet: z.number().positive().optional(),
  ductType: z.enum(['welded_steel', 'stainless', 'galvanized', 'unknown']),
  fanType: z.enum(['upblast_roof', 'inline', 'utility_set', 'side_wall']),
  fanHingesInstalled: z.boolean(),
  accessPanelsCount: z.number().int().nonnegative(),
  cookingVolume: z.enum(['low', 'medium', 'high', 'solid_fuel']),
  serviceIntervalMonths: z.number().int().positive(),
  lastCleanedAt: z.string().datetime().optional(),
  nextCleaningDueAt: z.string().datetime().optional(),
  lastCondition: z.enum([
    'cleaned_to_bare_metal',
    'moderate_buildup',
    'excessive_buildup',
    'inaccessible_areas',
    'deficiencies_found',
  ]).optional(),
  photos: z.array(z.string().url()).optional(),
  notes: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const DeficiencySchema = z.object({
  id: z.string().min(1),
  orgId: z.string().min(1),
  jobId: z.string().min(1),
  customerId: z.string().min(1),
  siteId: z.string().min(1),
  assetId: z.string().min(1),
  assetType: z.enum(['extinguisher', 'grease_trap', 'hood_system']),
  issueTitle: z.string().min(1),
  description: z.string().min(1),
  severity: z.enum(['minor', 'major', 'critical']),
  status: z.enum(['open', 'quoted', 'scheduled_repair', 'resolved']),
  photoUrls: z.array(z.string().url()),
  recommendedAction: z.string().min(1),
  estimatedCostCents: z.number().int().nonnegative().optional(),
  resolvedAt: z.string().datetime().optional(),
  resolvedByTechId: z.string().optional(),
  resolutionNotes: z.string().optional(),
  resolutionPhotoUrls: z.array(z.string().url()).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
