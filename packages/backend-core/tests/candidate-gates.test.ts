import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import {
  validateRulesEvidence,
  canPromoteToLocalCandidate,
  validateDeployTarget,
} from '../src/compliance/candidate-gates';

describe('candidate gates and evidence verification (M0)', () => {
  it('rejects rules evidence when recorded rules hash differs from current file content', () => {
    const rulesContent = "rules_version = '2'; service cloud.firestore { match /{document=**} { allow read, write: if false; } }";
    const actualHash = createHash('sha256').update(rulesContent).digest('hex');
    const staleHash = createHash('sha256').update('rules_version = 1;').digest('hex');

    const validEvidence = {
      status: 'passed',
      rulesHash: actualHash,
      timestamp: new Date().toISOString(),
    };
    const staleEvidence = {
      status: 'passed',
      rulesHash: staleHash,
      timestamp: new Date().toISOString(),
    };

    expect(validateRulesEvidence(validEvidence, rulesContent).valid).toBe(true);
    const staleResult = validateRulesEvidence(staleEvidence, rulesContent);
    expect(staleResult.valid).toBe(false);
    expect(staleResult.reason).toMatch(/hash mismatch|stale/i);
  });

  it('prohibits promotion to local-candidate if rules or e2e checks are missing or unpassed', () => {
    const incompleteChecks = {
      build: { status: 'passed' },
      'unit-tests': { status: 'passed' },
      'release-audit': { status: 'passed' },
      rules: { status: 'not-run' },
      e2e: { status: 'not-run' },
    };

    const result = canPromoteToLocalCandidate(incompleteChecks);
    expect(result.allowed).toBe(false);
    expect(result.missingGates).toContain('rules');
    expect(result.missingGates).toContain('e2e');
  });

  it('rejects bridgeway-db29e and non-allowlisted deploy targets before Firebase invocation', () => {
    const manifest = {
      firebase: {
        stagingProjects: ['fieldledger-stg'],
        productionProjects: ['fieldledger-prod'],
      },
    };

    expect(validateDeployTarget('fieldledger-stg', manifest).allowed).toBe(true);
    expect(validateDeployTarget('fieldledger-prod', manifest).allowed).toBe(true);
    expect(validateDeployTarget('bridgeway-db29e', manifest).allowed).toBe(false);
    expect(validateDeployTarget('unrelated-project', manifest).allowed).toBe(false);
    expect(validateDeployTarget('', manifest).allowed).toBe(false);
  });
});
