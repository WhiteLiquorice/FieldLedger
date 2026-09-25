import { Organization } from '../types/auth';
import { Customer, SiteLocation } from '../types/customer';
import { ExtinguisherAsset, ExtinguisherChecklistResult } from '../types/extinguisher';
import { GreaseTrapAsset, GreaseTrapServiceResult } from '../types/grease-trap';
import { HoodSystemAsset, HoodCleaningServiceResult } from '../types/hood-cleaning';
import { ServiceJob } from '../types/job';
import { Deficiency } from '../types/deficiency';

export interface Nfpa10ReportDocument {
  reportType: 'NFPA_10_ANNUAL_INSPECTION_CERTIFICATE';
  companyInfo: Organization['branding'];
  clientInfo: {
    customerName: string;
    siteName: string;
    siteAddress: string;
  };
  jobDetails: {
    jobId: string;
    serviceDate: string;
    technicianName: string;
    completionTime: string;
  };
  summary: {
    totalUnitsExpected: number;
    totalUnitsInspected: number;
    unitsPassed: number;
    unitsFailed: number;
    unitsInaccessible: number;
    openDeficienciesCount: number;
  };
  inspectedItems: Array<{
    serialNumber: string;
    qrCode: string;
    type: string;
    capacity: number;
    location: string;
    mfgYear: number;
    status: string;
    notes?: string;
  }>;
  deficiencies: Array<{
    severity: string;
    issue: string;
    recommendedAction: string;
    photoUrls: string[];
  }>;
  signatures: {
    technicianSignatureUrl?: string;
    customerSignatureUrl?: string;
    signedByName?: string;
  };
}

export interface EpaFogManifestDocument {
  reportType: 'EPA_FOG_WASTE_PUMPING_MANIFEST';
  haulerInfo: Organization['branding'];
  generatorInfo: {
    businessName: string;
    facilityAddress: string;
    contactPhone: string;
  };
  wasteDetails: {
    serviceDate: string;
    gallonsPumped: number;
    greaseDepthInches?: number;
    solidsDepthInches?: number;
    fogPercentage?: number;
    wasteType: string;
    trapCapacity: number;
    trapLocation: string;
  };
  disposalFacility: {
    facilityName: string;
    permitNumber?: string;
    manifestId?: string;
  };
  signatures: {
    driverSignatureUrl?: string;
    generatorSignatureUrl?: string;
  };
}

export interface Nfpa96HoodReportDocument {
  reportType: 'NFPA_96_EXHAUST_CLEANING_REPORT';
  cleaningCompanyInfo: Organization['branding'];
  restaurantInfo: {
    restaurantName: string;
    locationAddress: string;
  };
  systemDetails: {
    systemName: string;
    ductType: string;
    cookingVolume: string;
    bareMetalAchieved: boolean;
    cleaningMethod: string;
    stickerNumber?: string;
    nextServiceDueDate: string;
  };
  areasCleaned: string[];
  areasInaccessible: string[];
  photos: {
    beforePhotoUrls: string[];
    afterPhotoUrls: string[];
  };
  deficiencies: Array<{
    severity: string;
    description: string;
    recommendedAction: string;
  }>;
}

export function buildNfpa10ReportDocument(
  org: Organization,
  customer: Customer,
  site: SiteLocation,
  job: ServiceJob,
  techName: string,
  assets: ExtinguisherAsset[],
  checklistResults: ExtinguisherChecklistResult[],
  deficiencies: Deficiency[]
): Nfpa10ReportDocument {
  const assetMap = new Map(assets.map((a) => [a.id, a]));

  const inspectedItems = checklistResults.map((res) => {
    const asset = assetMap.get(res.assetId);
    return {
      serialNumber: asset?.serialNumber || 'UNKNOWN',
      qrCode: asset?.qrCode || 'UNKNOWN',
      type: asset?.type || 'Other',
      capacity: asset?.capacityLbs || 0,
      location: [asset?.building, asset?.floor, asset?.roomOrArea].filter(Boolean).join(' / '),
      mfgYear: asset?.mfgYear || 0,
      status: res.resultStatus,
      notes: res.notes,
    };
  });

  const passed = checklistResults.filter((r) => r.resultStatus === 'pass').length;
  const inaccessible = checklistResults.filter((r) => r.resultStatus === 'inaccessible').length;
  const failed = checklistResults.length - passed - inaccessible;

  return {
    reportType: 'NFPA_10_ANNUAL_INSPECTION_CERTIFICATE',
    companyInfo: org.branding,
    clientInfo: {
      customerName: customer.businessName,
      siteName: site.siteName,
      siteAddress: `${site.address.street}, ${site.address.city}, ${site.address.state} ${site.address.zip}`,
    },
    jobDetails: {
      jobId: job.id,
      serviceDate: job.scheduledDate,
      technicianName: techName,
      completionTime: job.completedAt || new Date().toISOString(),
    },
    summary: {
      totalUnitsExpected: assets.length,
      totalUnitsInspected: checklistResults.length,
      unitsPassed: passed,
      unitsFailed: failed,
      unitsInaccessible: inaccessible,
      openDeficienciesCount: deficiencies.length,
    },
    inspectedItems,
    deficiencies: deficiencies.map((d) => ({
      severity: d.severity,
      issue: d.issueTitle,
      recommendedAction: d.recommendedAction,
      photoUrls: d.photoUrls,
    })),
    signatures: {
      technicianSignatureUrl: job.signatures?.technician.signatureUrl,
      customerSignatureUrl: job.signatures?.customer?.signatureUrl,
      signedByName: job.signatures?.customer?.signerName,
    },
  };
}

export function buildEpaFogManifestDocument(
  org: Organization,
  customer: Customer,
  site: SiteLocation,
  job: ServiceJob,
  trap: GreaseTrapAsset,
  result: GreaseTrapServiceResult
): EpaFogManifestDocument {
  return {
    reportType: 'EPA_FOG_WASTE_PUMPING_MANIFEST',
    haulerInfo: org.branding,
    generatorInfo: {
      businessName: customer.businessName,
      facilityAddress: `${site.address.street}, ${site.address.city}, ${site.address.state} ${site.address.zip}`,
      contactPhone: site.siteContact.phone,
    },
    wasteDetails: {
      serviceDate: job.scheduledDate,
      gallonsPumped: result.gallonsPumped,
      greaseDepthInches: result.inchesGrease,
      solidsDepthInches: result.inchesSolids,
      fogPercentage: result.fogPercentage,
      wasteType: result.wasteType,
      trapCapacity: trap.capacityGallons,
      trapLocation: trap.locationDescription,
    },
    disposalFacility: {
      facilityName: result.disposalFacilityName,
      permitNumber: trap.defaultDisposalFacility?.permitNumber,
      manifestId: result.disposalManifestNumber,
    },
    signatures: {
      driverSignatureUrl: job.signatures?.technician.signatureUrl,
      generatorSignatureUrl: job.signatures?.customer?.signatureUrl,
    },
  };
}

export function buildNfpa96HoodReportDocument(
  org: Organization,
  customer: Customer,
  site: SiteLocation,
  hood: HoodSystemAsset,
  result: HoodCleaningServiceResult,
  deficiencies: Deficiency[]
): Nfpa96HoodReportDocument {
  return {
    reportType: 'NFPA_96_EXHAUST_CLEANING_REPORT',
    cleaningCompanyInfo: org.branding,
    restaurantInfo: {
      restaurantName: customer.businessName,
      locationAddress: `${site.address.street}, ${site.address.city}, ${site.address.state} ${site.address.zip}`,
    },
    systemDetails: {
      systemName: hood.systemName,
      ductType: hood.ductType,
      cookingVolume: hood.cookingVolume,
      bareMetalAchieved: result.bareMetalAchieved,
      cleaningMethod: result.cleaningMethod,
      stickerNumber: result.complianceStickerNumber,
      nextServiceDueDate: result.nextScheduledCleaningDate,
    },
    areasCleaned: result.areasCleaned,
    areasInaccessible: result.areasInaccessible,
    photos: {
      beforePhotoUrls: result.beforePhotoUrls,
      afterPhotoUrls: result.afterPhotoUrls,
    },
    deficiencies: deficiencies.map((d) => ({
      severity: d.severity,
      description: d.description,
      recommendedAction: d.recommendedAction,
    })),
  };
}

export function calculateGreaseTrapFOG(
  totalDepthInches: number,
  topGreaseInches: number,
  bottomSludgeInches: number
): {
  totalFOGInches: number;
  fogPercentage: number;
  isViolated: boolean;
} {
  const totalDepth = Math.max(totalDepthInches, 1);
  const totalFOGInches = Math.max(topGreaseInches + bottomSludgeInches, 0);
  const fogPercentage = Math.min((totalFOGInches / totalDepth) * 100, 100);
  return {
    totalFOGInches,
    fogPercentage,
    isViolated: fogPercentage >= 25,
  };
}

