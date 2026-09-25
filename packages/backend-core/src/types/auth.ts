export type UserRole = 'owner' | 'manager' | 'technician' | 'client';

export type ComplianceVertical = 'extinguisher' | 'grease_trap' | 'hood_cleaning';

export interface OrganizationBranding {
  logoUrl?: string;
  primaryColor?: string;
  accentColor?: string;
  companyName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  licenseNumber?: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  branding: OrganizationBranding;
  vertical: ComplianceVertical;
  subscriptionTier: 'starter' | 'custom';
  maxUsers: number;
  maxAssets?: number;
  maxTrucks?: number;
  createdAt: string;
  updatedAt: string;
}

export interface AppUser {
  id: string;
  orgId: string;
  email: string;
  displayName: string;
  role: UserRole;
  phone?: string;
  active: boolean;
  assignedTruckId?: string;
  createdAt: string;
  updatedAt: string;
}
