import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { cleanupFirestoreEmulator } from './lib/cleanup-emulators.mjs';
const root = process.cwd();
const projectId = 'demo-fieldledger-acceptance';
fs.mkdirSync(path.join(root, '.local', 'firebase-config'), { recursive: true });
async function freePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}
const ports = {};
for (const name of ['auth', 'firestore', 'storage', 'functions', 'hub', 'logging']) ports[name] = await freePort();
const config = {
  firestore: { rules: path.join(root, 'firestore.rules'), indexes: path.join(root, 'firestore.indexes.json') },
  storage: { rules: path.join(root, 'storage.rules') },
  functions: [{ source: '../functions', codebase: 'fieldledger' }],
  emulators: { ...Object.fromEntries(Object.entries(ports).map(([name, port]) => [name, { host: '127.0.0.1', port }])), ui: { enabled: false }, singleProjectMode: true },
};
config.emulators.firestore.websocketPort = await freePort();
const configPath = path.join(root, '.local', 'authenticated-emulators.json');
fs.writeFileSync(configPath, JSON.stringify(config));
const env = {
  ...process.env, XDG_CONFIG_HOME: path.join(root, '.local', 'firebase-config'), CI: 'true',
  VITE_DATA_MODE: 'firebase', VITE_USE_EMULATORS: 'true',
  VITE_FIREBASE_API_KEY: 'emulator-only-key', VITE_FIREBASE_PROJECT_ID: projectId,
  VITE_FIREBASE_AUTH_DOMAIN: `${projectId}.firebaseapp.com`, VITE_FIREBASE_STORAGE_BUCKET: `${projectId}.appspot.com`,
  VITE_FIREBASE_APP_ID: '1:123:web:emulator', VITE_RECAPTCHA_SITE_KEY: 'emulator-only',
  VITE_AUTH_EMULATOR_PORT: String(ports.auth), VITE_FIRESTORE_EMULATOR_PORT: String(ports.firestore),
  VITE_STORAGE_EMULATOR_PORT: String(ports.storage), VITE_FUNCTIONS_EMULATOR_PORT: String(ports.functions),
  FIELDLEDGER_APP_URL: 'http://127.0.0.1/app/', STRIPE_STARTER_PRICE_ID: 'price_emulator_only',
  GCE_METADATA_HOST: '127.0.0.1:9',
  FUNCTIONS_DISCOVERY_TIMEOUT: '60',
  JAVA_TOOL_OPTIONS: '-Xms64m -Xmx512m',
};
const firebase = path.join(root, 'node_modules', 'firebase-tools', 'lib', 'bin', 'firebase.js');
fs.mkdirSync(path.join(root, 'release-evidence'), { recursive: true });
const log = path.join(root, 'release-evidence', 'authenticated-run.log');
fs.writeFileSync(log, `Started: ${new Date().toISOString()}\n`);
const child = spawn(process.execPath, [firebase, '--config', configPath, '--project', projectId, 'emulators:exec', '--only', 'auth,firestore,storage,functions', 'node --test --test-force-exit tests/authenticated/owner-technician.test.mjs'], { env, cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
for (const stream of [child.stdout, child.stderr]) stream.on('data', chunk => { fs.appendFileSync(log, chunk); process.stdout.write(chunk); });
child.on('error', error => { fs.appendFileSync(log, error.stack); process.exitCode = 1; });
child.on('close', (code, signal) => {
  process.exitCode = code === 0 && !signal ? 0 : 1;
  try { cleanupFirestoreEmulator(root, projectId, ports.firestore); }
  catch (error) { fs.appendFileSync(log, `Emulator cleanup failed: ${error.message}\n`); console.error(error.message); process.exitCode = 1; }
});
