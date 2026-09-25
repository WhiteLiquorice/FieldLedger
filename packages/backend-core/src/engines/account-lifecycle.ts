export type VerticalType = 'extinguisher' | 'grease_trap' | 'hood_cleaning';

export interface CompanyProfileInput {
  companyName: string;
  vertical: VerticalType;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  licenseNumber?: string;
}

export function validateCompanyProfile(input: unknown): CompanyProfileInput {
  if (!input || typeof input !== 'object') {
    throw new Error('Company profile must be an object.');
  }

  const raw = input as Record<string, unknown>;

  const companyName = typeof raw.companyName === 'string' ? raw.companyName.trim() : '';
  if (!companyName) {
    throw new Error('Company name is required.');
  }

  const vertical = raw.vertical as VerticalType;
  if (!['extinguisher', 'grease_trap', 'hood_cleaning'].includes(vertical)) {
    throw new Error('Invalid vertical selected.');
  }

  const phone = typeof raw.phone === 'string' ? raw.phone.trim() : '';
  if (!phone || phone.length < 5) {
    throw new Error('Valid phone number is required (min 5 characters).');
  }

  const address = typeof raw.address === 'string' ? raw.address.trim() : '';
  if (!address) {
    throw new Error('Street address is required.');
  }

  const city = typeof raw.city === 'string' ? raw.city.trim() : '';
  if (!city) {
    throw new Error('City is required.');
  }

  const state = typeof raw.state === 'string' ? raw.state.trim() : '';
  if (!state) {
    throw new Error('State is required.');
  }

  const zip = typeof raw.zip === 'string' ? raw.zip.trim() : '';
  if (!zip) {
    throw new Error('Postal code is required.');
  }

  const licenseNumber = typeof raw.licenseNumber === 'string' && raw.licenseNumber.trim()
    ? raw.licenseNumber.trim()
    : undefined;

  return {
    companyName,
    vertical,
    phone,
    address,
    city,
    state,
    zip,
    licenseNumber,
  };
}

export interface WorkspaceDeletionDecision {
  canDelete: boolean;
  reason?: string;
}

export function canRequestWorkspaceDeletion(org: {
  status: string;
  subscriptionStatus?: string;
}): WorkspaceDeletionDecision {
  if (['active', 'trialing', 'past_due', 'incomplete', 'unpaid', 'paused'].includes(org.subscriptionStatus || '')) {
    return {
      canDelete: false,
      reason: 'Active subscription must be canceled prior to workspace deletion.',
    };
  }

  if (org.status === 'pending_deletion') {
    return {
      canDelete: false,
      reason: 'Workspace deletion has already been requested.',
    };
  }

  if (org.status === 'deleted') {
    return {
      canDelete: false,
      reason: 'Workspace has already been deleted.',
    };
  }

  return { canDelete: true };
}

export interface WorkspaceDeletionRecord {
  type: 'WORKSPACE_DELETION_REQUESTED';
  orgId: string;
  actorId: string;
  timestamp: string;
  details: {
    reason?: string;
  };
}

export function buildWorkspaceDeletionRecord(
  orgId: string,
  actorId: string,
  reason?: string
): WorkspaceDeletionRecord {
  return {
    type: 'WORKSPACE_DELETION_REQUESTED',
    orgId,
    actorId,
    timestamp: new Date().toISOString(),
    details: {
      reason: reason?.trim() || 'User requested account teardown',
    },
  };
}
