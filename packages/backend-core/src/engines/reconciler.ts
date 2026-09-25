import { ExtinguisherAsset, ExtinguisherChecklistResult } from '../types/extinguisher';

export interface ReconciliationReport {
  totalExpected: number;
  totalInspected: number;
  missingCount: number;
  passedCount: number;
  failedCount: number;
  inaccessibleCount: number;
  isFullyReconciled: boolean;
  missingAssets: ExtinguisherAsset[];
  uninspectedLocationList: string[];
}

/**
 * Reconciles site inventory against field inspection records to prevent missed units.
 */
export function reconcileExtinguisherSiteInspection(
  expectedAssets: ExtinguisherAsset[],
  inspectedResults: ExtinguisherChecklistResult[]
): ReconciliationReport {
  const inspectedAssetIds = new Set(inspectedResults.map((r) => r.assetId));
  
  // Filter for active assets (ignoring decommissioned ones)
  const activeExpectedAssets = expectedAssets.filter((a) => a.status !== 'decommissioned');
  
  const missingAssets: ExtinguisherAsset[] = [];
  const uninspectedLocationList: string[] = [];
  
  for (const asset of activeExpectedAssets) {
    if (!inspectedAssetIds.has(asset.id)) {
      missingAssets.push(asset);
      const loc = [asset.building, asset.floor, asset.roomOrArea, asset.locationDetails]
        .filter(Boolean)
        .join(' - ');
      uninspectedLocationList.push(`Asset ${asset.serialNumber} (QR: ${asset.qrCode}) at: ${loc || 'Unspecified location'}`);
    }
  }

  let passedCount = 0;
  let failedCount = 0;
  let inaccessibleCount = 0;

  for (const result of inspectedResults) {
    if (result.resultStatus === 'pass') {
      passedCount++;
    } else if (result.resultStatus === 'inaccessible') {
      inaccessibleCount++;
    } else {
      failedCount++;
    }
  }

  return {
    totalExpected: activeExpectedAssets.length,
    totalInspected: inspectedResults.length,
    missingCount: missingAssets.length,
    passedCount,
    failedCount,
    inaccessibleCount,
    isFullyReconciled: missingAssets.length === 0,
    missingAssets,
    uninspectedLocationList,
  };
}
