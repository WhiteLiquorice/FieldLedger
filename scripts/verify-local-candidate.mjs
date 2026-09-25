import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { sourceHash, createAcceptance, recordResult } from './lib/release-evidence.mjs';

const root = process.cwd();
const evidenceDir = path.join(root, 'release-evidence');
fs.mkdirSync(evidenceDir, { recursive: true });
const steps = [
  { name: 'release-runner', command: 'node --test tests/release-runner.test.mjs', log: 'release-runner.log' },
  { name: 'service-worker', command: 'node --test tests/service-worker.test.mjs', log: 'service-worker.log' },
  { name: 'unit-tests', command: 'npm run test:core', log: 'unit-tests.log' },
  { name: 'functions-tests', command: 'npm run test:functions', log: 'functions-tests.log' },
  { name: 'rules', command: 'npm run test:rules', log: 'self-service-rules.log' },
  { name: 'build', command: 'npm run build:all', log: 'build.log' },
  { name: 'release-audit', command: 'npm run audit:release', log: 'release-audit.log' },
  { name: 'demo-e2e', command: 'npm run test:e2e', log: 'demo-e2e.log' },
  { name: 'e2e', command: 'npm run test:e2e:authenticated', log: 'authenticated-e2e.log' },
];
const acceptancePath = path.join(evidenceDir, 'acceptance.json');
const previous = fs.existsSync(acceptancePath) ? JSON.parse(fs.readFileSync(acceptancePath, 'utf8')) : {};
const acceptance = createAcceptance(previous, steps, sourceHash(root));
const persist = () => fs.writeFileSync(acceptancePath, JSON.stringify(acceptance, null, 2) + '\n');
persist();
for (const step of steps) {
  console.log(`[${step.name}] ${step.command}`);
  const startedAt = new Date().toISOString();
  const run = spawnSync(step.command, { shell: true, cwd: root, encoding: 'utf8', env: { ...process.env, ASTRO_TELEMETRY_DISABLED: '1' }, maxBuffer: 32 * 1024 * 1024 });
  const output = (run.stdout || '') + (run.stderr || '') + (run.error?.message || '');
  fs.writeFileSync(path.join(evidenceDir, step.log), output);
  recordResult(acceptance, step, run, startedAt);
  persist();
  console.log(`[${step.name}] ${acceptance.checks[step.name].status}`);
  if (acceptance.checks[step.name].status !== 'passed') { console.error(output); process.exit(1); }
}
if (sourceHash(root) !== acceptance.sourceHash) {
  acceptance.sourceChangedDuringRun = true;
  persist();
  throw new Error('Source changed during verification. Rerun against a stable snapshot.');
}
acceptance.releaseStatus = 'local-candidate';
persist();
console.log('All local candidate gates passed. Live acceptance remains independent.');
