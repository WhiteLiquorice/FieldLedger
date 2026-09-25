import { describe, expect, it } from 'vitest';
import {
  canTransitionJobStatus,
  validateConcurrency,
  validateJobAssignment,
  buildJobAuditEvent,
  type JobStatus,
} from '../src/engines/job-lifecycle';

describe('Job Lifecycle Engine & State Machine (M2)', () => {
  describe('canTransitionJobStatus', () => {
    it('allows valid forward transitions', () => {
      expect(canTransitionJobStatus('scheduled', 'dispatched').allowed).toBe(true);
      expect(canTransitionJobStatus('scheduled', 'in_progress').allowed).toBe(true);
      expect(canTransitionJobStatus('scheduled', 'cancelled').allowed).toBe(true);

      expect(canTransitionJobStatus('dispatched', 'in_progress').allowed).toBe(true);
      expect(canTransitionJobStatus('dispatched', 'cancelled').allowed).toBe(true);

      expect(canTransitionJobStatus('in_progress', 'completed').allowed).toBe(true);
      expect(canTransitionJobStatus('in_progress', 'cancelled').allowed).toBe(true);
    });

    it('rejects illegal transitions', () => {
      // Cannot jump from scheduled directly to completed without inspection
      expect(canTransitionJobStatus('scheduled', 'completed').allowed).toBe(false);
      expect(canTransitionJobStatus('dispatched', 'completed').allowed).toBe(false);

      // Cannot regress backwards
      expect(canTransitionJobStatus('in_progress', 'scheduled').allowed).toBe(false);
      expect(canTransitionJobStatus('dispatched', 'scheduled').allowed).toBe(false);
    });

    it('enforces that completed and cancelled are immutable terminal states', () => {
      const statuses: JobStatus[] = ['scheduled', 'dispatched', 'in_progress', 'completed', 'cancelled'];
      for (const target of statuses) {
        expect(canTransitionJobStatus('completed', target).allowed).toBe(false);
        expect(canTransitionJobStatus('cancelled', target).allowed).toBe(false);
      }
    });
  });

  describe('validateConcurrency', () => {
    it('allows update when expected version matches current version', () => {
      expect(validateConcurrency(1, 1).allowed).toBe(true);
      expect(validateConcurrency(5, 5).allowed).toBe(true);
    });

    it('rejects update when expected version is stale', () => {
      const res = validateConcurrency(3, 2);
      expect(res.allowed).toBe(false);
      expect(res.reason).toContain('concurrency conflict');
    });

    it('allows update when expected version is omitted (opt-in concurrency)', () => {
      expect(validateConcurrency(2, undefined).allowed).toBe(true);
    });
  });

  describe('validateJobAssignment', () => {
    const mockActiveTech = { userId: 'tech-1', role: 'technician' as const, active: true };
    const mockInactiveTech = { userId: 'tech-2', role: 'technician' as const, active: false };
    const mockClient = { userId: 'client-1', role: 'client' as const, active: true };

    it('allows owner or manager to assign an active technician', () => {
      expect(validateJobAssignment('owner', mockActiveTech).allowed).toBe(true);
      expect(validateJobAssignment('manager', mockActiveTech).allowed).toBe(true);
    });

    it('rejects technician attempting to reassign job', () => {
      const res = validateJobAssignment('technician', mockActiveTech);
      expect(res.allowed).toBe(false);
      expect(res.reason).toContain('Only owners or managers can reassign');
    });

    it('rejects assigning inactive technician or non-technician user', () => {
      expect(validateJobAssignment('manager', mockInactiveTech).allowed).toBe(false);
      expect(validateJobAssignment('manager', mockClient).allowed).toBe(false);
    });
  });

  describe('buildJobAuditEvent', () => {
    it('omits absent fields so a created event can be written to Firestore', () => {
      const event = buildJobAuditEvent({ id: 'event', orgId: 'org', jobId: 'job', eventType: 'created', toStatus: 'scheduled', actorId: 'owner', actorRole: 'owner' });
      expect(Object.values(event).includes(undefined)).toBe(false);
      expect(event).not.toHaveProperty('fromStatus');
      expect(event).not.toHaveProperty('details');
    });
    it('creates a complete immutable event record with timestamp and details', () => {
      const event = buildJobAuditEvent({
        id: 'evt-123',
        orgId: 'org-abc',
        jobId: 'job-xyz',
        eventType: 'started',
        fromStatus: 'dispatched',
        toStatus: 'in_progress',
        actorId: 'tech-1',
        actorRole: 'technician',
        details: { note: 'Arrived on site' },
      });

      expect(event.id).toBe('evt-123');
      expect(event.orgId).toBe('org-abc');
      expect(event.jobId).toBe('job-xyz');
      expect(event.eventType).toBe('started');
      expect(event.fromStatus).toBe('dispatched');
      expect(event.toStatus).toBe('in_progress');
      expect(event.actorId).toBe('tech-1');
      expect(event.actorRole).toBe('technician');
      expect(event.details?.note).toBe('Arrived on site');
      expect(new Date(event.timestamp).getTime()).toBeGreaterThan(0);
    });
  });
});
