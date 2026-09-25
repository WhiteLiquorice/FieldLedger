import type { ComplianceVertical, VerticalWorkflowConfig } from '@compliance-saas/backend-core';

export type Vertical = ComplianceVertical;
export type AssetStatus = 'ready' | 'due_soon' | 'overdue' | 'service_required' | 'inactive';
export type JobStatus = 'scheduled' | 'dispatched' | 'in_progress' | 'completed' | 'cancelled';

export interface OrganizationRecord {
  id: string;
  name: string;
  vertical: Vertical;
  planTier?: 'starter' | 'custom';
  maxTechnicians?: number;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  subscriptionStatus?: 'trialing' | 'active' | 'past_due' | 'expired' | 'canceled' | 'unpaid' | 'paused' | 'incomplete' | 'not_started';
  currentPeriodEnd?: string;
  paymentAlert?: string;
  status?: string;
  createdByUserId?: string;
  trialStartedAt?: string;
  trialEndsAt?: string;
  isTrialActive?: boolean;
  featureOverrides?: {
    fullCustomization?: boolean;
    customChecklists?: boolean;
    customBranding?: boolean;
    customExports?: boolean;
    prioritySupport?: boolean;
  };
}

export interface CompanyProfileInput {
  companyName: string;
  vertical: Vertical;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  licenseNumber?: string;
}

export interface CustomerRecord {
  version?: number;
  id: string;
  orgId: string;
  businessName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  active: boolean;
}

export interface SiteRecord {
  version?: number;
  id: string;
  orgId: string;
  customerId: string;
  siteName: string;
  address: string;
  city: string;
  state: string;
  accessInstructions?: string;
}

export interface AssetRecord {
  version?: number;
  id: string;
  orgId: string;
  customerId: string;
  siteId: string;
  vertical: Vertical;
  assetCode: string;
  name: string;
  location: string;
  status: AssetStatus;
  lastServicedAt?: string;
  nextServiceDueAt?: string;
  serviceSchedule: { unit: 'days' | 'months' | 'years'; interval: number };
  details: Record<string, string | number | boolean | undefined>;
}

export interface AssetServiceResult {
  assetId: string;
  outcome: 'completed' | 'exception' | 'unable';
  quantity?: number;
  notes?: string;
  photoUrls?: string[];
  checklist: Record<string, string | number | boolean>;
}

export interface JobRecord {
  id: string;
  orgId: string;
  vertical: Vertical;
  customerId: string;
  siteId: string;
  assignedTechId: string;
  scheduledDate: string;
  status: JobStatus;
  version?: number;
  assignedTechName?: string;
  cancellationReason?: string;
  results: AssetServiceResult[];
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReportRecord {
  revision?: number;
  baseReportId?: string;
  previousReportId?: string;
  addenda?: Array<{ note: string; reason: string; authorId: string; authorName: string; createdAt: string }>;
  snapshot?: {
    checklistLabels?: Record<string, string>;
    organizationName: string;
    customerName: string;
    siteName: string;
    address: string;
    technicianName: string;
    completedAt: string;
    assets: Array<{ id: string; name: string; assetCode: string; location: string }>;
  };
  id: string;
  orgId: string;
  jobId: string;
  vertical: Vertical;
  customerId: string;
  siteId: string;
  reportNumber: string;
  title: string;
  outcome: 'completed_no_exceptions' | 'completed_with_exceptions' | 'incomplete';
  generatedAt: string;
  disclaimer?: string;
  results?: AssetServiceResult[];
}

export type TeamRole = 'owner' | 'manager' | 'technician' | 'client';

export interface TeamMemberRecord {
  userId: string;
  orgId: string;
  role: TeamRole;
  email?: string;
  displayName?: string;
  active: boolean;
  enrolledAt?: string;
}

export interface InvitationRecord {
  id: string;
  orgId: string;
  email: string;
  role: 'manager' | 'technician';
  status: 'pending' | 'accepted' | 'revoked' | 'expired';
  expiresAtMs: number;
  createdAtMs?: number;
  invitedBy?: string;
}

export interface OperationsSnapshot {
  organization: OrganizationRecord;
  customers: CustomerRecord[];
  sites: SiteRecord[];
  assets: AssetRecord[];
  jobs: JobRecord[];
  reports: ReportRecord[];
  members: TeamMemberRecord[];
  invitations: InvitationRecord[];
  configs: Record<Vertical, VerticalWorkflowConfig>;
}

