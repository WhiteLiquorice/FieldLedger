import { describe, expect, it } from 'vitest';
import {
  validateCompanyProfile,
  canRequestWorkspaceDeletion,
  buildWorkspaceDeletionRecord,
  CompanyProfileInput,
} from '../src/engines/account-lifecycle.js';

describe('account-lifecycle: company profile validation', () => {
  const validProfile: CompanyProfileInput = {
    companyName: 'Apex Hood Cleaning LLC',
    vertical: 'hood_cleaning',
    phone: '555-123-4567',
    address: '100 Industrial Parkway',
    city: 'Denver',
    state: 'CO',
    zip: '80202',
    licenseNumber: 'LIC-998811',
  };

  it('accepts a complete valid company profile', () => {
    const validated = validateCompanyProfile(validProfile);
    expect(validated.companyName).toBe('Apex Hood Cleaning LLC');
    expect(validated.vertical).toBe('hood_cleaning');
    expect(validated.licenseNumber).toBe('LIC-998811');
  });

  it('accepts a valid profile without optional license number', () => {
    const { licenseNumber, ...withoutLicense } = validProfile;
    const validated = validateCompanyProfile(withoutLicense);
    expect(validated.licenseNumber).toBeUndefined();
  });

  it('rejects empty or whitespace company name', () => {
    expect(() => validateCompanyProfile({ ...validProfile, companyName: '   ' })).toThrow(/Company name is required/);
  });

  it('rejects invalid vertical', () => {
    expect(() => validateCompanyProfile({ ...validProfile, vertical: 'roofing' as any })).toThrow(/Invalid vertical/);
  });

  it('rejects empty or short phone number', () => {
    expect(() => validateCompanyProfile({ ...validProfile, phone: '12' })).toThrow(/Valid phone number is required/);
  });

  it('rejects missing address, city, state, or zip', () => {
    expect(() => validateCompanyProfile({ ...validProfile, address: '' })).toThrow(/Street address is required/);
    expect(() => validateCompanyProfile({ ...validProfile, city: '' })).toThrow(/City is required/);
    expect(() => validateCompanyProfile({ ...validProfile, state: '' })).toThrow(/State is required/);
    expect(() => validateCompanyProfile({ ...validProfile, zip: '' })).toThrow(/Postal code is required/);
  });
});

describe('account-lifecycle: workspace deletion guard', () => {
  it('prevents deletion when subscription is actively paying', () => {
    const decision = canRequestWorkspaceDeletion({
      status: 'active',
      subscriptionStatus: 'active',
    });
    expect(decision.canDelete).toBe(false);
    expect(decision.reason).toMatch(/Active subscription must be canceled/);
  });

  it('prevents deletion if already pending deletion', () => {
    const decision = canRequestWorkspaceDeletion({
      status: 'pending_deletion',
      subscriptionStatus: 'canceled',
    });
    expect(decision.canDelete).toBe(false);
    expect(decision.reason).toMatch(/already been requested/);
  });

  it('allows deletion when subscription is canceled or not started', () => {
    expect(canRequestWorkspaceDeletion({ status: 'active', subscriptionStatus: 'canceled' }).canDelete).toBe(true);
    expect(canRequestWorkspaceDeletion({ status: 'active', subscriptionStatus: 'not_started' }).canDelete).toBe(true);
    expect(canRequestWorkspaceDeletion({ status: 'onboarding', subscriptionStatus: 'trialing' }).canDelete).toBe(false);
  });
});

describe('account-lifecycle: deletion record builder', () => {
  it('creates an immutable audit record for deletion request', () => {
    const record = buildWorkspaceDeletionRecord('org-123', 'user-owner-1', 'Closing business down');
    expect(record.type).toBe('WORKSPACE_DELETION_REQUESTED');
    expect(record.orgId).toBe('org-123');
    expect(record.actorId).toBe('user-owner-1');
    expect(record.details.reason).toBe('Closing business down');
    expect(record.timestamp).toBeDefined();
  });
});
