import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DEFAULT_VERTICAL_CONFIGS, calculateNextServiceDue, summarizeServiceOutcome, formatReportNumber, type VerticalWorkflowConfig } from '@compliance-saas/backend-core';
import { createUserWithEmailAndPassword, onAuthStateChanged, signInWithEmailAndPassword, signOut, sendPasswordResetEmail, sendEmailVerification, type User } from 'firebase/auth';
import { collection, collectionGroup, doc, getDoc, onSnapshot, query, serverTimestamp, setDoc, writeBatch, where } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { getDownloadURL, getMetadata, ref, uploadBytes } from 'firebase/storage';
import { clearDrafts } from '../lib/job-drafts';
import type { AssetRecord, AssetServiceResult, CustomerRecord, JobRecord, OperationsSnapshot, ReportRecord, SiteRecord, Vertical, TeamMemberRecord, InvitationRecord, TeamRole, CompanyProfileInput } from '../domain';
import { createDemoSnapshot } from '../lib/demoData';
import { dataMode, getFirebaseServices } from '../lib/firebase';

type View = 'dashboard' | 'assets' | 'work' | 'team' | 'compliance' | 'reports' | 'settings' | 'billing';

interface NewAssetInput {
  siteId: string;
  assetCode: string;
  name: string;
  location: string;
  scheduleInterval: number;
  serialNumber?: string;
  manufacturer?: string;
  model?: string;
  capacity?: number;
  manufactureYear?: number;
  trapType?: string;
  cookingVolume?: string;
}

interface NewCustomerSiteInput {
  businessName: string;
  siteName: string;
  address: string;
  city: string;
  state: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
}

interface OperationsContextValue {
  mode: typeof dataMode;
  snapshot: OperationsSnapshot;
  loading: boolean;
  error: string | null;
  user: User | null;
  needsOnboarding: boolean;
  activeVertical: Vertical;
  view: View;
  setView: (view: View) => void;
  signIn: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, companyName: string, vertical: Vertical) => Promise<void>;
  createWorkspace: (profile: CompanyProfileInput) => Promise<void>;
  signOutUser: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  addCustomerSite: (input: NewCustomerSiteInput) => Promise<string>;
  addAsset: (input: NewAssetInput) => Promise<void>;
  updateCustomerSite: (siteId: string, input: NewCustomerSiteInput, customerVersion: number, siteVersion: number) => Promise<void>;
  updateServiceAsset: (assetId: string, input: Pick<NewAssetInput, 'name' | 'assetCode' | 'location' | 'scheduleInterval'>, version: number) => Promise<void>;
  createJob: (siteId: string, scheduledDate: string, assignedTechId?: string) => Promise<string>;
  assignJob: (jobId: string, targetTechId: string, expectedVersion?: number) => Promise<void>;
  startJob: (jobId: string, expectedVersion?: number) => Promise<void>;
  rescheduleJob: (jobId: string, date: string, reason: string, expectedVersion: number) => Promise<void>;
  cancelJob: (jobId: string, reason: string, expectedVersion?: number) => Promise<void>;
  completeJob: (jobId: string, results: AssetServiceResult[], expectedVersion?: number) => Promise<void>;
  uploadJobPhoto: (jobId: string, assetId: string, file: File, evidenceId?: string) => Promise<string>;
  saveWorkflowConfig: (config: VerticalWorkflowConfig) => Promise<void>;
  exportData: () => Promise<unknown>;
  createInvitation: (email: string, role: 'manager' | 'technician') => Promise<{ invitationId: string; inviteUrl: string; token: string }>;
  acceptInvitation: (token: string) => Promise<void>;
  revokeInvitation: (invitationId: string) => Promise<void>;
  updateMemberRole: (userId: string, newRole: 'manager' | 'technician' | 'client') => Promise<void>;
  setMemberActive: (userId: string, active: boolean) => Promise<void>;
  removeMember: (userId: string) => Promise<void>;
  requestWorkspaceDeletion: (confirmationText: string, reason?: string) => Promise<void>;
  resetDemo: () => void;
}

const requestedDemoVertical = new URLSearchParams(window.location.search).get('vertical');
const demoVertical: Vertical = requestedDemoVertical === 'extinguisher' || requestedDemoVertical === 'grease_trap' ? requestedDemoVertical : 'hood_cleaning';
const STORAGE_KEY = 'fieldledger_demo_v3_' + demoVertical;
const OperationsContext = createContext<OperationsContextValue | null>(null);

function getInitialDemoSnapshot(): OperationsSnapshot {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return createDemoSnapshot(demoVertical);
  try {
    return JSON.parse(saved) as OperationsSnapshot;
  } catch {
    return createDemoSnapshot(demoVertical);
  }
}

function mapCustomer(id: string, data: Record<string, unknown>): CustomerRecord {
  const contacts = Array.isArray(data.contacts) ? data.contacts as Array<Record<string, unknown>> : [];
  const primary = contacts.find((contact) => contact.isPrimary) || contacts[0] || {};
  return {
    version: Number(data.version || 1),
    id,
    orgId: String(data.orgId || ''),
    businessName: String(data.businessName || 'Unnamed customer'),
    contactName: String(primary.name || ''),
    contactEmail: String(primary.email || ''),
    contactPhone: String(primary.phone || ''),
    active: data.active !== false,
  };
}

function mapSite(id: string, data: Record<string, unknown>): SiteRecord {
  const address = (data.address || {}) as Record<string, unknown>;
  return {
    version: Number(data.version || 1),
    id,
    orgId: String(data.orgId || ''),
    customerId: String(data.customerId || ''),
    siteName: String(data.siteName || 'Unnamed site'),
    address: String(address.street || data.address || ''),
    city: String(address.city || data.city || ''),
    state: String(address.state || data.state || ''),
    accessInstructions: typeof data.accessInstructions === 'string' ? data.accessInstructions : undefined,
  };
}

function mapAsset(vertical: Vertical, id: string, data: Record<string, unknown>): AssetRecord {
  const assetCode = String(data.assetCode || data.qrCode || data.internalId || data.systemName || id);
  const name = typeof data.name === 'string' && data.name ? data.name : vertical === 'extinguisher'
    ? `${String(data.manufacturer || 'Extinguisher')} ${String(data.model || '')}`.trim()
    : vertical === 'hood_cleaning'
      ? String(data.systemName || 'Exhaust system')
      : `${String(data.capacityGallons || '')}-gallon ${String(data.trapType || 'interceptor')}`.trim();
  const nextDue = String(data.nextServiceDueAt || data.nextAnnualDueAt || data.nextCleaningDueAt || data.nextPumpDueAt || '');
  const dueTime = nextDue ? new Date(nextDue).getTime() : Number.POSITIVE_INFINITY;
  const days = Math.ceil((dueTime - Date.now()) / 86_400_000);
  return {
    version: Number(data.version || 1),
    id,
    orgId: String(data.orgId || ''),
    customerId: String(data.customerId || ''),
    siteId: String(data.siteId || ''),
    vertical,
    assetCode,
    name,
    location: String(data.roomOrArea || data.locationDescription || 'Location not recorded'),
    status: data.status === 'service_required' ? 'service_required' : days < 0 ? 'overdue' : days <= 30 ? 'due_soon' : 'ready',
    lastServicedAt: String(data.lastServicedAt || data.lastAnnualInspectionAt || data.lastCleanedAt || data.lastPumpedAt || '') || undefined,
    nextServiceDueAt: nextDue || undefined,
    serviceSchedule: (data.serviceSchedule as AssetRecord['serviceSchedule']) || DEFAULT_VERTICAL_CONFIGS[vertical].schedule,
    details: data as AssetRecord['details'],
  };
}

function toIsoString(value: unknown): string {
  if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') return value.toDate().toISOString();
  if (typeof value === 'string') return value;
  return new Date().toISOString();
}

function mapJob(id: string, data: Record<string, unknown>): JobRecord {
  return {
    id,
    orgId: String(data.orgId || ''),
    vertical: data.vertical as Vertical,
    customerId: String(data.customerId || ''),
    siteId: String(data.siteId || ''),
    assignedTechId: String(data.assignedTechId || ''),
    assignedTechName: typeof data.assignedTechName === 'string' ? data.assignedTechName : undefined,
    scheduledDate: String(data.scheduledDate || ''),
    status: data.status as JobRecord['status'],
    version: typeof data.version === 'number' ? data.version : 1,
    cancellationReason: typeof data.cancellationReason === 'string' ? data.cancellationReason : undefined,
    results: Array.isArray(data.results) ? data.results as AssetServiceResult[] : [],
    startedAt: data.startedAt ? toIsoString(data.startedAt) : undefined,
    completedAt: data.completedAt ? toIsoString(data.completedAt) : undefined,
    createdAt: toIsoString(data.createdAt),
    updatedAt: toIsoString(data.updatedAt),
  };
}

function mapReport(id: string, data: Record<string, unknown>): ReportRecord {
  return {
    revision: Number(data.revision || 1),
    baseReportId: typeof data.baseReportId === 'string' ? data.baseReportId : undefined,
    previousReportId: typeof data.previousReportId === 'string' ? data.previousReportId : undefined,
    addenda: Array.isArray(data.addenda) ? data.addenda as ReportRecord['addenda'] : [],
    id,
    orgId: String(data.orgId || ''),
    jobId: String(data.jobId || ''),
    vertical: data.vertical as Vertical,
    customerId: String(data.customerId || ''),
    siteId: String(data.siteId || ''),
    reportNumber: String(data.reportNumber || id),
    title: String(data.title || 'Service Record'),
    outcome: (data.outcome || 'incomplete') as ReportRecord['outcome'],
    generatedAt: toIsoString(data.generatedAt),
    snapshot: data.snapshot as ReportRecord['snapshot'],
    disclaimer: typeof data.disclaimer === 'string' ? data.disclaimer : undefined,
    results: Array.isArray(data.results) ? data.results as AssetServiceResult[] : [],
  };
}

export function OperationsProvider({ children }: { children: React.ReactNode }) {
  const [snapshot, setSnapshot] = useState<OperationsSnapshot>(() => dataMode === 'demo' ? getInitialDemoSnapshot() : {
    organization: { id: '', name: '', vertical: 'extinguisher' },
    customers: [], sites: [], assets: [], jobs: [], reports: [], members: [], invitations: [], configs: structuredClone(DEFAULT_VERTICAL_CONFIGS),
  });
  const [loading, setLoading] = useState(dataMode === 'firebase');
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const activeVertical = snapshot.organization.vertical;
  const [view, setView] = useState<View>(() => new URLSearchParams(window.location.search).has('billing') ? 'billing' : 'dashboard');

  useEffect(() => {
    if (dataMode === 'demo') localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  }, [snapshot]);

  useEffect(() => {
    if (dataMode !== 'firebase') return;
    let unsubscribers: Array<() => void> = [];
    let services;
    try {
      services = getFirebaseServices();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Firebase configuration is incomplete.');
      setLoading(false);
      return;
    }
    const { auth, db } = services;
    let epoch = 0;
    const onReadError = (cause: Error) => {setError(`Unable to sync workspace: ${cause.message}. Reload to retry.`);setLoading(false);};
    const unsubscribeAuth = onAuthStateChanged(auth, async (nextUser) => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
      unsubscribers = [];
      const sessionEpoch = ++epoch;
      setSnapshot({organization:{id: '',name: '',vertical: 'extinguisher'},customers:[],sites:[],assets:[],jobs:[],reports:[],members:[],invitations:[],configs:structuredClone(DEFAULT_VERTICAL_CONFIGS)});
      setUser(nextUser);
      setError(null);
      if (!nextUser) {
        setLoading(false);
        setNeedsOnboarding(false);
        return;
      }

      setLoading(true);
      try {
        const token = await nextUser.getIdTokenResult();
        if(sessionEpoch !== epoch) return;
        const orgId = typeof token.claims.org_id === 'string' ? token.claims.org_id : '';
        if (!orgId) {
          setNeedsOnboarding(true);
          setLoading(false);
          return;
        }
        setNeedsOnboarding(false);
        const memberSnapshot = await getDoc(doc(db, `orgs/${orgId}/users/${nextUser.uid}`));
        if (!memberSnapshot.exists() || memberSnapshot.data().active !== true) throw new Error('Your workspace membership is inactive. Contact your company owner.');
        const isOffice = ['owner', 'manager'].includes(memberSnapshot.data().role);

        const organizationRef = doc(db, 'orgs', orgId);
        const organizationSnapshot = await getDoc(organizationRef);
        if(sessionEpoch !== epoch) return;
        const organizationData = organizationSnapshot.data() || {};
        const organizationVertical = organizationData.vertical;
        if (!['extinguisher', 'grease_trap', 'hood_cleaning'].includes(String(organizationVertical))) {
          throw new Error('This organization does not have a valid service vertical. Contact support before continuing.');
        }
        const mapOrganization = (data: Record<string, unknown>) => ({
          id: orgId,
          name: String(data.name || 'Organization'),
          status: String(data.status || ''),
          trialStartedAt: typeof data.trialStartedAt === 'string' ? data.trialStartedAt : undefined,
          trialEndsAt: typeof data.trialEndsAt === 'string' ? data.trialEndsAt : undefined,
          vertical: data.vertical as Vertical,
          planTier: data.subscriptionTier === 'starter' ? 'starter' as const : undefined,
          maxTechnicians: typeof data.maxTechnicians === 'number' ? data.maxTechnicians : undefined,
          stripeCustomerId: typeof data.stripeCustomerId === 'string' ? data.stripeCustomerId : undefined,
          stripeSubscriptionId: typeof data.stripeSubscriptionId === 'string' ? data.stripeSubscriptionId : undefined,
          subscriptionStatus: ['trialing', 'active', 'past_due', 'expired', 'canceled', 'unpaid', 'paused', 'incomplete', 'not_started'].includes(String(data.subscriptionStatus))
            ? data.subscriptionStatus as 'trialing' | 'active' | 'past_due' | 'expired' | 'canceled' | 'unpaid' | 'paused' | 'incomplete' | 'not_started'
            : undefined,
          currentPeriodEnd: typeof data.currentPeriodEnd === 'string' ? data.currentPeriodEnd : undefined,
          paymentAlert: typeof data.paymentAlert === 'string' ? data.paymentAlert : undefined,
        });
        setSnapshot((current) => ({ ...current, organization: mapOrganization(organizationData) }));
        unsubscribers.push(onSnapshot(organizationRef, (item) => {
          setSnapshot((current) => ({ ...current, organization: mapOrganization(item.data() || {}) }));
        }, onReadError));
        unsubscribers.push(onSnapshot(collection(db, `orgs/${orgId}/customers`), (items) => {
          setSnapshot((current) => ({ ...current, customers: items.docs.map((item) => mapCustomer(item.id, item.data())) }));
        }, onReadError));
        unsubscribers.push(onSnapshot(query(collectionGroup(db, 'sites'), where('orgId', '==', orgId)), (items) => {
          setSnapshot((current) => ({ ...current, sites: items.docs.map((item) => mapSite(item.id, item.data())) }));
        }, onReadError));

        const assetGroup = organizationVertical === 'extinguisher'
          ? 'extinguishers'
          : organizationVertical === 'hood_cleaning'
            ? 'hood_systems'
            : 'grease_traps';
        unsubscribers.push(onSnapshot(query(collectionGroup(db, assetGroup), where('orgId', '==', orgId)), (items) => {
          const mapped = items.docs.map((item) => mapAsset(organizationVertical as Vertical, item.id, item.data()));
          setSnapshot((current) => ({ ...current, assets: mapped }));
        }, onReadError));

        unsubscribers.push(onSnapshot(query(
          collection(db, `orgs/${orgId}/jobs`),
          where('vertical', '==', organizationVertical),
          ...(!isOffice ? [where('assignedTechId', '==', nextUser.uid)] : []),
        ), (items) => {
          setSnapshot((current) => ({ ...current, jobs: items.docs.map((item) => mapJob(item.id, item.data())) }));
        }, onReadError));
        unsubscribers.push(onSnapshot(query(collection(db, `orgs/${orgId}/reports`), ...(!isOffice ? [where('assignedTechId', '==', nextUser.uid)] : [])), (items) => {
          setSnapshot((current) => ({ ...current, reports: items.docs.map((item) => mapReport(item.id, item.data())) }));
        }, onReadError));
        unsubscribers.push(onSnapshot(doc(db, `orgs/${orgId}/workflow_configs/${organizationVertical}`), (item) => {
          const remote = { ...DEFAULT_VERTICAL_CONFIGS };
          if (item.exists()) remote[organizationVertical as Vertical] = item.data() as VerticalWorkflowConfig;
          setSnapshot((current) => ({ ...current, configs: remote }));
        }, onReadError));

        // Team members sync
        unsubscribers.push(onSnapshot(collection(db, `orgs/${orgId}/users`), (items) => {
          setSnapshot((current) => ({
            ...current,
            members: items.docs.map((item) => {
              const d = item.data();
              return {
                userId: item.id,
                orgId,
                role: (d.role || 'technician') as TeamRole,
                email: typeof d.email === 'string' ? d.email : undefined,
                displayName: typeof d.displayName === 'string' ? d.displayName : undefined,
                active: d.active !== false,
                enrolledAt: toIsoString(d.enrolledAt),
              };
            }),
          }));
        }, onReadError));

        // Pending invitations sync (managers and owners have read access)
        if (isOffice) unsubscribers.push(onSnapshot(collection(db, `orgs/${orgId}/invitations`), (items) => {
          setSnapshot((current) => ({
            ...current,
            invitations: items.docs.map((item) => {
              const d = item.data();
              return {
                id: item.id,
                orgId,
                email: String(d.email || ''),
                role: d.role as 'manager' | 'technician',
                status: (d.status || 'pending') as InvitationRecord['status'],
                expiresAtMs: Number(d.expiresAtMs || 0),
                createdAtMs: typeof d.createdAtMs === 'number' ? d.createdAtMs : undefined,
                invitedBy: typeof d.invitedBy === 'string' ? d.invitedBy : undefined,
              };
            }),
          }));
        }, onReadError));
        setLoading(false);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Unable to load organization data.');
        setLoading(false);
      }
    });
    return () => {
      epoch++;
      unsubscribeAuth();
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (dataMode === 'demo') return;
    setLoading(true);
    try { await signInWithEmailAndPassword(getFirebaseServices().auth, email, password); }
    finally { setLoading(false); }
  }, []);

  const register = useCallback(async (email: string, password: string, companyName: string, vertical: Vertical) => {
    if (dataMode === 'demo') {
      setSnapshot((current) => ({
        ...current,
        organization: { ...current.organization, name: companyName, vertical },
      }));
      return;
    }
    const services = getFirebaseServices();
    setLoading(true);
    try {
      const credential = await createUserWithEmailAndPassword(services.auth, email, password);
      sessionStorage.setItem('fieldledger-onboarding', JSON.stringify({ companyName, vertical }));
      await sendEmailVerification(credential.user);
    } finally { setLoading(false); }
  }, []);

  const createWorkspace = useCallback(async (profile: CompanyProfileInput) => {
    if (dataMode === 'demo') {
      setSnapshot((current) => ({
        ...current,
        organization: { ...current.organization, name: profile.companyName, vertical: profile.vertical },
      }));
      return;
    }
    const services = getFirebaseServices();
    const currentUser = services.auth.currentUser;
    if (!currentUser?.email) throw new Error('Sign in before creating a workspace.');
    const createOrganization = httpsCallable(services.functions, 'createOrganization');
    const slugBase = profile.companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 35);
    const slug = `${slugBase || 'org'}-${currentUser.uid.slice(0, 5)}`;
    await createOrganization({
      name: profile.companyName,
      slug,
      vertical: profile.vertical,
      branding: {
        companyName: profile.companyName,
        phone: profile.phone,
        email: currentUser.email,
        address: profile.address,
        city: profile.city,
        state: profile.state,
        zip: profile.zip,
        ...(profile.licenseNumber?.trim() ? { licenseNumber: profile.licenseNumber.trim() } : {}),
      },
    });
    await currentUser.getIdToken(true);
    window.location.reload();
  }, []);

  const resetPassword = useCallback(async (email: string) => { if(!email.trim()) throw new Error('Enter your email address first.'); await sendPasswordResetEmail(getFirebaseServices().auth,email.trim()); }, []);

  const signOutUser = useCallback(async () => {
    await clearDrafts();
    if (dataMode === 'firebase') await signOut(getFirebaseServices().auth);
  }, []);

  const addCustomerSite = useCallback(async (input: NewCustomerSiteInput) => {
    const customerId = `customer-${crypto.randomUUID()}`;
    const siteId = `site-${crypto.randomUUID()}`;
    const customer: CustomerRecord = {
      id: customerId,
      orgId: snapshot.organization.id,
      businessName: input.businessName,
      contactName: input.contactName,
      contactEmail: input.contactEmail,
      contactPhone: input.contactPhone,
      active: true,
    };
    const site: SiteRecord = {
      id: siteId,
      orgId: snapshot.organization.id,
      customerId,
      siteName: input.siteName,
      address: input.address,
      city: input.city,
      state: input.state,
    };
    if (dataMode === 'demo') {
      setSnapshot((current) => ({ ...current, customers: [customer, ...current.customers], sites: [site, ...current.sites] }));
      return siteId;
    }
    const { db } = getFirebaseServices();
    const batchTime = serverTimestamp();
    const batch = writeBatch(db);
    batch.set(doc(db, `orgs/${customer.orgId}/customers/${customerId}`), {
      ...customer,
      contacts: [{ name: input.contactName, email: input.contactEmail, phone: input.contactPhone, isPrimary: true, isBilling: true }],
      billingAddress: { street: input.address, city: input.city, state: input.state, zip: '' },
      createdAt: batchTime,
      updatedAt: batchTime,
    });
    batch.set(doc(db, `orgs/${customer.orgId}/customers/${customerId}/sites/${siteId}`), {
      ...site,
      address: { street: input.address, city: input.city, state: input.state, zip: '' },
      siteContact: { name: input.contactName, phone: input.contactPhone, email: input.contactEmail },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await batch.commit();
    return siteId;
  }, [snapshot.organization.id]);

  const addAsset = useCallback(async (input: NewAssetInput) => {
    const site = snapshot.sites.find((item) => item.id === input.siteId);
    if (!site) throw new Error('Select a valid site.');
    const id = `${activeVertical.slice(0, 4)}-${crypto.randomUUID()}`;
    const config = snapshot.configs[activeVertical];
    const due = calculateNextServiceDue(new Date().toISOString(), { unit: config.schedule.unit, interval: input.scheduleInterval });
    const asset: AssetRecord = {
      id, orgId: snapshot.organization.id, customerId: site.customerId, siteId: site.id, vertical: activeVertical,
      assetCode: input.assetCode, name: input.name, location: input.location, status: 'ready', nextServiceDueAt: due,
      serviceSchedule: { unit: config.schedule.unit, interval: input.scheduleInterval },
      details: {
        serialNumber: input.serialNumber,
        manufacturer: input.manufacturer,
        model: input.model,
        capacity: input.capacity,
        manufactureYear: input.manufactureYear,
        trapType: input.trapType,
        cookingVolume: input.cookingVolume,
      },
    };
    if (dataMode === 'demo') {
      setSnapshot((current) => ({ ...current, assets: [asset, ...current.assets] }));
      return;
    }

    const { db } = getFirebaseServices();
    const group = activeVertical === 'extinguisher' ? 'extinguishers' : activeVertical === 'hood_cleaning' ? 'hood_systems' : 'grease_traps';
    const payload: Record<string, unknown> = { ...JSON.parse(JSON.stringify(asset)), createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
    if (activeVertical === 'extinguisher') Object.assign(payload, { qrCode: input.assetCode, serialNumber: input.serialNumber, manufacturer: input.manufacturer, model: input.model, type: 'Other', capacityLbs: input.capacity, mfgYear: input.manufactureYear, roomOrArea: input.location });
    if (activeVertical === 'hood_cleaning') Object.assign(payload, { systemName: input.name, locationDescription: input.location, ductType: 'unknown', fanType: 'upblast_roof', fanHingesInstalled: false, accessPanelsCount: 0, cookingVolume: input.cookingVolume, serviceIntervalMonths: input.scheduleInterval, nextCleaningDueAt: due });
    if (activeVertical === 'grease_trap') Object.assign(payload, { trapType: input.trapType, capacityGallons: input.capacity, locationDescription: input.location, serviceIntervalDays: input.scheduleInterval, nextPumpDueAt: due });
    Object.keys(payload).forEach(key => { if(payload[key] === undefined) delete payload[key]; });
    await setDoc(doc(db, `orgs/${asset.orgId}/customers/${site.customerId}/sites/${site.id}/${group}/${id}`), payload);
  }, [activeVertical, snapshot]);

  const updateCustomerSite = useCallback(async (siteId: string, input: NewCustomerSiteInput, customerVersion: number, siteVersion: number) => {
    const site = snapshot.sites.find(item => item.id === siteId);
    if (!site) throw new Error('Site no longer exists.');
    if (dataMode === 'demo') {
      setSnapshot(current => ({ ...current, customers: current.customers.map(item => item.id === site.customerId ? { ...item, businessName: input.businessName, contactName: input.contactName, contactEmail: input.contactEmail, contactPhone: input.contactPhone, version: customerVersion + 1 } : item), sites: current.sites.map(item => item.id === siteId ? { ...item, siteName: input.siteName, address: input.address, city: input.city, state: input.state, version: siteVersion + 1 } : item) }));
      return;
    }
    await httpsCallable(getFirebaseServices().functions, 'updateCustomerSite')({ ...input, orgId: snapshot.organization.id, customerId: site.customerId, siteId, expectedCustomerVersion: customerVersion, expectedSiteVersion: siteVersion });
  }, [snapshot.organization.id, snapshot.sites]);

  const updateServiceAsset = useCallback(async (assetId: string, input: Pick<NewAssetInput, 'name' | 'assetCode' | 'location' | 'scheduleInterval'>, version: number) => {
    const asset = snapshot.assets.find(item => item.id === assetId);
    if (!asset) throw new Error('Equipment no longer exists.');
    if (dataMode === 'demo') {
      setSnapshot(current => ({ ...current, assets: current.assets.map(item => item.id === assetId ? { ...item, name: input.name, assetCode: input.assetCode, location: input.location, serviceSchedule: { ...item.serviceSchedule, interval: input.scheduleInterval }, version: version + 1 } : item) }));
      return;
    }
    await httpsCallable(getFirebaseServices().functions, 'updateServiceAsset')({ ...input, orgId: snapshot.organization.id, customerId: asset.customerId, siteId: asset.siteId, assetId, expectedVersion: version });
  }, [snapshot.organization.id, snapshot.assets]);

  const createJob = useCallback(async (siteId: string, scheduledDate: string, assignedTechId?: string) => {
    const site = snapshot.sites.find((item) => item.id === siteId);
    if (!site) throw new Error('Select a valid site.');
    const now = new Date().toISOString();
    const id = `job-${crypto.randomUUID()}`;
    const status = assignedTechId ? 'dispatched' : 'scheduled';
    const techMember = assignedTechId ? snapshot.members.find((m) => m.userId === assignedTechId) : undefined;
    const assignedTechName = techMember?.displayName || techMember?.email;
    const job: JobRecord = {
      id,
      orgId: snapshot.organization.id,
      vertical: activeVertical,
      customerId: site.customerId,
      siteId,
      assignedTechId: assignedTechId || '',
      assignedTechName,
      scheduledDate,
      status,
      version: 1,
      results: [],
      createdAt: now,
      updatedAt: now,
    };
    if (dataMode === 'demo') {
      setSnapshot((current) => ({ ...current, jobs: [job, ...current.jobs] }));
      return id;
    }
    const call = httpsCallable<
      { orgId: string; siteId: string; scheduledDate: string; assignedTechId?: string },
      { success: boolean; jobId: string; version: number; status: string }
    >(getFirebaseServices().functions, 'createServiceJob');
    const res = await call({
      orgId: snapshot.organization.id,
      siteId,
      scheduledDate,
      assignedTechId: assignedTechId || undefined,
    });
    return res.data.jobId;
  }, [activeVertical, snapshot]);

  const assignJob = useCallback(async (jobId: string, targetTechId: string, expectedVersion?: number) => {
    const job = snapshot.jobs.find((j) => j.id === jobId);
    if (!job) throw new Error('Job not found.');
    const tech = snapshot.members.find((m) => m.userId === targetTechId);
    const now = new Date().toISOString();
    const nextStatus = job.status === 'scheduled' ? 'dispatched' : job.status;
    const nextVersion = (job.version || 1) + 1;

    if (dataMode === 'demo') {
      setSnapshot((curr) => ({
        ...curr,
        jobs: curr.jobs.map((j) =>
          j.id === jobId
            ? {
                ...j,
                assignedTechId: targetTechId,
                assignedTechName: tech?.displayName || tech?.email,
                status: nextStatus,
                version: nextVersion,
                updatedAt: now,
              }
            : j
        ),
      }));
      return;
    }

    const call = httpsCallable<
      { orgId: string; jobId: string; targetTechId: string; expectedVersion?: number },
      { success: boolean; jobId: string; version: number; status: string }
    >(getFirebaseServices().functions, 'assignServiceJob');
    await call({
      orgId: snapshot.organization.id,
      jobId,
      targetTechId,
      expectedVersion: expectedVersion ?? job.version,
    });
  }, [snapshot]);

  const rescheduleJob = useCallback(async (jobId: string, date: string, reason: string, expectedVersion: number) => {
    if (dataMode === 'demo') {
      const job = snapshot.jobs.find(item => item.id === jobId);
      if (!job || !['scheduled', 'dispatched'].includes(job.status) || job.version !== expectedVersion) throw new Error('This visit changed or has already started.');
      setSnapshot(current => ({ ...current, jobs: current.jobs.map(item => item.id === jobId ? { ...item, scheduledDate: date, version: expectedVersion + 1 } : item) }));
      return;
    }
    await httpsCallable(getFirebaseServices().functions, 'rescheduleServiceJob')({ orgId: snapshot.organization.id, jobId, scheduledDate: date, reason, expectedVersion });
  }, [snapshot]);

  const startJob = useCallback(async (jobId: string, expectedVersion?: number) => {
    const job = snapshot.jobs.find((j) => j.id === jobId);
    if (!job) throw new Error('Job not found.');
    const now = new Date().toISOString();
    const nextVersion = (job.version || 1) + 1;

    if (dataMode === 'demo') {
      setSnapshot((curr) => ({
        ...curr,
        jobs: curr.jobs.map((j) =>
          j.id === jobId
            ? {
                ...j,
                status: 'in_progress',
                startedAt: now,
                version: nextVersion,
                updatedAt: now,
              }
            : j
        ),
      }));
      return;
    }

    const call = httpsCallable<
      { orgId: string; jobId: string; expectedVersion?: number },
      { success: boolean; jobId: string; version: number; status: string }
    >(getFirebaseServices().functions, 'startServiceJob');
    await call({
      orgId: snapshot.organization.id,
      jobId,
      expectedVersion: expectedVersion ?? job.version,
    });
  }, [snapshot]);

  const cancelJob = useCallback(async (jobId: string, reason: string, expectedVersion?: number) => {
    const job = snapshot.jobs.find((j) => j.id === jobId);
    if (!job) throw new Error('Job not found.');
    const now = new Date().toISOString();
    const nextVersion = (job.version || 1) + 1;

    if (dataMode === 'demo') {
      setSnapshot((curr) => ({
        ...curr,
        jobs: curr.jobs.map((j) =>
          j.id === jobId
            ? {
                ...j,
                status: 'cancelled',
                cancellationReason: reason,
                version: nextVersion,
                updatedAt: now,
              }
            : j
        ),
      }));
      return;
    }

    const call = httpsCallable<
      { orgId: string; jobId: string; reason: string; expectedVersion?: number },
      { success: boolean; jobId: string; version: number; status: string }
    >(getFirebaseServices().functions, 'cancelServiceJob');
    await call({
      orgId: snapshot.organization.id,
      jobId,
      reason,
      expectedVersion: expectedVersion ?? job.version,
    });
  }, [snapshot]);

  const completeJob = useCallback(async (jobId: string, results: AssetServiceResult[], expectedVersion?: number) => {
    const job = snapshot.jobs.find((item) => item.id === jobId);
    if (!job) throw new Error('Job not found.');
    const now = new Date().toISOString();
    const exceptions = results.filter((result) => result.outcome === 'exception').length;
    const unresolved = results.filter((result) => result.outcome === 'unable').length;
    const outcome = summarizeServiceOutcome(results.length, exceptions, unresolved);
    if (dataMode === 'demo') {
      setSnapshot((current) => {
        const config = current.configs[job.vertical];
        const report: ReportRecord = {
          id: `report-${crypto.randomUUID()}`,
          orgId: job.orgId,
          jobId,
          vertical: job.vertical,
          customerId: job.customerId,
          siteId: job.siteId,
          reportNumber: formatReportNumber(job.vertical, new Date().getFullYear(), current.reports.length + 1),
          title: config.report.title,
          outcome,
          generatedAt: now,
          snapshot: {
            organizationName: current.organization.name,
            customerName: current.customers.find(item => item.id === job.customerId)?.businessName || 'Demo customer',
            siteName: current.sites.find(item => item.id === job.siteId)?.siteName || 'Demo site',
            address: current.sites.find(item => item.id === job.siteId)?.address || '',
            technicianName: 'Demo technician', completedAt: now,
            assets: current.assets.filter(item => item.siteId === job.siteId).map(item => ({ id: item.id, name: item.name, assetCode: item.assetCode, location: item.location })),
          },
          disclaimer: config.report.disclaimer,
          results,
        };
        return {
          ...current,
          jobs: current.jobs.map((item) =>
            item.id === jobId
              ? { ...item, status: 'completed', results, completedAt: now, updatedAt: now, version: (item.version || 1) + 1 }
              : item
          ),
          reports: [report, ...current.reports],
        };
      });
      return;
    }

    await httpsCallable(getFirebaseServices().functions, 'completeServiceJob')({
      orgId: job.orgId,
      jobId: job.id,
      results,
      expectedVersion: expectedVersion ?? job.version,
    });
    setView('reports');
  }, [snapshot]);

async function compressImageForStorage(file: File, maxDimension = 1600, quality = 0.82): Promise<File> {
  if (!file.type.match(/^image\/(jpeg|png|webp)$/) || file.size < 350 * 1024) {
    return file;
  }
  try {
    const bitmap = await createImageBitmap(file);
    let { width, height } = bitmap;
    if (width > maxDimension || height > maxDimension) {
      if (width > height) {
        height = Math.round((height * maxDimension) / width);
        width = maxDimension;
      } else {
        width = Math.round((width * maxDimension) / height);
        height = maxDimension;
      }
    }
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    return await new Promise<File>((resolve) => {
      canvas.toBlob(
        (blob) => {
          if (blob && blob.size < file.size) {
            const baseName = file.name.replace(/\.[^.]+$/, '');
            const compressedFile = new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' });
            resolve(compressedFile);
          } else {
            resolve(file);
          }
        },
        'image/jpeg',
        quality
      );
    });
  } catch {
    return file;
  }
}

  const uploadJobPhoto = useCallback(async (jobId: string, assetId: string, file: File, stableEvidenceId?: string) => {
    if (!file.type.match(/^image\/(jpeg|png|webp)$/)) throw new Error('Upload a JPEG, PNG, or WebP image.');
    if (file.size > 20 * 1024 * 1024) throw new Error('Photos must be smaller than 20 MB.');
    const uploadFile = await compressImageForStorage(file);
    if (dataMode === 'demo') {
      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('Unable to read photo.'));
        reader.readAsDataURL(uploadFile);
      });
    }
    const { storage, db } = getFirebaseServices();
    const safeName = uploadFile.name.replace(/[^a-zA-Z0-9._-]/g, '-').slice(-120);
    const evidenceId = stableEvidenceId || `ev-${crypto.randomUUID()}`;
    const path = `orgs/${snapshot.organization.id}/jobs/${jobId}/assets/${assetId}/${evidenceId}-${safeName}`;
    const objectRef = ref(storage, path);
    try { await getMetadata(objectRef); }
    catch (cause) {
      if ((cause as { code?: string }).code !== 'storage/object-not-found') throw cause;
      await uploadBytes(objectRef, uploadFile, { contentType: uploadFile.type, customMetadata: { orgId: snapshot.organization.id, jobId, assetId } });
    }
    const downloadUrl = await getDownloadURL(objectRef);
      const evidenceDoc = doc(db, `orgs/${snapshot.organization.id}/jobs/${jobId}/evidence/${evidenceId}`);
      if (!(await getDoc(evidenceDoc)).exists()) await setDoc(evidenceDoc, {
        id: evidenceId,
        orgId: snapshot.organization.id,
        jobId,
        assetId,
        storagePath: path,
        mimeType: uploadFile.type,
        sizeBytes: uploadFile.size,
        uploadedBy: user?.uid || 'unknown',
        uploadedAt: new Date().toISOString(),
      });
    return downloadUrl;
  }, [snapshot.organization.id, user]);

  const saveWorkflowConfig = useCallback(async (config: VerticalWorkflowConfig) => {
    if (dataMode === 'demo') setSnapshot((current) => ({ ...current, configs: { ...current.configs, [config.vertical]: config } }));
    else await httpsCallable(getFirebaseServices().functions, 'saveWorkflow')({ orgId: snapshot.organization.id, config });
  }, [snapshot.organization.id]);

  const exportData = useCallback(async () => {
    if (dataMode === 'demo') return structuredClone(snapshot);
    const call = httpsCallable<{ orgId: string; collection: string; pageToken?: string }, { documents: Array<{ path: string; data: unknown }>; nextPageToken: string | null }>(getFirebaseServices().functions, 'exportWorkspacePage');
    const startedAt = new Date().toISOString();
    const documents: Array<{ path: string; data: unknown }> = [];
    let bytes = 0;
    for (const collection of ['customers', 'sites', 'extinguishers', 'hood_systems', 'grease_traps', 'jobs', 'reports', 'deficiencies', 'recurring_queue', 'users', 'workflow_configs', 'events', 'evidence']) {
      let pageToken: string | undefined;
      const cursors = new Set<string>();
      do {
        const { data } = await call({ orgId: snapshot.organization.id, collection, ...(pageToken ? { pageToken } : {}) });
        documents.push(...data.documents);
        bytes += new TextEncoder().encode(JSON.stringify(data.documents)).length;
        if (bytes > 100 * 1024 * 1024) throw new Error('This export exceeds the browser download limit. Contact support for a full workspace export; no partial file was downloaded.');
        pageToken = data.nextPageToken || undefined;
        if (pageToken && cursors.has(pageToken)) throw new Error('Export cursor did not advance. Retry the export.');
        if (pageToken) cursors.add(pageToken);
      } while (pageToken);
    }
    return { formatVersion: 1, organization: snapshot.organization, startedAt, completedAt: new Date().toISOString(), includes: 'Database records and photo references. Original image files are not embedded in JSON.', documents };
  }, [snapshot]);

  const createInvitation = useCallback(async (email: string, role: 'manager' | 'technician') => {
    if (dataMode === 'demo') {
      const id = `inv-${Date.now()}`;
      const token = `demo-token-${Date.now()}`;
      const inviteUrl = `${window.location.origin}/?mode=invite&token=${token}`;
      const newInv: InvitationRecord = {
        id,
        orgId: snapshot.organization.id,
        email,
        role,
        status: 'pending',
        expiresAtMs: Date.now() + 86400000 * 3,
        createdAtMs: Date.now(),
        invitedBy: user?.displayName || user?.email || 'Admin',
      };
      setSnapshot((curr) => ({ ...curr, invitations: [...curr.invitations, newInv] }));
      return { invitationId: id, inviteUrl, token };
    }
    const { functions } = getFirebaseServices();
    const call = httpsCallable<{ orgId: string; email: string; role: string }, { invitationId: string; inviteUrl: string; token: string }>(functions, 'createMemberInvitation');
    const res = await call({ orgId: snapshot.organization.id, email, role });
    const inviteUrl = new URL(window.location.pathname, window.location.origin);
    inviteUrl.searchParams.set('token', res.data.token);
    return { ...res.data, inviteUrl: inviteUrl.toString() };
  }, [snapshot.organization.id, user]);

  const acceptInvitation = useCallback(async (token: string) => {
    if (dataMode === 'demo') return;
    const { functions, auth } = getFirebaseServices();
    const call = httpsCallable<{ token: string }, { success: boolean; orgId: string; role: string }>(functions, 'acceptMemberInvitation');
    await call({ token });
    if (auth.currentUser) {
      await auth.currentUser.getIdToken(true);
    }
  }, []);

  const revokeInvitation = useCallback(async (invitationId: string) => {
    if (dataMode === 'demo') {
      setSnapshot((curr) => ({
        ...curr,
        invitations: curr.invitations.filter((i) => i.id !== invitationId),
      }));
      return;
    }
    const { functions } = getFirebaseServices();
    const call = httpsCallable<{ orgId: string; invitationId: string }, { success: boolean }>(functions, 'revokeMemberInvitation');
    await call({ orgId: snapshot.organization.id, invitationId });
  }, [snapshot.organization.id]);

  const updateMemberRole = useCallback(async (userId: string, newRole: 'manager' | 'technician' | 'client') => {
    if (dataMode === 'demo') {
      setSnapshot((curr) => ({
        ...curr,
        members: curr.members.map((m) => (m.userId === userId ? { ...m, role: newRole } : m)),
      }));
      return;
    }
    const { functions } = getFirebaseServices();
    const call = httpsCallable<{ orgId: string; targetUserId: string; newRole: string }, { success: boolean }>(functions, 'updateMemberRole');
    await call({ orgId: snapshot.organization.id, targetUserId: userId, newRole });
  }, [snapshot.organization.id]);

  const setMemberActive = useCallback(async (userId: string, active: boolean) => {
    if (dataMode === 'demo') {
      setSnapshot((curr) => ({
        ...curr,
        members: curr.members.map((m) => (m.userId === userId ? { ...m, active } : m)),
      }));
      return;
    }
    const { functions } = getFirebaseServices();
    const call = httpsCallable<{ orgId: string; targetUserId: string; active: boolean }, { success: boolean }>(functions, 'setMemberActive');
    await call({ orgId: snapshot.organization.id, targetUserId: userId, active });
  }, [snapshot.organization.id]);

  const removeMember = useCallback(async (userId: string) => {
    if (dataMode === 'demo') {
      setSnapshot((curr) => ({
        ...curr,
        members: curr.members.filter((m) => m.userId !== userId),
      }));
      return;
    }
    const { functions } = getFirebaseServices();
    const call = httpsCallable<{ orgId: string; targetUserId: string }, { success: boolean }>(functions, 'removeOrganizationMember');
    await call({ orgId: snapshot.organization.id, targetUserId: userId });
  }, [snapshot.organization.id]);

  const requestWorkspaceDeletion = useCallback(async (confirmationText: string, reason?: string) => {
    if (dataMode === 'demo') {
      throw new Error('Workspace deletion is not available in demo mode.');
    }
    const services = getFirebaseServices();
    const call = httpsCallable<{ orgId: string; confirmationText: string; reason?: string }, { success: boolean; message: string }>(
      services.functions,
      'requestWorkspaceDeletion'
    );
    await call({
      orgId: snapshot.organization.id,
      confirmationText,
      reason,
    });
    await signOutUser();
  }, [dataMode, snapshot.organization.id, signOutUser]);

  const resetDemo = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setSnapshot(createDemoSnapshot(demoVertical));
  }, []);

  const value = useMemo<OperationsContextValue>(() => ({
    mode: dataMode,
    snapshot,
    loading,
    error,
    user,
    needsOnboarding,
    activeVertical,
    view,
    setView,
    signIn,
    register,
    createWorkspace,
    signOutUser,
    resetPassword,
    addCustomerSite,
    addAsset,
    updateCustomerSite,
    updateServiceAsset,
    createJob,
    assignJob,
    startJob,
    rescheduleJob,
    cancelJob,
    completeJob,
    uploadJobPhoto,
    saveWorkflowConfig,
    exportData,
    createInvitation,
    acceptInvitation,
    revokeInvitation,
    updateMemberRole,
    setMemberActive,
    removeMember,
    requestWorkspaceDeletion,
    resetDemo,
  }), [
    snapshot,
    loading,
    error,
    user,
    needsOnboarding,
    activeVertical,
    view,
    signIn,
    register,
    createWorkspace,
    signOutUser,
    resetPassword,
    addCustomerSite,
    addAsset,
    updateCustomerSite,
    updateServiceAsset,
    createJob,
    assignJob,
    startJob,
    rescheduleJob,
    cancelJob,
    completeJob,
    uploadJobPhoto,
    saveWorkflowConfig,
    exportData,
    createInvitation,
    acceptInvitation,
    revokeInvitation,
    updateMemberRole,
    setMemberActive,
    removeMember,
    requestWorkspaceDeletion,
    resetDemo,
  ]);
  return <OperationsContext.Provider value={value}>{children}</OperationsContext.Provider>;
}

export function useOperations() {
  const value = useContext(OperationsContext);
  if (!value) throw new Error('useOperations must be used within OperationsProvider.');
  return value;
}

