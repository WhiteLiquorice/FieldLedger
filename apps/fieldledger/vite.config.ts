import path from 'node:path';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, 'VITE_');
  return {
  base: '/app/',
  plugins: [react(), {
    name: 'version-offline-shell',
    apply: 'build',
    closeBundle() {
      const dist = path.join(__dirname, 'dist');
      const assets = fs.readdirSync(path.join(dist, 'assets')).filter(name => /\.(js|css)$/.test(name)).sort();
      const template = fs.readFileSync(path.join(__dirname, 'public/sw.js'), 'utf8');
      const hash = createHash('sha256').update(template).update(fs.readFileSync(path.join(dist, 'index.html')));
      for (const asset of assets) hash.update(asset).update(fs.readFileSync(path.join(dist, 'assets', asset)));
      const buildId = hash.digest('hex').slice(0, 20);
      fs.writeFileSync(path.join(dist, 'sw.js'), template.replace('__BUILD_ID__', buildId).replace('/* BUILD_ASSETS */', assets.map(name => `, ${JSON.stringify('/app/assets/' + name)}`).join('')));
      fs.writeFileSync(path.join(dist, 'release.json'), JSON.stringify({
        buildId,
        firebaseProjectId: env.VITE_FIREBASE_PROJECT_ID || null,
        dataMode: env.VITE_DATA_MODE || 'firebase',
        firebaseConfigured: ['API_KEY', 'AUTH_DOMAIN', 'PROJECT_ID', 'STORAGE_BUCKET', 'APP_ID'].every(key => Boolean(env[`VITE_FIREBASE_${key}`]?.trim())),
        appCheckConfigured: Boolean(env.VITE_RECAPTCHA_SITE_KEY?.trim()),
        emulatorsEnabled: env.VITE_USE_EMULATORS === 'true',
      }) + '\n');
    },
  }],
  optimizeDeps: { include: ['pdf-lib'] },
  resolve: {
    alias: {
      'node:crypto': path.resolve(__dirname, 'src/lib/crypto-browser.ts'),
      crypto: path.resolve(__dirname, 'src/lib/crypto-browser.ts'),
    },
  },
  build: {
    sourcemap: true,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/@firebase/firestore')) return 'firebase-firestore';
          if (id.includes('node_modules/@firebase/auth')) return 'firebase-auth';
          if (id.includes('node_modules/@firebase/storage')) return 'firebase-storage';
          if (id.includes('node_modules/@firebase/functions')) return 'firebase-functions';
          if (id.includes('node_modules/@firebase/app-check')) return 'firebase-app-check';
          if (id.includes('node_modules/@firebase')) return 'firebase-core';
          if (id.includes('node_modules/react')) return 'react';
          if (id.includes('node_modules/lucide-react')) return 'icons';
          return undefined;
        },
      },
    },
  },
  server: {
    port: 5173,
    host: true,
  },
  };
});
