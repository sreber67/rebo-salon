import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, GoogleAuthProvider, FacebookAuthProvider, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, Firestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAnalytics, isSupported, Analytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Local test mode (npm run dev:local): talk to the Firebase emulators on this machine, never the live project
export const USE_EMULATOR = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true';

// Singleton pattern for Firebase client app
let firebaseApp: FirebaseApp | null = null;
let firebaseAuth: Auth | null = null;
let firebaseDb: Firestore | null = null;
let firebaseAnalytics: Analytics | null = null;

/**
 * Get or initialize Firebase client app
 */
function getFirebaseApp(): FirebaseApp {
  if (firebaseApp) return firebaseApp;

  if (getApps().length === 0) {
    firebaseApp = initializeApp(firebaseConfig);
  } else {
    firebaseApp = getApp();
  }

  return firebaseApp;
}

/**
 * Get Firebase Auth instance
 */
export function getAuthInstance(): Auth {
  if (!firebaseAuth) {
    firebaseAuth = getAuth(getFirebaseApp());
    // Set language for auth emails
    firebaseAuth.languageCode = 'de';
    if (USE_EMULATOR) connectAuthEmulator(firebaseAuth, 'http://127.0.0.1:9099', { disableWarnings: true });
  }
  return firebaseAuth;
}

/**
 * Get Firestore instance
 */
export function getDbInstance(): Firestore {
  if (!firebaseDb) {
    firebaseDb = getFirestore(getFirebaseApp());
    if (USE_EMULATOR) connectFirestoreEmulator(firebaseDb, '127.0.0.1', 8080);
  }
  return firebaseDb;
}

/**
 * Get Analytics instance (client-side only, with consent)
 */
export async function getAnalyticsInstance(): Promise<Analytics | null> {
  if (typeof window === 'undefined') return null;

  if (firebaseAnalytics) return firebaseAnalytics;

  try {
    const supported = await isSupported();
    if (supported) {
      firebaseAnalytics = getAnalytics(getFirebaseApp());
      return firebaseAnalytics;
    }
  } catch (error) {
    console.warn('Analytics not supported:', error);
  }
  return null;
}

/**
 * Get Google Auth Provider (created on demand)
 */
export function getGoogleProvider(): GoogleAuthProvider {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({
    prompt: 'select_account',
  });
  return provider;
}

/**
 * Get Facebook Auth Provider (created on demand)
 */
export function getFacebookProvider(): FacebookAuthProvider {
  const provider = new FacebookAuthProvider();
  provider.setCustomParameters({
    display: 'popup',
  });
  return provider;
}

/**
 * Firebase region for GDPR compliance
 * Ensure your Firebase project is created in europe-west1 or europe-west3
 */
export const FIREBASE_REGION = process.env.FIREBASE_REGION || 'europe-west1';

// Export singleton instances for backward compatibility
export const app = getFirebaseApp();
export const auth = getAuthInstance();
export const db = getDbInstance();

// Analytics is async, export getter
export { getAnalyticsInstance as analytics };