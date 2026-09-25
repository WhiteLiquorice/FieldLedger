import { normalizeImportIdentity } from '@compliance-saas/backend-core';

export function importSiteIdentity(data: Record<string, any>): string {
  const street = typeof data.address === 'string' ? data.address : data.address?.street;
  return normalizeImportIdentity(String(data.customerId || ''), String(data.siteName || ''), String(street || ''));
}

export function importAssetIdentity(data: Record<string, any>): string {
  return normalizeImportIdentity(String(data.siteId || ''), String(data.assetCode || data.qrCode || data.internalId || ''));
}
