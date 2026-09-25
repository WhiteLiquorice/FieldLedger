export const MAX_EVIDENCE_SIZE_BYTES = 20 * 1024 * 1024;

export const ALLOWED_EVIDENCE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export type AllowedEvidenceMimeType = (typeof ALLOWED_EVIDENCE_MIME_TYPES)[number];

export function isAllowedEvidenceMimeType(mimeType: string): mimeType is AllowedEvidenceMimeType {
  return (ALLOWED_EVIDENCE_MIME_TYPES as readonly string[]).includes(mimeType);
}

export interface EvidenceRecord {
  id: string;
  orgId: string;
  jobId: string;
  assetId: string;
  storagePath: string;
  mimeType: AllowedEvidenceMimeType;
  sizeBytes: number;
  sha256?: string;
  tag?: 'before' | 'after' | 'deficiency' | 'nameplate' | 'gauge' | 'duct' | 'signature' | 'other';
  caption?: string;
  uploadedBy: string;
  uploadedAt: string;
}

export function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, '-').slice(-120);
}

export function buildStoragePath(
  orgId: string,
  jobId: string,
  assetId: string,
  filename: string,
  evidenceId?: string
): string {
  const cleanFilename = sanitizeFilename(filename);
  const id = evidenceId || `ev-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
  return `orgs/${orgId}/jobs/${jobId}/assets/${assetId}/${id}-${cleanFilename}`;
}

const STORAGE_PATH_REGEX = /^orgs\/([^/]+)\/jobs\/([^/]+)\/assets\/([^/]+)\/([a-zA-Z0-9_-]+?)-(.*)$/;

export function parseStoragePath(path: string): {
  orgId: string;
  jobId: string;
  assetId: string;
  evidenceId: string;
  filename: string;
} | null {
  const match = STORAGE_PATH_REGEX.exec(path);
  if (!match) return null;
  const [, orgId, jobId, assetId, evidenceId, filename] = match;
  return { orgId, jobId, assetId, evidenceId, filename };
}

export function validateEvidenceUpload(metadata: {
  orgId: string;
  jobId: string;
  assetId: string;
  mimeType: string;
  sizeBytes: number;
}): { valid: boolean; reason?: string } {
  if (!metadata.orgId || !metadata.orgId.trim()) {
    return { valid: false, reason: 'orgId is required.' };
  }
  if (!metadata.jobId || !metadata.jobId.trim()) {
    return { valid: false, reason: 'jobId is required.' };
  }
  if (!metadata.assetId || !metadata.assetId.trim()) {
    return { valid: false, reason: 'assetId is required.' };
  }
  if (!isAllowedEvidenceMimeType(metadata.mimeType)) {
    return {
      valid: false,
      reason: `Unsupported MIME type "${metadata.mimeType}". Allowed: ${ALLOWED_EVIDENCE_MIME_TYPES.join(', ')}.`,
    };
  }
  if (metadata.sizeBytes <= 0 || metadata.sizeBytes > MAX_EVIDENCE_SIZE_BYTES) {
    return {
      valid: false,
      reason: `Evidence size (${metadata.sizeBytes} bytes) exceeds maximum allowed size (${MAX_EVIDENCE_SIZE_BYTES} bytes).`,
    };
  }
  return { valid: true };
}

export function buildEvidenceRecord(params: {
  id?: string;
  orgId: string;
  jobId: string;
  assetId: string;
  storagePath: string;
  mimeType: AllowedEvidenceMimeType;
  sizeBytes: number;
  sha256?: string;
  tag?: 'before' | 'after' | 'deficiency' | 'nameplate' | 'gauge' | 'duct' | 'signature' | 'other';
  caption?: string;
  uploadedBy: string;
  uploadedAt?: string;
}): EvidenceRecord {
  return {
    id: params.id || `ev-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`,
    orgId: params.orgId,
    jobId: params.jobId,
    assetId: params.assetId,
    storagePath: params.storagePath,
    mimeType: params.mimeType,
    sizeBytes: params.sizeBytes,
    sha256: params.sha256,
    tag: params.tag || 'other',
    caption: params.caption,
    uploadedBy: params.uploadedBy,
    uploadedAt: params.uploadedAt || new Date().toISOString(),
  };
}
