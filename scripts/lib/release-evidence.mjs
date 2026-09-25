import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';

export function sourceHash(root) {
  const hash = createHash('sha256');
  const excluded = new Set(['node_modules', 'dist', '.git', '.firebase', '.local', 'release-evidence', 'output']);
  const generated = new Set(['functions/lib', 'packages/backend-core/lib']);
  function visit(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const file = path.join(directory, entry.name);
      const relative = path.relative(root, file).replace(/\\/g, '/');
      if (entry.isDirectory() && !excluded.has(entry.name) && !generated.has(relative)) visit(file);
      else if (entry.isFile() && (entry.name === '.firebaserc' || /\.(?:[cm]?[jt]sx?|json|rules|astro|css|html|svg|webmanifest|ya?ml|pdf|png|jpe?g|webp|ico|woff2?)$/.test(entry.name))) {
        hash.update(relative); hash.update('\0'); hash.update(fs.readFileSync(file)); hash.update('\0');
      }
    }
  }
  visit(root);
  return hash.digest('hex');
}

export function createAcceptance(previous, steps, hash) {
  const checks = {};
  for (const [name, value] of Object.entries(previous.checks || {})) {
    checks[name] = { ...value, status: 'unverified', reason: 'Historical evidence; not executed for this source snapshot.' };
  }
  for (const step of steps) checks[step.name] = { status: 'not-run', reason: 'Not executed in this run.' };
  return { product: 'FieldLedger', releaseStatus: 'prototype', runId: randomUUID(), sourceHash: hash, startedAt: new Date().toISOString(), checks };
}

export function recordResult(acceptance, step, run, startedAt = new Date().toISOString()) {
  acceptance.checks[step.name] = {
    status: run.status === 0 && !run.error && !run.signal ? 'passed' : 'failed',
    command: step.command, log: step.log, startedAt, timestamp: new Date().toISOString(),
    exitCode: run.status, signal: run.signal || null, error: run.error?.message || null,
    sourceHash: acceptance.sourceHash,
  };
  acceptance.updatedAt = new Date().toISOString();
}
