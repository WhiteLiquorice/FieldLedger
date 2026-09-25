import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import net from 'node:net';
import { cleanupFirestoreEmulator } from './lib/cleanup-emulators.mjs';

const root = process.cwd();
const configDirectory = path.join(root, '.local', 'firebase-config');
fs.mkdirSync(configDirectory, { recursive: true });
const firestoreRulesPath = path.join(root, 'firestore.rules');
const storageRulesPath = path.join(root, 'storage.rules');

const firestoreRulesContent = fs.readFileSync(firestoreRulesPath, 'utf8');
const storageRulesContent = fs.readFileSync(storageRulesPath, 'utf8');

const firestoreRulesHash = createHash('sha256').update(firestoreRulesContent).digest('hex');
const storageRulesHash = createHash('sha256').update(storageRulesContent).digest('hex');

console.log(`[test-rules] Testing rules with SHA256 hashes:`);
console.log(`  firestore.rules: ${firestoreRulesHash}`);
console.log(`  storage.rules:   ${storageRulesHash}`);

const firebaseBin = process.platform === 'win32'
  ? path.join(root, 'node_modules', '.bin', 'firebase.cmd')
  : path.join(root, 'node_modules', '.bin', 'firebase');

async function freePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}
const firestorePort = await freePort();
const storagePort = await freePort();
const configPath = path.join(root, '.local', 'rules-emulators.json');
fs.writeFileSync(configPath, JSON.stringify({
  firestore: { rules: firestoreRulesPath }, storage: { rules: storageRulesPath },
  emulators: {
    auth: { host: '127.0.0.1', port: await freePort() },
    firestore: { host: '127.0.0.1', port: firestorePort, websocketPort: await freePort() },
    storage: { host: '127.0.0.1', port: storagePort },
    hub: { host: '127.0.0.1', port: await freePort() },
    logging: { host: '127.0.0.1', port: await freePort() }, ui: { enabled: false }, singleProjectMode: true,
  },
}));
const cmd = `"${firebaseBin}" --config "${configPath}" --project demo-fieldledger-rules emulators:exec --only auth,firestore,storage "node --test tests/rules/firestore-rules.test.mjs tests/rules/storage-rules.test.mjs"`;

const startedAt = new Date().toISOString();
const run = spawnSync(cmd, {
  cwd: root,
  shell: true,
  encoding: 'utf8',
  env: {
    ...process.env,
    ASTRO_TELEMETRY_DISABLED: '1',
    XDG_CONFIG_HOME: configDirectory,
    CI: 'true',
    JAVA_TOOL_OPTIONS: '-Xms64m -Xmx512m',
    STORAGE_EMULATOR_HOST: `127.0.0.1:${storagePort}`,
  },
  maxBuffer: 32 * 1024 * 1024,
});

const finishedAt = new Date().toISOString();
cleanupFirestoreEmulator(root, 'demo-fieldledger-rules', firestorePort);
const output = (run.stdout || '') + (run.stderr || '') + (run.error?.message || '');

console.log(output);

try {
  if (fs.existsSync(path.join(root, 'firestore-debug.log'))) {
    fs.unlinkSync(path.join(root, 'firestore-debug.log'));
  }
  if (fs.existsSync(path.join(root, 'ui-debug.log'))) {
    fs.unlinkSync(path.join(root, 'ui-debug.log'));
  }
} catch {}

fs.mkdirSync(path.join(root, 'release-evidence'), { recursive: true });

const logHeader = [
  `# FieldLedger Security Rules Verification Log`,
  `StartedAt: ${startedAt}`,
  `FinishedAt: ${finishedAt}`,
  `Status: ${run.status === 0 ? 'PASSED' : 'FAILED'} (exitCode: ${run.status})`,
  `FirestoreRulesHash: ${firestoreRulesHash}`,
  `StorageRulesHash: ${storageRulesHash}`,
  `----------------------------------------`,
  '',
].join('\n');

fs.writeFileSync(path.join(root, 'release-evidence', 'self-service-rules.log'), logHeader + output);

if (run.status !== 0) {
  console.error(`[test-rules] Security rules tests failed with exit code ${run.status}`);
  process.exit(run.status || 1);
}

console.log(`[test-rules] All security rules tests passed successfully.`);
