import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

test('E2E runner rejects a missing suite instead of passing', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'fieldledger-empty-tests-'));
  const run = spawnSync(process.execPath, [path.resolve('scripts/test-e2e.mjs')], { cwd: root });
  assert.notEqual(run.status, 0);
});

test('E2E runner propagates a failed browser suite', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'fieldledger-failed-tests-'));
  mkdirSync(path.join(root, 'tests/e2e'), { recursive: true });
  writeFileSync(path.join(root, 'tests/e2e/failure.test.mjs'), 'throw new Error("deliberate failure");');
  const run = spawnSync(process.execPath, [path.resolve('scripts/test-e2e.mjs')], { cwd: root });
  assert.notEqual(run.status, 0);
});

test('new candidate evidence invalidates all old local passes and records Functions results', async () => {
  const { startAcceptance, recordResult } = await import('../../scripts/lib/candidate-evidence.mjs');
  const previous = { releaseStatus: 'local-candidate', checks: { build: {status:'passed'}, e2e: {status:'passed'}, canary: {status:'passed'} } };
  const state = startAcceptance(previous, ['build', 'functions-tests', 'e2e'], 'source-a');
  assert.equal(state.checks.e2e.status, 'not-run');
  assert.equal(state.releaseStatus, 'prototype');
  assert.equal(state.checks.canary.status, 'stale');
  recordResult(state, 'functions-tests', {status:0}, {command:'npm run test:functions', log:'functions-tests.log'});
  assert.equal(state.checks['functions-tests'].status, 'passed');
  recordResult(state, 'build', {status:null, error:new Error('spawn failed')}, {});
  assert.equal(state.checks.build.status, 'failed');
});
