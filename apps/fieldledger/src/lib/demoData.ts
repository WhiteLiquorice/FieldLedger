import { DEFAULT_VERTICAL_CONFIGS } from '@compliance-saas/backend-core';
import type { OperationsSnapshot, Vertical } from '../domain';

const today = new Date();
const iso = (offsetDays: number) => {
  const value = new Date(today);
  value.setDate(value.getDate() + offsetDays);
  return value.toISOString();
};

export function createDemoSnapshot(vertical: Vertical): OperationsSnapshot {
  const snapshot = structuredClone(DEMO_SNAPSHOT);
  snapshot.organization.vertical = vertical;
  snapshot.assets = snapshot.assets.filter(asset => asset.vertical === vertical);
  snapshot.jobs = snapshot.jobs.filter(job => job.vertical === vertical);
  snapshot.reports = snapshot.reports.filter(report => report.vertical === vertical);
  snapshot.sites = snapshot.sites.filter(site => snapshot.assets.some(asset => asset.siteId === site.id));
  snapshot.customers = snapshot.customers.filter(customer => snapshot.sites.some(site => site.customerId === customer.id));
  return snapshot;
}

export const DEMO_SNAPSHOT: OperationsSnapshot = {
  organization: {
    id: 'demo-org',
    name: 'Northline Service Co.',
    vertical: 'extinguisher',
    planTier: 'starter',
    maxTechnicians: 3,
    subscriptionStatus: 'trialing',
    trialStartedAt: iso(-2),
    trialEndsAt: iso(12),
    isTrialActive: true,
  },
  customers: [
    { id: 'cust-hotel', orgId: 'demo-org', businessName: 'Grand Horizon Hotel', contactName: 'Marcus Vance', contactEmail: 'facilities@example.com', contactPhone: '(312) 555-0182', active: true },
    { id: 'cust-kitchen', orgId: 'demo-org', businessName: 'Rook & Ember Hospitality', contactName: 'Nora Bell', contactEmail: 'operations@example.com', contactPhone: '(773) 555-0144', active: true },
    { id: 'cust-foods', orgId: 'demo-org', businessName: 'Lakefront Foods', contactName: 'Dev Shah', contactEmail: 'maintenance@example.com', contactPhone: '(847) 555-0171', active: true },
  ],
  sites: [
    { id: 'site-hotel', orgId: 'demo-org', customerId: 'cust-hotel', siteName: 'Grand Horizon — Downtown', address: '401 W Monroe St', city: 'Chicago', state: 'IL', accessInstructions: 'Check in at loading dock security.' },
    { id: 'site-kitchen', orgId: 'demo-org', customerId: 'cust-kitchen', siteName: 'Rook & Ember — Fulton Market', address: '912 W Fulton Market', city: 'Chicago', state: 'IL', accessInstructions: 'Roof key is held by closing manager.' },
    { id: 'site-foods', orgId: 'demo-org', customerId: 'cust-foods', siteName: 'Lakefront Foods — Plant 2', address: '1800 Industrial Dr', city: 'Elk Grove Village', state: 'IL', accessInstructions: 'Use south service entrance.' },
  ],
  assets: [
    { id: 'ext-101', orgId: 'demo-org', customerId: 'cust-hotel', siteId: 'site-hotel', vertical: 'extinguisher', assetCode: 'EXT-GH-101', name: 'Amerex B402 — 5 lb ABC', location: 'Lobby · West exit', status: 'due_soon', lastServicedAt: iso(-340), nextServiceDueAt: iso(25), serviceSchedule: { unit: 'months', interval: 12 }, details: { serialNumber: 'AX-884201', manufacturer: 'Amerex', capacityLbs: 5 } },
    { id: 'ext-102', orgId: 'demo-org', customerId: 'cust-hotel', siteId: 'site-hotel', vertical: 'extinguisher', assetCode: 'EXT-GH-102', name: 'Ansul Sentry — 10 lb ABC', location: 'Basement · Mechanical', status: 'overdue', lastServicedAt: iso(-390), nextServiceDueAt: iso(-25), serviceSchedule: { unit: 'months', interval: 12 }, details: { serialNumber: 'AN-220119', manufacturer: 'Ansul', capacityLbs: 10 } },
    { id: 'hood-201', orgId: 'demo-org', customerId: 'cust-kitchen', siteId: 'site-kitchen', vertical: 'hood_cleaning', assetCode: 'HOOD-01', name: 'Main cookline exhaust', location: 'Ground-floor kitchen', status: 'due_soon', lastServicedAt: iso(-78), nextServiceDueAt: iso(12), serviceSchedule: { unit: 'months', interval: 3 }, details: { fanType: 'Upblast roof fan', accessPanels: 4 } },
    { id: 'hood-202', orgId: 'demo-org', customerId: 'cust-kitchen', siteId: 'site-kitchen', vertical: 'hood_cleaning', assetCode: 'HOOD-02', name: 'Prep kitchen exhaust', location: 'Lower-level kitchen', status: 'ready', lastServicedAt: iso(-31), nextServiceDueAt: iso(59), serviceSchedule: { unit: 'months', interval: 3 }, details: { fanType: 'Inline', accessPanels: 2 } },
    { id: 'trap-301', orgId: 'demo-org', customerId: 'cust-foods', siteId: 'site-foods', vertical: 'grease_trap', assetCode: 'GT-LF-750', name: '750-gallon gravity interceptor', location: 'South loading apron', status: 'overdue', lastServicedAt: iso(-104), nextServiceDueAt: iso(-14), serviceSchedule: { unit: 'days', interval: 90 }, details: { capacityGallons: 750, disposalFacility: 'Metro Organics Recovery' } },
    { id: 'trap-302', orgId: 'demo-org', customerId: 'cust-foods', siteId: 'site-foods', vertical: 'grease_trap', assetCode: 'GT-LF-100', name: '100-gallon indoor trap', location: 'Washdown room', status: 'ready', lastServicedAt: iso(-24), nextServiceDueAt: iso(36), serviceSchedule: { unit: 'days', interval: 60 }, details: { capacityGallons: 100, disposalFacility: 'Metro Organics Recovery' } },
  ],
  jobs: [
    { id: 'job-1001', orgId: 'demo-org', vertical: 'hood_cleaning', customerId: 'cust-kitchen', siteId: 'site-kitchen', assignedTechId: 'demo-tech', scheduledDate: iso(0).slice(0, 10), status: 'scheduled', results: [], createdAt: iso(-2), updatedAt: iso(-2) },
    { id: 'job-1002', orgId: 'demo-org', vertical: 'grease_trap', customerId: 'cust-foods', siteId: 'site-foods', assignedTechId: 'demo-tech', scheduledDate: iso(1).slice(0, 10), status: 'scheduled', results: [], createdAt: iso(-1), updatedAt: iso(-1) },
  ],
  reports: [],
  members: [
    { userId: 'user-owner', orgId: 'demo-org', role: 'owner', displayName: 'Alex Rivera', email: 'alex@northlineservice.com', active: true, enrolledAt: iso(-30) },
    { userId: 'demo-tech', orgId: 'demo-org', role: 'technician', displayName: 'Sam Chen', email: 'sam@northlineservice.com', active: true, enrolledAt: iso(-14) },
    { userId: 'tech-jordan', orgId: 'demo-org', role: 'technician', displayName: 'Jordan Taylor', email: 'jordan@northlineservice.com', active: true, enrolledAt: iso(-5) },
  ],
  invitations: [],
  configs: structuredClone(DEFAULT_VERTICAL_CONFIGS),
};
