import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// Validate every required Firebase env var up front. A missing REACT_APP_FIREBASE_API_KEY
// (or any other required key) would otherwise silently produce `apiKey: undefined`,
// which surfaces later as a generic 400 from identitytoolkit.googleapis.com on every
// sign-in attempt. Failing loudly here makes misconfigured deploys obvious.
const REQUIRED_KEYS = [
  ['REACT_APP_FIREBASE_API_KEY', 'apiKey'],
  ['REACT_APP_FIREBASE_AUTH_DOMAIN', 'authDomain'],
  ['REACT_APP_FIREBASE_PROJECT_ID', 'projectId'],
  ['REACT_APP_FIREBASE_STORAGE_BUCKET', 'storageBucket'],
  ['REACT_APP_FIREBASE_MESSAGING_SENDER_ID', 'messagingSenderId'],
  ['REACT_APP_FIREBASE_APP_ID', 'appId'],
];

const firebaseConfig = {};
const missing = [];
for (const [envName, configKey] of REQUIRED_KEYS) {
  const value = process.env[envName];
  if (!value || !value.trim()) {
    missing.push(envName);
  } else {
    firebaseConfig[configKey] = value.trim();
  }
}

if (missing.length > 0) {
  // Loud, descriptive error so it shows up immediately in DevTools on every page.
  // eslint-disable-next-line no-console
  console.error(
    `[firebase] Missing required env var(s): ${missing.join(', ')}. ` +
    'Sign-in will fail until these are set in the deployment environment.'
  );
  throw new Error(
    `Firebase is not configured. Missing env var(s): ${missing.join(', ')}. ` +
    'Set them in your .env file (local) or in the Vercel project settings (production) and redeploy.'
  );
}

// eslint-disable-next-line no-console
console.info(
  `[firebase] Initialized for project "${firebaseConfig.projectId}" ` +
  `(auth domain: ${firebaseConfig.authDomain}).`
);

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export default app;