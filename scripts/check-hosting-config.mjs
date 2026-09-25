import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export function validateHostingRelease(release, project) {
  if (!project || release?.firebaseProjectId !== project) throw new Error('Built app does not target the requested Firebase project.');
  if (release.dataMode !== 'firebase' || !release.firebaseConfigured || !release.appCheckConfigured || release.emulatorsEnabled) throw new Error('Built app is missing production Firebase/App Check configuration or enables emulators.');
  if (!/^[a-f0-9]{20}$/.test(release.buildId || '')) throw new Error('Built app has no verifiable release identity.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const release = JSON.parse(fs.readFileSync('apps/website/dist/app/release.json', 'utf8'));
    validateHostingRelease(release, process.env.GCLOUD_PROJECT);
    console.log(`Hosting build configuration accepted for ${release.firebaseProjectId}; live acceptance still required.`);
  } catch (error) { console.error(`BLOCKED: ${error.message}`); process.exitCode = 1; }
}
