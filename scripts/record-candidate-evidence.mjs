import { spawnSync } from 'node:child_process';

const run = spawnSync('node scripts/verify-local-candidate.mjs', {
  shell: true,
  stdio: 'inherit',
  env: { ...process.env, ASTRO_TELEMETRY_DISABLED: '1' },
});

process.exit(run.status === 0 && !run.error && !run.signal ? 0 : 1);
