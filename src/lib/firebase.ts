import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, GoogleAuthProvider, FacebookAuthProvider } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Singleton pattern for Firebase client app
let firebaseApp: FirebaseApp | null = null;
let firebaseAuth: Auth | null = null;
let firebaseDb: Firestore | null = null;

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
  }
  return firebaseAuth;
}

/**
 * Get Firestore instance
 */
export function getDbInstance(): Firestore {
  if (!firebaseDb) {
    firebaseDb = getFirestore(getFirebaseApp());
  }
  return firebaseDb;
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

// Export singleton instances for backward compatibility
export const app = getFirebaseApp();
export const auth = getAuthInstance();
export const db = getDbInstance();
