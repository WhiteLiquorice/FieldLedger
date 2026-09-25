import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const e2eDir = path.join(root, 'tests', 'e2e');

// If dedicated E2E test files exist, run them with node --test
const e2eFiles = fs.existsSync(e2eDir)
  ? fs.readdirSync(e2eDir).filter(f => f.endsWith('.test.mjs') || f.endsWith('.test.js'))
  : [];

if (e2eFiles.length > 0) {
  const args = ['--test', ...e2eFiles.map(f => path.join('tests', 'e2e', f))];
  console.log(`[test:e2e] Running ${e2eFiles.length} E2E test suite(s)...`);
  const run = spawnSync('node', args, { cwd: root, stdio: 'inherit', shell: true });
  process.exit(run.status === 0 && !run.error && !run.signal ? 0 : 1);
} else {
  console.error('[test:e2e] Required browser acceptance suite is missing.');
  process.exit(1);
}
