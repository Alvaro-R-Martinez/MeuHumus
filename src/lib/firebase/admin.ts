import * as admin from 'firebase-admin';

const firebaseCredentials = process.env.FIREBASE_ADMIN_CREDENTIALS;

let firebaseAdminApp: admin.app.App | null = null;

const resolveCredentials = () => {
  if (!firebaseCredentials) {
    console.warn('FIREBASE_ADMIN_CREDENTIALS não está definido. Funcionalidades de admin não estarão disponíveis.');
    return null;
  }

  const trimmed = firebaseCredentials.trim();

  const tryParse = (value: string) => {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  };

  const direct = tryParse(trimmed);
  if (direct) {
    return direct;
  }

  const decoded = Buffer.from(trimmed, 'base64').toString('utf8');
  const parsed = tryParse(decoded);

  if (!parsed) {
    throw new Error('FIREBASE_ADMIN_CREDENTIALS must be a JSON string or base64-encoded JSON.');
  }

  return parsed;
};

const getFirebaseAdminApp = () => {
  if (firebaseAdminApp) {
    return firebaseAdminApp;
  }

  if (!firebaseCredentials) {
    console.warn('FIREBASE_ADMIN_CREDENTIALS não está definido. Funcionalidades de admin não estarão disponíveis.');
    return null;
  }

  const credentials = resolveCredentials();
  if (!credentials) {
    console.warn('Credenciais do Firebase Admin inválidas. Funcionalidades de admin não estarão disponíveis.');
    return null;
  }

  firebaseAdminApp = admin.initializeApp({
    credential: admin.credential.cert(credentials),
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  });

  return firebaseAdminApp;
};

export const firebaseAdminAuth = () => {
  const app = getFirebaseAdminApp();
  return app ? admin.auth(app) : null;
};

export const firebaseAdminDb = () => {
  const app = getFirebaseAdminApp();
  return app ? admin.firestore(app) : null;
};

export const firebaseAdmin = admin;
