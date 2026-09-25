import { describe, it, expect } from 'vitest';
import {
  ExtinguisherAssetSchema,
  GreaseTrapAssetSchema,
  HoodSystemAssetSchema,
  DeficiencySchema,
  OrganizationSchema,
} from '../src/validators/schemas';

describe('Zod Schema Validation Guards', () => {
  it('validates a complete ExtinguisherAsset object', () => {
    const validAsset = {
      id: 'ext-01',
      orgId: 'org-99',
      customerId: 'cust-10',
      siteId: 'site-20',
      qrCode: 'EXT-QR-12345',
      serialNumber: 'SN-987654',
      manufacturer: 'Amerex',
      model: 'B402',
      type: 'ABC_Dry_Chemical',
      capacityLbs: 5,
      mfgYear: 2023,
      roomOrArea: 'Kitchen Line',
      status: 'pass',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const parsed = ExtinguisherAssetSchema.safeParse(validAsset);
    expect(parsed.success).toBe(true);
  });

  it('rejects an invalid ExtinguisherAsset with missing mandatory fields', () => {
    const invalidAsset = {
      id: 'ext-01',
      // missing orgId, customerId, siteId, serialNumber, etc.
      type: 'INVALID_TYPE',
    };

    const parsed = ExtinguisherAssetSchema.safeParse(invalidAsset);
    expect(parsed.success).toBe(false);
  });

  it('validates a GreaseTrapAsset object', () => {
    const validTrap = {
      id: 'trap-01',
      orgId: 'org-99',
      customerId: 'cust-10',
      siteId: 'site-20',
      trapType: 'gravity',
      capacityGallons: 750,
      locationDescription: 'Exterior underground vault south of kitchen',
      serviceIntervalDays: 60,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const parsed = GreaseTrapAssetSchema.safeParse(validTrap);
    expect(parsed.success).toBe(true);
  });

  it('validates a HoodSystemAsset object', () => {
    const validHood = {
      id: 'hood-01',
      orgId: 'org-99',
      customerId: 'cust-10',
      siteId: 'site-20',
      systemName: 'Main Cookline Hood',
      locationDescription: 'Ground Floor Kitchen',
      ductType: 'welded_steel',
      fanType: 'upblast_roof',
      fanHingesInstalled: true,
      accessPanelsCount: 4,
      cookingVolume: 'high',
      serviceIntervalMonths: 3,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const parsed = HoodSystemAssetSchema.safeParse(validHood);
    expect(parsed.success).toBe(true);
  });

  it('validates a Deficiency object', () => {
    const validDeficiency = {
      id: 'def-01',
      orgId: 'org-99',
      jobId: 'job-100',
      customerId: 'cust-10',
      siteId: 'site-20',
      assetId: 'ext-01',
      assetType: 'extinguisher',
      issueTitle: 'Pressure Gauge in Recharge Zone',
      description: 'Extinguisher pressure is low, missing inspection tag.',
      severity: 'major',
      status: 'open',
      photoUrls: ['https://example.com/photo1.jpg'],
      recommendedAction: 'Recharge or replace unit immediately.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const parsed = DeficiencySchema.safeParse(validDeficiency);
    expect(parsed.success).toBe(true);
  });

  it('requires exactly one immutable organization vertical', () => {
    const organization = {
      id: 'org-99',
      name: 'Ozark Hood Service',
      slug: 'ozark-hood-service',
      branding: {
        companyName: 'Ozark Hood Service',
        phone: '417-555-0100',
        email: 'owner@example.com',
        address: '100 Main St',
        city: 'Springfield',
        state: 'MO',
        zip: '65806',
      },
      vertical: 'hood_cleaning',
      subscriptionTier: 'starter',
      maxUsers: 3,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    expect(OrganizationSchema.safeParse(organization).success).toBe(true);
    expect(OrganizationSchema.safeParse({
      ...organization,
      vertical: undefined,
      activeVerticals: ['hood_cleaning', 'grease_trap'],
    }).success).toBe(false);
  });
});
