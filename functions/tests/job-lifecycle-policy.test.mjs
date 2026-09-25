import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  canTransitionJobStatus,
  validateConcurrency,
  validateJobAssignment,
  buildJobAuditEvent,
} from '@compliance-saas/backend-core';

test('job lifecycle: transition permissions enforce forward progression', () => {
  // Valid forward steps
  assert.equal(canTransitionJobStatus('scheduled', 'dispatched').allowed, true);
  assert.equal(canTransitionJobStatus('scheduled', 'in_progress').allowed, true);
  assert.equal(canTransitionJobStatus('scheduled', 'cancelled').allowed, true);
  assert.equal(canTransitionJobStatus('dispatched', 'in_progress').allowed, true);
  assert.equal(canTransitionJobStatus('dispatched', 'cancelled').allowed, true);
  assert.equal(canTransitionJobStatus('in_progress', 'completed').allowed, true);
  assert.equal(canTransitionJobStatus('in_progress', 'cancelled').allowed, true);

  // Invalid skips and regressions
  assert.equal(canTransitionJobStatus('scheduled', 'completed').allowed, false);
  assert.equal(canTransitionJobStatus('dispatched', 'completed').allowed, false);
  assert.equal(canTransitionJobStatus('in_progress', 'scheduled').allowed, false);

  // Terminal states cannot transition to anything
  assert.equal(canTransitionJobStatus('completed', 'scheduled').allowed, false);
  assert.equal(canTransitionJobStatus('completed', 'completed').allowed, false);
  assert.equal(canTransitionJobStatus('cancelled', 'in_progress').allowed, false);
});

test('job lifecycle: optimistic concurrency validation', () => {
  // Matching version
  assert.equal(validateConcurrency(1, 1).allowed, true);
  assert.equal(validateConcurrency(4, 4).allowed, true);

  // Stale version rejected
  const conflict = validateConcurrency(3, 2);
  assert.equal(conflict.allowed, false);
  assert.match(conflict.reason, /concurrency conflict/);

  // Opt-in concurrency (no expected version provided)
  assert.equal(validateConcurrency(2, undefined).allowed, true);
});

test('job lifecycle: technician assignment validation', () => {
  const activeTech = { userId: 'tech-1', role: 'technician', active: true };
  const inactiveTech = { userId: 'tech-2', role: 'technician', active: false };
  const clientUser = { userId: 'client-1', role: 'client', active: true };

  // Owner/manager can assign active technician
  assert.equal(validateJobAssignment('owner', activeTech).allowed, true);
  assert.equal(validateJobAssignment('manager', activeTech).allowed, true);

  // Technician cannot reassign
  assert.equal(validateJobAssignment('technician', activeTech).allowed, false);

  // Inactive technician cannot be assigned
  assert.equal(validateJobAssignment('owner', inactiveTech).allowed, false);

  // Client cannot be assigned to job
  assert.equal(validateJobAssignment('owner', clientUser).allowed, false);
});

test('job lifecycle: audit event builder creates immutable record', () => {
  const event = buildJobAuditEvent({
    id: 'evt-1',
    orgId: 'org-1',
    jobId: 'job-1',
    eventType: 'started',
    fromStatus: 'dispatched',
    toStatus: 'in_progress',
    actorId: 'tech-1',
    actorRole: 'technician',
    details: { version: 2 },
  });

  assert.equal(event.id, 'evt-1');
  assert.equal(event.eventType, 'started');
  assert.equal(event.toStatus, 'in_progress');
  assert.equal(event.actorId, 'tech-1');
  assert.equal(typeof event.timestamp, 'string');
  assert.equal(event.details?.version, 2);
});
