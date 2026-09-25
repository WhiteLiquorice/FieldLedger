import { describe, it, expect } from 'vitest';
import {
  buildNfpa10ReportDocument,
  buildEpaFogManifestDocument,
  buildNfpa96HoodReportDocument,
} from '../src/engines/manifest';
import { Organization } from '../src/types/auth';
import { Customer, SiteLocation } from '../src/types/customer';
import { ServiceJob } from '../src/types/job';

describe('Manifest & Compliance Document Builder Engine', () => {
  const mockOrg: Organization = {
    id: 'org-1',
    name: 'Apex Fire & Environmental Services',
    slug: 'apex-fire',
    branding: {
      companyName: 'Apex Fire & Environmental Services',
      phone: '555-0199',
      email: 'compliance@apexfire.com',
      address: '100 Industrial Parkway',
      city: 'Springfield',
      state: 'IL',
      zip: '62701',
      licenseNumber: 'FP-88421-IL',
    },
    vertical: 'extinguisher',
    subscriptionTier: 'starter',
    maxUsers: 6,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  const mockCustomer: Customer = {
    id: 'cust-1',
    orgId: 'org-1',
    businessName: 'The Rusty Anchor Seafood Grill',
    contacts: [
      {
        name: 'Gordon Fisher',
        title: 'General Manager',
        email: 'manager@rustyanchor.com',
        phone: '555-9011',
        isBilling: true,
        isPrimary: true,
      },
    ],
    billingAddress: {
      street: '404 Ocean Blvd',
      city: 'Springfield',
      state: 'IL',
      zip: '62701',
    },
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  const mockSite: SiteLocation = {
    id: 'site-1',
    orgId: 'org-1',
    customerId: 'cust-1',
    siteName: 'Rusty Anchor - Harbor Branch',
    address: {
      street: '404 Ocean Blvd',
      city: 'Springfield',
      state: 'IL',
      zip: '62701',
    },
    siteContact: {
      name: 'Gordon Fisher',
      phone: '555-9011',
    },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  it('builds a valid NFPA 10 Annual Inspection Certificate payload', () => {
    const job: ServiceJob = {
      id: 'job-101',
      orgId: 'org-1',
      vertical: 'extinguisher',
      customerId: 'cust-1',
      siteId: 'site-1',
      assignedTechId: 'tech-1',
      scheduledDate: '2026-08-17',
      status: 'completed',
      photos: [],
      deficiencyIds: [],
      signatures: {
        technician: {
          signatureUrl: 'https://storage.googleapis.com/tech-sig.png',
          signerName: 'Mike Sullivan',
          signedAt: '2026-08-17T11:00:00.000Z',
        },
        customer: {
          signatureUrl: 'https://storage.googleapis.com/cust-sig.png',
          signerName: 'Gordon Fisher',
          signerTitle: 'GM',
          signedAt: '2026-08-17T11:05:00.000Z',
        },
      },
      createdAt: '2026-08-17T08:00:00.000Z',
      updatedAt: '2026-08-17T11:05:00.000Z',
    };

    const doc = buildNfpa10ReportDocument(
      mockOrg,
      mockCustomer,
      mockSite,
      job,
      'Mike Sullivan',
      [],
      [],
      []
    );

    expect(doc.reportType).toBe('NFPA_10_ANNUAL_INSPECTION_CERTIFICATE');
    expect(doc.clientInfo.customerName).toBe('The Rusty Anchor Seafood Grill');
    expect(doc.jobDetails.technicianName).toBe('Mike Sullivan');
    expect(doc.signatures.signedByName).toBe('Gordon Fisher');
  });

  it('builds a valid EPA FOG Waste Manifest payload', () => {
    const job: ServiceJob = {
      id: 'job-102',
      orgId: 'org-1',
      vertical: 'grease_trap',
      customerId: 'cust-1',
      siteId: 'site-1',
      assignedTechId: 'tech-2',
      scheduledDate: '2026-08-17',
      status: 'completed',
      photos: [],
      deficiencyIds: [],
      createdAt: '2026-08-17T08:00:00.000Z',
      updatedAt: '2026-08-17T11:05:00.000Z',
    };

    const trap = {
      id: 'trap-1',
      orgId: 'org-1',
      customerId: 'cust-1',
      siteId: 'site-1',
      trapType: 'gravity' as const,
      capacityGallons: 1000,
      locationDescription: 'Rear parking lot vault',
      serviceIntervalDays: 90,
      defaultDisposalFacility: {
        name: 'Springfield Regional Water Reclamation Facility',
        permitNumber: 'WRF-2026-99',
      },
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };

    const result = {
      assetId: 'trap-1',
      arrivalAt: '2026-08-17T09:00:00.000Z',
      completedAt: '2026-08-17T09:45:00.000Z',
      gallonsPumped: 950,
      inchesGrease: 8,
      inchesSolids: 6,
      fogPercentage: 22,
      baffleCondition: 'intact' as const,
      inletOutletInspected: true,
      trapScrapedClean: true,
      lidReplacedSecurely: true,
      disposalFacilityName: 'Springfield Regional Water Reclamation Facility',
      disposalManifestNumber: 'MAN-2026-0881',
      wasteType: 'grease_fog' as const,
      beforePhotoUrls: [],
      afterPhotoUrls: [],
      condition: 'good' as const,
    };

    const doc = buildEpaFogManifestDocument(mockOrg, mockCustomer, mockSite, job, trap, result);

    expect(doc.reportType).toBe('EPA_FOG_WASTE_PUMPING_MANIFEST');
    expect(doc.wasteDetails.gallonsPumped).toBe(950);
    expect(doc.disposalFacility.manifestId).toBe('MAN-2026-0881');
  });

  it('builds a valid NFPA 96 Hood Service Record payload', () => {
    const hood = {
      id: 'hood-1',
      orgId: 'org-1',
      customerId: 'cust-1',
      siteId: 'site-1',
      systemName: 'Main Line Fryer & Charbroil Hood',
      locationDescription: 'Main Kitchen Line',
      ductType: 'welded_steel' as const,
      fanType: 'upblast_roof' as const,
      fanHingesInstalled: true,
      accessPanelsCount: 3,
      cookingVolume: 'high' as const,
      serviceIntervalMonths: 3,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };

    const result = {
      assetId: 'hood-1',
      startedAt: '2026-08-17T02:00:00.000Z',
      completedAt: '2026-08-17T05:00:00.000Z',
      areasCleaned: ['canopy_hood', 'grease_filters', 'horizontal_duct', 'vertical_duct', 'exhaust_fan'] as any,
      areasInaccessible: [],
      fanHingeInspected: true,
      fanBeltInspected: true,
      accessPanelsCleanedCount: 3,
      filtersCleanedAndReinstalled: true,
      bareMetalAchieved: true,
      cleaningMethod: 'hot_water_pressure' as const,
      complianceStickerApplied: true,
      complianceStickerNumber: 'NFPA96-2026-441',
      nextScheduledCleaningDate: '2026-11-17',
      beforePhotoUrls: ['https://storage.googleapis.com/hood-before.jpg'],
      afterPhotoUrls: ['https://storage.googleapis.com/hood-after.jpg'],
      condition: 'cleaned_to_bare_metal' as const,
    };

    const doc = buildNfpa96HoodReportDocument(mockOrg, mockCustomer, mockSite, hood, result, []);

    expect(doc.reportType).toBe('NFPA_96_EXHAUST_CLEANING_REPORT');
    expect(doc.systemDetails.bareMetalAchieved).toBe(true);
    expect(doc.systemDetails.stickerNumber).toBe('NFPA96-2026-441');
    expect(doc.photos.beforePhotoUrls.length).toBe(1);
    expect(doc.photos.afterPhotoUrls.length).toBe(1);
  });
});
