import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  getAuth,
  GoogleAuthProvider,
  sendEmailVerification,
  sendPasswordResetEmail,
  setPersistence,
  signInAnonymously,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

function cleanEnv(val?: string | null): string {
  if (!val || typeof val !== 'string') return '';
  return val.trim().replace(/^["']|["']$/g, '');
}

function isValidConfigValue(val?: string | null): boolean {
  const cleaned = cleanEnv(val);
  if (!cleaned || cleaned.length === 0) return false;
  if (
    /^YOUR_/i.test(cleaned) ||
    /^YOUR-/i.test(cleaned) ||
    /YOUR_PROJECT/i.test(cleaned) ||
    cleaned === 'G-XXXXXXXXXX'
  ) {
    return false;
  }
  return true;
}

const firebaseConfig = {
  apiKey: cleanEnv(import.meta.env.VITE_FIREBASE_API_KEY),
  authDomain: cleanEnv(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN),
  projectId: cleanEnv(import.meta.env.VITE_FIREBASE_PROJECT_ID),
  storageBucket: cleanEnv(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET),
  messagingSenderId: cleanEnv(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID),
  appId: cleanEnv(import.meta.env.VITE_FIREBASE_APP_ID)
};

export const firebaseConfigured = Boolean(
  isValidConfigValue(firebaseConfig.apiKey) &&
    isValidConfigValue(firebaseConfig.projectId) &&
    isValidConfigValue(firebaseConfig.appId)
);

export const firebaseApp = firebaseConfigured
  ? getApps().length > 0
    ? getApp()
    : initializeApp(firebaseConfig)
  : null;

export const firebaseAuth = firebaseApp ? getAuth(firebaseApp) : null;
export const db = firebaseApp ? getFirestore(firebaseApp) : null;
export const storage = firebaseApp ? getStorage(firebaseApp) : null;

// Ensure persistent session across browser sessions/reloads
if (firebaseAuth) {
  setPersistence(firebaseAuth, browserLocalPersistence).catch((err) => {
    console.warn('[Firebase Auth] Persistence set warning:', err);
  });
}

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const firebaseAuthActions = {
  signIn: signInWithEmailAndPassword,
  signUp: createUserWithEmailAndPassword,
  signInAnonymously: () => {
    if (!firebaseAuth) throw new Error('Firebase authentication is not configured.');
    return signInAnonymously(firebaseAuth);
  },
  signInWithGoogle: () => {
    if (!firebaseAuth) throw new Error('Firebase authentication is not configured.');
    return signInWithPopup(firebaseAuth, googleProvider);
  },
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut,
  updateProfile,
  reloadUser: () => {
    if (!firebaseAuth?.currentUser) return Promise.resolve();
    return firebaseAuth.currentUser.reload();
  }
};

export function getAuthErrorMessage(error: unknown): string {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String(error.code)
      : '';

  switch (code) {
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
      return 'The email or password you entered is incorrect. Please try again.';
    case 'auth/user-not-found':
      return 'No account was found for this email address. Please sign up first.';
    case 'auth/email-already-in-use':
      return 'An account already exists with this email address. Please sign in instead.';
    case 'auth/weak-password':
      return 'Your password is too weak. Please use at least 6 characters.';
    case 'auth/user-disabled':
      return 'This user account has been disabled. Please contact support.';
    case 'auth/too-many-requests':
      return 'Access to this account has been temporarily disabled due to too many failed attempts. Please reset your password or try again later.';
    case 'auth/popup-closed-by-user':
      return 'Google sign-in popup was closed before completing authentication.';
    case 'auth/cancelled-popup-request':
      return 'Google sign-in attempt was superseded by a newer action.';
    case 'auth/popup-blocked':
      return 'The Google sign-in popup was blocked by your browser. Please allow popups for this site.';
    case 'auth/account-exists-with-different-credential':
      return 'An account already exists with this email address under a different sign-in provider.';
    case 'auth/requires-recent-login':
      return 'This action requires recent authentication. Please sign out and sign in again.';
    case 'auth/network-request-failed':
      return 'Network connection error. Please verify your internet connection and try again.';
    case 'auth/operation-not-allowed':
      return 'This sign-in method is not enabled in your Firebase Console. Please verify Authentication settings.';
    case 'auth/api-key-not-valid':
    case 'auth/invalid-api-key':
      return 'The Firebase API key is invalid or not authorized. Please verify the Web API Key in Firebase Console > Project Settings.';
    case 'auth/unauthorized-domain':
      return 'This domain is not registered in Firebase Authentication Authorized domains. Please add this domain in Firebase Console > Authentication > Settings > Authorized domains.';
    case 'auth/missing-password':
      return 'Please enter your password.';
    default:
      if (
        typeof error === 'object' &&
        error !== null &&
        'message' in error &&
        typeof (error as Record<string, unknown>).message === 'string'
      ) {
        const msg = String((error as Record<string, unknown>).message);
        if (msg.toLowerCase().includes('api-key-not-valid') || msg.toLowerCase().includes('invalid-api-key')) {
          return 'The Firebase API key is invalid or not authorized. Please check your VITE_FIREBASE_API_KEY in Project Settings.';
        }
        if (msg.toLowerCase().includes('unauthorized-domain')) {
          return 'This domain is not authorized. Please add this hostname to Firebase Console > Authentication > Settings > Authorized domains.';
        }
      }
      if (error instanceof Error && error.message) {
        return error.message;
      }
      return 'Authentication could not be completed. Please try again.';
  }
}
