import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { validateHostingRelease } from '../scripts/check-hosting-config.mjs';

test('hosting gate rejects missing configuration, wrong project and emulator builds', () => {
  const valid = { firebaseProjectId: 'fieldledger-stg', dataMode: 'firebase', firebaseConfigured: true, appCheckConfigured: true, emulatorsEnabled: false, buildId: 'a'.repeat(20) };
  assert.doesNotThrow(() => validateHostingRelease(valid, 'fieldledger-stg'));
  for (const patch of [{ firebaseConfigured: false }, { appCheckConfigured: false }, { emulatorsEnabled: true }, { dataMode: 'demo' }, { firebaseProjectId: 'bridgeway-db29e' }, { buildId: '' }]) assert.throws(() => validateHostingRelease({ ...valid, ...patch }, 'fieldledger-stg'));
  assert.throws(() => validateHostingRelease({}, 'fieldledger-stg'));
});

test('source fingerprint covers application libraries and styles but ignores generated output', async () => {
  const { sourceHash } = await import('../scripts/lib/release-evidence.mjs');
  const root = mkdtempSync(path.join(tmpdir(), 'fieldledger-source-hash-'));
  try {
    for (const dir of ['apps/fieldledger/src/lib', 'apps/website/src/pages', 'scripts/lib', 'functions/lib']) mkdirSync(path.join(root, dir), { recursive: true });
    let previous = sourceHash(root);
    for (const file of ['apps/fieldledger/src/lib/photo.ts', 'scripts/lib/evidence.mjs', 'apps/website/src/pages/index.astro', 'apps/fieldledger/src/index.css', 'apps/website/src/pages/sample.pdf', '.firebaserc']) {
      writeFileSync(path.join(root, file), 'source');
      const current = sourceHash(root);
      assert.notEqual(current, previous, file);
      previous = current;
    }
    writeFileSync(path.join(root, 'functions/lib/index.js'), 'generated');
    assert.equal(sourceHash(root), previous);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('missing browser acceptance suite is a failure, not a passing release gate', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'fieldledger-empty-suite-'));
  try {
    mkdirSync(path.join(root, 'tests', 'e2e'), { recursive: true });
    const run = spawnSync(process.execPath, [path.resolve('scripts/test-e2e.mjs')], { cwd: root, encoding: 'utf8' });
    assert.equal(run.status, 1, run.stdout + run.stderr);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('new acceptance run invalidates old passes and records every executed gate', async () => {
  const { createAcceptance, recordResult } = await import('../scripts/lib/release-evidence.mjs');
  const steps = [{ name: 'functions-tests' }, { name: 'build' }, { name: 'e2e' }];
  const acceptance = createAcceptance({ checks: { build: { status: 'passed' }, canary: { status: 'passed' } } }, steps, 'hash-new');
  assert.equal(acceptance.checks.build.status, 'not-run');
  assert.equal(acceptance.checks.canary.status, 'unverified');
  recordResult(acceptance, { name: 'functions-tests', command: 'test', log: 'functions-tests.log' }, { status: null, error: new Error('spawn failed') });
  assert.equal(acceptance.checks['functions-tests'].status, 'failed');
  assert.equal(acceptance.releaseStatus, 'prototype');
});
