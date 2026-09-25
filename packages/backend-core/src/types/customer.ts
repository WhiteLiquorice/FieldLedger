export interface CustomerContact {
  name: string;
  title?: string;
  email: string;
  phone: string;
  isBilling: boolean;
  isPrimary: boolean;
}

export interface Customer {
  id: string;
  orgId: string;
  businessName: string;
  accountNumber?: string;
  contacts: CustomerContact[];
  billingAddress: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  notes?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SiteLocation {
  id: string;
  orgId: string;
  customerId: string;
  siteName: string;
  address: {
    street: string;
    suite?: string;
    city: string;
    state: string;
    zip: string;
    latitude?: number;
    longitude?: number;
  };
  accessInstructions?: string;
  gateCode?: string;
  keyBoxLocation?: string;
  operatingHours?: string;
  siteContact: {
    name: string;
    phone: string;
    email?: string;
  };
  siteNotes?: string;
  // Asset counts for quick dashboard reconciliation
  expectedExtinguisherCount?: number;
  expectedGreaseTrapCount?: number;
  expectedHoodSystemCount?: number;
  createdAt: string;
  updatedAt: string;
}
