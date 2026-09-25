import { createHash } from 'node:crypto';

export interface RulesEvidence {
  status: string;
  rulesHash?: string;
  timestamp?: string;
  reason?: string;
}

export interface GateCheck {
  status: string;
  [key: string]: unknown;
}

export interface DeploymentManifest {
  firebase?: {
    stagingProjects?: string[];
    productionProjects?: string[];
    provisionedProjects?: string[];
  };
}

export function validateRulesEvidence(
  evidence: RulesEvidence,
  currentRulesContent: string
): { valid: boolean; reason?: string } {
  if (evidence.status !== 'passed') {
    return { valid: false, reason: 'Rules tests did not pass.' };
  }

  const expectedHash = createHash('sha256').update(currentRulesContent).digest('hex');
  if (!evidence.rulesHash || evidence.rulesHash.toLowerCase() !== expectedHash.toLowerCase()) {
    return {
      valid: false,
      reason: `Recorded rules hash (${evidence.rulesHash}) does not match current file content (${expectedHash}). Stale evidence rejected.`,
    };
  }

  return { valid: true };
}

export function canPromoteToLocalCandidate(
  checks: Record<string, GateCheck>
): { allowed: boolean; missingGates: string[] } {
  const requiredGates = ['build', 'unit-tests', 'release-audit', 'rules', 'e2e'];
  const missingGates: string[] = [];

  for (const gate of requiredGates) {
    if (!checks[gate] || checks[gate].status !== 'passed') {
      missingGates.push(gate);
    }
  }

  return {
    allowed: missingGates.length === 0,
    missingGates,
  };
}

export function validateDeployTarget(
  targetProject: string,
  manifest: DeploymentManifest
): { allowed: boolean; reason?: string } {
  if (!targetProject || typeof targetProject !== 'string' || !targetProject.trim()) {
    return { allowed: false, reason: 'Target project is empty.' };
  }

  const normalized = targetProject.trim();
  if (normalized === 'bridgeway-db29e') {
    return { allowed: false, reason: 'Shared project bridgeway-db29e is strictly prohibited.' };
  }

  const allowedProjects = [
    ...(manifest.firebase?.stagingProjects || []),
    ...(manifest.firebase?.productionProjects || []),
  ];

  if (!allowedProjects.includes(normalized)) {
    return {
      allowed: false,
      reason: `Project '${normalized}' is not in the dedicated project allowlist (${allowedProjects.join(', ')}).`,
    };
  }

  return { allowed: true };
}
