import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import { Auth, browserLocalPersistence, getAuth, setPersistence, connectAuthEmulator } from 'firebase/auth';
import { Firestore, initializeFirestore, memoryLocalCache, connectFirestoreEmulator } from 'firebase/firestore';
import { Functions, getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { FirebaseStorage, getStorage, connectStorageEmulator } from 'firebase/storage';
import { initializeAppCheck, ReCaptchaV3Provider, CustomProvider } from 'firebase/app-check';

export type DataMode = 'demo' | 'firebase';

const explicitlyRequestedDemo = typeof window !== 'undefined'
  && new URLSearchParams(window.location.search).get('mode') === 'demo';

export const dataMode: DataMode = explicitlyRequestedDemo
  ? 'demo'
  : import.meta.env.VITE_DATA_MODE
    ? import.meta.env.VITE_DATA_MODE
    : import.meta.env.DEV
      ? 'demo'
      : 'firebase';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export interface FirebaseServices {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  functions: Functions;
  storage: FirebaseStorage;
}

let services: FirebaseServices | null = null;

export function getFirebaseServices(): FirebaseServices {
  if (dataMode !== 'firebase') throw new Error('Firebase services requested while VITE_DATA_MODE is not firebase.');
  if (services) return services;
  const emulators = import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS === 'true';
  if (emulators && (!firebaseConfig.projectId?.startsWith('demo-') || !['localhost', '127.0.0.1'].includes(window.location.hostname))) {
    throw new Error('Emulator connections require a local development server and demo project.');
  }

  const missingFirebaseValues = Object.entries(firebaseConfig)
    .filter(([, value]) => typeof value !== 'string' || !value.trim())
    .map(([key]) => key);
  if (missingFirebaseValues.length > 0) {
    throw new Error(`FieldLedger Firebase configuration is incomplete: ${missingFirebaseValues.join(', ')}.`);
  }
  if (!import.meta.env.VITE_RECAPTCHA_SITE_KEY) {
    throw new Error('FieldLedger App Check configuration is missing VITE_RECAPTCHA_SITE_KEY.');
  }

  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  if (import.meta.env.DEV && import.meta.env.VITE_APPCHECK_DEBUG_TOKEN) {
      (globalThis as typeof globalThis & { FIREBASE_APPCHECK_DEBUG_TOKEN?: string }).FIREBASE_APPCHECK_DEBUG_TOKEN = import.meta.env.VITE_APPCHECK_DEBUG_TOKEN;
  }
  initializeAppCheck(app, {
    provider: emulators ? new CustomProvider({ getToken: async () => {
      const part = (value: unknown) => btoa(JSON.stringify(value)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
      return { token: `${part({ alg: 'none' })}.${part({ app_id: firebaseConfig.appId, sub: firebaseConfig.appId, exp: Math.floor(Date.now() / 1000) + 3600 })}.`, expireTimeMillis: Date.now() + 3600000 };
    } }) : new ReCaptchaV3Provider(import.meta.env.VITE_RECAPTCHA_SITE_KEY),
    isTokenAutoRefreshEnabled: true,
  });
  const auth = getAuth(app);
  void setPersistence(auth, browserLocalPersistence);
  services = {
    app,
    auth,
    db: initializeFirestore(app, {
      localCache: memoryLocalCache(),
    }),
    functions: getFunctions(app, 'us-central1'),
    storage: getStorage(app),
  };
  if (emulators) {
    connectAuthEmulator(auth, `http://127.0.0.1:${import.meta.env.VITE_AUTH_EMULATOR_PORT}`, { disableWarnings: true });
    connectFirestoreEmulator(services.db, '127.0.0.1', Number(import.meta.env.VITE_FIRESTORE_EMULATOR_PORT));
    connectFunctionsEmulator(services.functions, '127.0.0.1', Number(import.meta.env.VITE_FUNCTIONS_EMULATOR_PORT));
    connectStorageEmulator(services.storage, '127.0.0.1', Number(import.meta.env.VITE_STORAGE_EMULATOR_PORT));
  }
  return services;
}
