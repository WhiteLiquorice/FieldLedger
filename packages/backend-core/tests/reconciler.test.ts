import { describe, it, expect } from 'vitest';
import { reconcileExtinguisherSiteInspection } from '../src/engines/reconciler';
import { ExtinguisherAsset, ExtinguisherChecklistResult } from '../src/types/extinguisher';

describe('Missed Asset Reconciler Engine', () => {
  const mockAssets: ExtinguisherAsset[] = [
    {
      id: 'ext-1',
      orgId: 'org-1',
      customerId: 'cust-1',
      siteId: 'site-1',
      qrCode: 'QR-001',
      serialNumber: 'SN-001',
      manufacturer: 'Amerex',
      model: 'B500',
      type: 'ABC_Dry_Chemical',
      capacityLbs: 5,
      mfgYear: 2022,
      building: 'Main Tower',
      floor: '1st Floor',
      roomOrArea: 'Lobby',
      status: 'pass',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'ext-2',
      orgId: 'org-1',
      customerId: 'cust-1',
      siteId: 'site-1',
      qrCode: 'QR-002',
      serialNumber: 'SN-002',
      manufacturer: 'Badger',
      model: 'Advantage',
      type: 'ABC_Dry_Chemical',
      capacityLbs: 10,
      mfgYear: 2021,
      building: 'Main Tower',
      floor: '2nd Floor',
      roomOrArea: 'Breakroom',
      status: 'pass',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'ext-3',
      orgId: 'org-1',
      customerId: 'cust-1',
      siteId: 'site-1',
      qrCode: 'QR-003',
      serialNumber: 'SN-003',
      manufacturer: 'Ansul',
      model: 'Sentry',
      type: 'CO2',
      capacityLbs: 15,
      mfgYear: 2019,
      building: 'Main Tower',
      floor: 'Basement',
      roomOrArea: 'Electrical Room',
      status: 'pass',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ];

  it('detects when an expected extinguisher is missed', () => {
    const inspectedOnlyTwo: ExtinguisherChecklistResult[] = [
      {
        assetId: 'ext-1',
        qrScanned: true,
        gaugePressureStatus: 'pass',
        sealAndPinIntact: true,
        hoseAndNozzleClear: true,
        physicalDamageFound: false,
        mountingHeightCompliant: true,
        operatingInstructionsLegible: true,
        cabinetOrAreaAccessible: true,
        hydroTestOverdue: false,
        sixYearMaintenanceOverdue: false,
        resultStatus: 'pass',
        inspectedAt: '2026-08-17T10:00:00.000Z',
      },
      {
        assetId: 'ext-2',
        qrScanned: true,
        gaugePressureStatus: 'pass',
        sealAndPinIntact: true,
        hoseAndNozzleClear: true,
        physicalDamageFound: false,
        mountingHeightCompliant: true,
        operatingInstructionsLegible: true,
        cabinetOrAreaAccessible: true,
        hydroTestOverdue: false,
        sixYearMaintenanceOverdue: false,
        resultStatus: 'service_required',
        inspectedAt: '2026-08-17T10:15:00.000Z',
      },
    ];

    const report = reconcileExtinguisherSiteInspection(mockAssets, inspectedOnlyTwo);

    expect(report.totalExpected).toBe(3);
    expect(report.totalInspected).toBe(2);
    expect(report.missingCount).toBe(1);
    expect(report.isFullyReconciled).toBe(false);
    expect(report.missingAssets[0].id).toBe('ext-3');
    expect(report.uninspectedLocationList[0]).toContain('Basement - Electrical Room');
    expect(report.passedCount).toBe(1);
    expect(report.failedCount).toBe(1);
  });

  it('reports fully reconciled when all expected units are inspected', () => {
    const inspectedAll: ExtinguisherChecklistResult[] = [
      {
        assetId: 'ext-1',
        qrScanned: true,
        gaugePressureStatus: 'pass',
        sealAndPinIntact: true,
        hoseAndNozzleClear: true,
        physicalDamageFound: false,
        mountingHeightCompliant: true,
        operatingInstructionsLegible: true,
        cabinetOrAreaAccessible: true,
        hydroTestOverdue: false,
        sixYearMaintenanceOverdue: false,
        resultStatus: 'pass',
        inspectedAt: '2026-08-17T10:00:00.000Z',
      },
      {
        assetId: 'ext-2',
        qrScanned: true,
        gaugePressureStatus: 'pass',
        sealAndPinIntact: true,
        hoseAndNozzleClear: true,
        physicalDamageFound: false,
        mountingHeightCompliant: true,
        operatingInstructionsLegible: true,
        cabinetOrAreaAccessible: true,
        hydroTestOverdue: false,
        sixYearMaintenanceOverdue: false,
        resultStatus: 'pass',
        inspectedAt: '2026-08-17T10:15:00.000Z',
      },
      {
        assetId: 'ext-3',
        qrScanned: true,
        gaugePressureStatus: 'pass',
        sealAndPinIntact: true,
        hoseAndNozzleClear: true,
        physicalDamageFound: false,
        mountingHeightCompliant: true,
        operatingInstructionsLegible: true,
        cabinetOrAreaAccessible: true,
        hydroTestOverdue: false,
        sixYearMaintenanceOverdue: false,
        resultStatus: 'pass',
        inspectedAt: '2026-08-17T10:30:00.000Z',
      },
    ];

    const report = reconcileExtinguisherSiteInspection(mockAssets, inspectedAll);

    expect(report.totalExpected).toBe(3);
    expect(report.totalInspected).toBe(3);
    expect(report.missingCount).toBe(0);
    expect(report.isFullyReconciled).toBe(true);
    expect(report.passedCount).toBe(3);
  });
});
