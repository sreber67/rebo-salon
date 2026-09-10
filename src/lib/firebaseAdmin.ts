import 'server-only';
import { initializeApp, getApps, cert, App, ServiceAccount } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

let adminApp: App | null = null;
let adminAuthInstance: Auth | null = null;
let adminDbInstance: Firestore | null = null;

/**
 * Initialize Firebase Admin SDK (singleton pattern)
 * Safe to call multiple times during Next.js hot-reloading
 */
function getAdminApp(): App {
  if (adminApp) return adminApp;

  if (getApps().length > 0) {
    adminApp = getApps()[0];
    return adminApp;
  }

  const base64Key = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (!base64Key) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_BASE64 is not set in environment variables');
  }

  let serviceAccount: ServiceAccount;
  try {
    const decoded = Buffer.from(base64Key, 'base64').toString('utf-8');
    serviceAccount = JSON.parse(decoded);
  } catch (error) {
    throw new Error('Invalid FIREBASE_SERVICE_ACCOUNT_BASE64: failed to decode/parse');
  }

  adminApp = initializeApp({
    credential: cert(serviceAccount),
    // Set region for GDPR compliance
    projectId: serviceAccount.projectId,
  });

  return adminApp;
}

/**
 * Get Firebase Admin Auth instance
 */
export function getAdminAuth(): Auth {
  if (!adminAuthInstance) {
    adminAuthInstance = getAuth(getAdminApp());
  }
  return adminAuthInstance;
}

/**
 * Get Firebase Admin Firestore instance
 */
export function getAdminDb(): Firestore {
  if (!adminDbInstance) {
    adminDbInstance = getFirestore(getAdminApp());
  }
  return adminDbInstance;
}

/**
 * Backward compatibility exports.
 * IMPORTANT: these are lazy proxies, not eager instances. They used to call
 * getAdminAuth()/getAdminDb() directly at module load time, which meant that
 * simply IMPORTING this file - in /api/email, /api/translate-ui, or any other
 * route - triggered Firebase Admin SDK initialization immediately, before
 * that route's own request handler (and its own try/catch) ever ran. Any
 * hiccup in that init (a cold-start timing issue, a transient credential
 * problem in one particular serverless instance, etc.) crashed the entire
 * route with an opaque, unhandled 500 - and because /api/email and
 * /api/translate-ui both import this file, a single shared failure here
 * took both features down together, which is exactly what was observed.
 *
 * Wrapping in a Proxy defers real initialization until a property is
 * actually accessed (e.g. adminDb.doc(...)), so any failure surfaces inside
 * the calling route's own try/catch instead of at import time.
 */
export const adminAuth: Auth = new Proxy({} as Auth, {
  get(_target, prop, _receiver) {
    const real = getAdminAuth() as any;
    const value = real[prop];
    return typeof value === 'function' ? value.bind(real) : value;
  },
});

export const adminDb: Firestore = new Proxy({} as Firestore, {
  get(_target, prop, _receiver) {
    const real = getAdminDb() as any;
    const value = real[prop];
    return typeof value === 'function' ? value.bind(real) : value;
  },
});

/**
 * Custom Claims Management
 * Use custom claims for admin authorization instead of trusting user document's role field
 */

/**
 * Set admin custom claim for a user
 * Call this from a secure admin endpoint or Cloud Function
 */
export async function setAdminClaim(uid: string, isAdmin: boolean): Promise<void> {
  const auth = getAdminAuth();
  await auth.setCustomUserClaims(uid, { admin: isAdmin });
}

/**
 * Check if a user has admin claim (from decoded ID token)
 * This is the secure way to check admin status
 */
export function hasAdminClaim(decodedToken: { admin?: boolean } | null | undefined): boolean {
  return decodedToken?.admin === true;
}

/**
 * Get user by email (for admin management)
 */
export async function getUserByEmail(email: string) {
  const auth = getAdminAuth();
  return auth.getUserByEmail(email);
}

/**
 * Delete user (for GDPR Art. 17 compliance)
 */
export async function deleteUser(uid: string): Promise<void> {
  const auth = getAdminAuth();
  await auth.deleteUser(uid);
}

/**
 * Revoke all refresh tokens for a user (force re-login)
 */
export async function revokeRefreshTokens(uid: string): Promise<void> {
  const auth = getAdminAuth();
  await auth.revokeRefreshTokens(uid);
}

/**
 * Create custom token for server-side session management
 */
export async function createCustomToken(uid: string, additionalClaims?: Record<string, unknown>): Promise<string> {
  const auth = getAdminAuth();
  return auth.createCustomToken(uid, additionalClaims);
}

/**
 * Verify ID token and return decoded claims
 */
export async function verifyIdToken(idToken: string) {
  const auth = getAdminAuth();
  return auth.verifyIdToken(idToken);
}

/**
 * List all users (for admin panel)
 */
export async function listUsers(maxResults = 1000, pageToken?: string) {
  const auth = getAdminAuth();
  return auth.listUsers(maxResults, pageToken);
}