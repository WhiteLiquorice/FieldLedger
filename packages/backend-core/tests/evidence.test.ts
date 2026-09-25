import { describe, it, expect } from 'vitest';
import {
  buildStoragePath,
  parseStoragePath,
  validateEvidenceUpload,
  buildEvidenceRecord,
  isAllowedEvidenceMimeType,
  MAX_EVIDENCE_SIZE_BYTES,
} from '../src/engines/evidence.js';

describe('Evidence engine', () => {
  describe('buildStoragePath', () => {
    it('constructs a canonical storage path adhering to storage rules', () => {
      const path = buildStoragePath('org_123', 'job_456', 'asset_789', 'photo.jpg', 'ev_abc');
      expect(path).toBe('orgs/org_123/jobs/job_456/assets/asset_789/ev_abc-photo.jpg');
    });

    it('sanitizes unsafe characters in the filename', () => {
      const path = buildStoragePath('org_1', 'job_2', 'asset_3', 'my photo (1) [test] #2.png', 'ev_1');
      expect(path).toBe('orgs/org_1/jobs/job_2/assets/asset_3/ev_1-my-photo--1---test---2.png');
    });

    it('auto-generates evidenceId if not provided', () => {
      const path = buildStoragePath('org_1', 'job_2', 'asset_3', 'photo.jpg');
      expect(path).toMatch(/^orgs\/org_1\/jobs\/job_2\/assets\/asset_3\/ev-[a-zA-Z0-9_-]+-photo\.jpg$/);
    });
  });

  describe('parseStoragePath', () => {
    it('parses valid canonical paths into components', () => {
      const parsed = parseStoragePath('orgs/org_123/jobs/job_456/assets/asset_789/ev_abc-photo.jpg');
      expect(parsed).toEqual({
        orgId: 'org_123',
        jobId: 'job_456',
        assetId: 'asset_789',
        evidenceId: 'ev_abc',
        filename: 'photo.jpg',
      });
    });

    it('returns null for non-matching or arbitrary paths', () => {
      expect(parseStoragePath('orgs/org_123/other/file.jpg')).toBeNull();
      expect(parseStoragePath('invalidscheme/path')).toBeNull();
      expect(parseStoragePath('orgs/org_123/jobs/job_456/file.jpg')).toBeNull();
    });
  });

  describe('validateEvidenceUpload', () => {
    it('accepts valid JPEG, PNG, and WebP under 20 MB', () => {
      expect(
        validateEvidenceUpload({
          orgId: 'org_1',
          jobId: 'job_1',
          assetId: 'asset_1',
          mimeType: 'image/jpeg',
          sizeBytes: 5 * 1024 * 1024,
        }).valid
      ).toBe(true);

      expect(
        validateEvidenceUpload({
          orgId: 'org_1',
          jobId: 'job_1',
          assetId: 'asset_1',
          mimeType: 'image/png',
          sizeBytes: 1024,
        }).valid
      ).toBe(true);

      expect(
        validateEvidenceUpload({
          orgId: 'org_1',
          jobId: 'job_1',
          assetId: 'asset_1',
          mimeType: 'image/webp',
          sizeBytes: 19 * 1024 * 1024,
        }).valid
      ).toBe(true);
    });

    it('rejects disallowed mime types like executables or arbitrary files', () => {
      const result = validateEvidenceUpload({
        orgId: 'org_1',
        jobId: 'job_1',
        assetId: 'asset_1',
        mimeType: 'application/pdf',
        sizeBytes: 1000,
      });
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('MIME type');
    });

    it('rejects uploads exceeding 20 MB limit', () => {
      const result = validateEvidenceUpload({
        orgId: 'org_1',
        jobId: 'job_1',
        assetId: 'asset_1',
        mimeType: 'image/jpeg',
        sizeBytes: 21 * 1024 * 1024,
      });
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('exceeds maximum allowed size');
    });

    it('rejects missing organizational metadata', () => {
      const result = validateEvidenceUpload({
        orgId: '',
        jobId: 'job_1',
        assetId: 'asset_1',
        mimeType: 'image/jpeg',
        sizeBytes: 1000,
      });
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('orgId');
    });
  });

  describe('buildEvidenceRecord', () => {
    it('creates an immutable EvidenceRecord', () => {
      const record = buildEvidenceRecord({
        id: 'ev_test_1',
        orgId: 'org_123',
        jobId: 'job_456',
        assetId: 'asset_789',
        storagePath: 'orgs/org_123/jobs/job_456/assets/asset_789/ev_test_1-photo.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 204800,
        uploadedBy: 'user_tech_1',
        caption: 'Pressure gauge reading in green zone',
      });

      expect(record.id).toBe('ev_test_1');
      expect(record.orgId).toBe('org_123');
      expect(record.jobId).toBe('job_456');
      expect(record.assetId).toBe('asset_789');
      expect(record.storagePath).toBe('orgs/org_123/jobs/job_456/assets/asset_789/ev_test_1-photo.jpg');
      expect(record.mimeType).toBe('image/jpeg');
      expect(record.sizeBytes).toBe(204800);
      expect(record.uploadedBy).toBe('user_tech_1');
      expect(record.caption).toBe('Pressure gauge reading in green zone');
      expect(typeof record.uploadedAt).toBe('string');
    });
  });
});
