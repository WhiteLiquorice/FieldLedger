import { 
  GreaseTrapAsset, 
  Customer, 
  SiteLocation, 
  Organization 
} from '@compliance-saas/backend-core';

export const INITIAL_ORG: Organization = {
  id: 'org-flow-grease',
  name: 'TrapFlow Environmental & Grease Pumping Solutions LLC',
  slug: 'trapflow',
  branding: {
    companyName: 'TrapFlow Environmental Pumping Services',
    phone: '(555) 772-3344',
    email: 'dispatch@trapflowpumping.com',
    address: '4400 S Western Blvd',
    city: 'Chicago',
    state: 'IL',
    zip: '60609',
    licenseNumber: 'EPA-MWRD-IL-7781',
  },
  activeVerticals: ['grease_trap'],
  subscriptionTier: 'pro',
  maxUsers: 8,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: 'cust-grand-horizon',
    orgId: 'org-flow-grease',
    businessName: 'Grand Horizon Hospitality Group',
    contacts: [
      {
        name: 'Elena Rostova',
        email: 'elena@grandhorizon.com',
        phone: '(555) 234-5678',
        isBilling: true,
        isPrimary: true,
      }
    ],
    billingAddress: {
      street: '777 Lakeshore Boulevard',
      city: 'Chicago',
      state: 'IL',
      zip: '60601',
    },
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'cust-coastal-seafood',
    orgId: 'org-flow-grease',
    businessName: 'Coastal Catch Seafood & Oyster Bar',
    contacts: [
      {
        name: 'Darren Miller',
        email: 'darren@coastalcatch.com',
        phone: '(555) 883-2211',
        isBilling: true,
        isPrimary: true,
      }
    ],
    billingAddress: {
      street: '305 W Wacker Drive',
      city: 'Chicago',
      state: 'IL',
      zip: '60606',
    },
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const INITIAL_SITES: SiteLocation[] = [
  {
    id: 'site-grand-horizon-main',
    orgId: 'org-flow-grease',
    customerId: 'cust-grand-horizon',
    siteName: 'Grand Horizon Resort & Convention Center',
    address: {
      street: '777 Lakeshore Boulevard',
      city: 'Chicago',
      state: 'IL',
      zip: '60601',
    },
    siteContact: {
      name: 'Carlos Mendez (Chief Engineer)',
      email: 'cmendez@grandhorizon.com',
      phone: '(555) 234-5680',
    },
    expectedGreaseTrapCount: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'site-coastal-downtown',
    orgId: 'org-flow-grease',
    customerId: 'cust-coastal-seafood',
    siteName: 'Coastal Catch Riverwalk Pier',
    address: {
      street: '305 W Wacker Drive',
      city: 'Chicago',
      state: 'IL',
      zip: '60606',
    },
    siteContact: {
      name: 'Darren Miller',
      email: 'darren@coastalcatch.com',
      phone: '(555) 883-2211',
    },
    expectedGreaseTrapCount: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const INITIAL_GREASE_TRAPS: GreaseTrapAsset[] = [
  {
    id: 'trap-gh-01',
    orgId: 'org-flow-grease',
    customerId: 'cust-grand-horizon',
    siteId: 'site-grand-horizon-main',
    internalId: 'GT-OUTDOOR-1500',
    trapType: 'gravity',
    capacityGallons: 1500,
    flowRateGpm: 100,
    locationDescription: 'North Parking Lot Inground Vault #1',
    serviceIntervalDays: 90,
    lastPumpedAt: '2026-05-10T00:00:00Z',
    nextPumpDueAt: '2026-08-10T00:00:00Z',
    lastCondition: 'heavy_fog',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'trap-gh-02',
    orgId: 'org-flow-grease',
    customerId: 'cust-grand-horizon',
    siteId: 'site-grand-horizon-main',
    internalId: 'GT-POTWASH-50',
    trapType: 'indoor_interceptor',
    capacityGallons: 50,
    flowRateGpm: 25,
    locationDescription: 'Main Banquet Potwash Sink Under-Counter',
    serviceIntervalDays: 30,
    lastPumpedAt: '2026-07-28T00:00:00Z',
    nextPumpDueAt: '2026-08-28T00:00:00Z',
    lastCondition: 'good',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'trap-coastal-01',
    orgId: 'org-flow-grease',
    customerId: 'cust-coastal-seafood',
    siteId: 'site-coastal-downtown',
    internalId: 'GT-VAULT-2000',
    trapType: 'outdoor_vault',
    capacityGallons: 2000,
    flowRateGpm: 150,
    locationDescription: 'Riverwalk Service Alley Sub-grade Vault',
    serviceIntervalDays: 90,
    lastPumpedAt: '2026-06-01T00:00:00Z',
    nextPumpDueAt: '2026-09-01T00:00:00Z',
    lastCondition: 'good',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];
