import type { JobStatus } from '../types/job.js';

export type JobAuditEventType = 'created' | 'assigned' | 'started' | 'completed' | 'cancelled';

export interface JobAuditEvent {
  id: string;
  orgId: string;
  jobId: string;
  eventType: JobAuditEventType;
  fromStatus?: JobStatus;
  toStatus?: JobStatus;
  actorId: string;
  actorRole: string;
  timestamp: string;
  details?: Record<string, unknown>;
}

const ALLOWED_TRANSITIONS: Record<JobStatus, readonly JobStatus[]> = {
  scheduled: ['dispatched', 'in_progress', 'cancelled'],
  dispatched: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

export function canTransitionJobStatus(
  currentStatus: JobStatus,
  targetStatus: JobStatus
): { allowed: boolean; reason?: string } {
  if (currentStatus === 'completed' || currentStatus === 'cancelled') {
    return {
      allowed: false,
      reason: `Job is in terminal state '${currentStatus}' and cannot be modified.`,
    };
  }

  if (currentStatus === targetStatus) {
    return { allowed: true };
  }

  const validNext = ALLOWED_TRANSITIONS[currentStatus];
  if (!validNext || !validNext.includes(targetStatus)) {
    return {
      allowed: false,
      reason: `Invalid status transition from '${currentStatus}' to '${targetStatus}'.`,
    };
  }

  return { allowed: true };
}

export function validateConcurrency(
  currentVersion: number,
  expectedVersion?: number
): { allowed: boolean; reason?: string } {
  if (expectedVersion === undefined || expectedVersion === null) {
    return { allowed: true };
  }

  if (currentVersion !== expectedVersion) {
    return {
      allowed: false,
      reason: `Job concurrency conflict: document version is ${currentVersion}, but update requested version ${expectedVersion}. Reload latest state before saving.`,
    };
  }

  return { allowed: true };
}

export function validateJobAssignment(
  actorRole: string,
  targetUser?: { userId: string; role: string; active: boolean } | null
): { allowed: boolean; reason?: string } {
  if (actorRole !== 'owner' && actorRole !== 'manager') {
    return {
      allowed: false,
      reason: 'Only owners or managers can reassign service jobs.',
    };
  }

  if (!targetUser || !targetUser.active) {
    return {
      allowed: false,
      reason: 'The designated technician is not an active member of this organization.',
    };
  }

  if (targetUser.role !== 'technician' && targetUser.role !== 'manager' && targetUser.role !== 'owner') {
    return {
      allowed: false,
      reason: `Cannot assign service jobs to user with role '${targetUser.role}'.`,
    };
  }

  return { allowed: true };
}

export function buildJobAuditEvent(params: {
  id: string;
  orgId: string;
  jobId: string;
  eventType: JobAuditEventType;
  fromStatus?: JobStatus;
  toStatus?: JobStatus;
  actorId: string;
  actorRole: string;
  timestamp?: string;
  details?: Record<string, unknown>;
}): JobAuditEvent {
  return {
    id: params.id,
    orgId: params.orgId,
    jobId: params.jobId,
    eventType: params.eventType,
    ...(params.fromStatus === undefined ? {} : { fromStatus: params.fromStatus }),
    ...(params.toStatus === undefined ? {} : { toStatus: params.toStatus }),
    actorId: params.actorId,
    actorRole: params.actorRole,
    timestamp: params.timestamp || new Date().toISOString(),
    ...(params.details === undefined ? {} : { details: params.details }),
  };
}
