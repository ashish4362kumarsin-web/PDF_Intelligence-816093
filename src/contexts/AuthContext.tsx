import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { User } from '@/types';
import {
  firebaseAuth,
  firebaseAuthActions,
  firebaseConfigured
} from '@/services/firebase';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isConfigured: boolean;
  isAuthenticated: boolean;
  isGuest: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  continueAsGuest: () => Promise<void>;
  exitGuestMode: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  reloadUser: () => Promise<void>;
  updateUserProfile: (data: { displayName?: string; photoURL?: string }) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const GUEST_STORAGE_KEY = 'pdf_intel_guest_session';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if there was an active guest session in sessionStorage
    const checkGuestFallback = () => {
      try {
        const stored = sessionStorage.getItem(GUEST_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && parsed.isGuest) {
            setUser(parsed);
            setLoading(false);
            return true;
          }
        }
      } catch {
        // ignore
      }
      return false;
    };

    // If Firebase Auth is not initialized due to missing configuration
    if (!firebaseAuth) {
      if (!checkGuestFallback()) {
        setUser(null);
      }
      setLoading(false);
      return;
    }

    // Subscribe to real Firebase authentication state as single source of truth
    const unsubscribe = firebaseAuth.onAuthStateChanged((firebaseUser) => {
      if (firebaseUser) {
        // If it's a real Firebase Anonymous user
        const isAnon = Boolean(firebaseUser.isAnonymous);
        setUser({
          id: firebaseUser.uid,
          uid: firebaseUser.uid,
          email: firebaseUser.email ?? (isAnon ? 'guest@pdfintelligence.local' : ''),
          displayName: firebaseUser.displayName ?? (isAnon ? 'Guest User' : undefined),
          photoURL: firebaseUser.photoURL ?? undefined,
          emailVerified: Boolean(firebaseUser.emailVerified),
          creationTime: firebaseUser.metadata?.creationTime,
          lastSignInTime: firebaseUser.metadata?.lastSignInTime,
          phoneNumber: firebaseUser.phoneNumber ?? undefined,
          isGuest: isAnon,
          isAnonymous: isAnon
        });
        sessionStorage.removeItem(GUEST_STORAGE_KEY);
      } else {
        // Check if there is an explicit guest fallback session active
        if (!checkGuestFallback()) {
          setUser(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const isGuest = Boolean(user?.isGuest || user?.isAnonymous);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isConfigured: firebaseConfigured,
      isAuthenticated: Boolean(user && !user.isGuest),
      isGuest,
      signIn: async (email, password) => {
        sessionStorage.removeItem(GUEST_STORAGE_KEY);
        if (!firebaseAuth) {
          throw new Error('Firebase Authentication is not configured. Please check project settings.');
        }
        await firebaseAuthActions.signIn(firebaseAuth, email, password);
      },
      signInWithGoogle: async () => {
        sessionStorage.removeItem(GUEST_STORAGE_KEY);
        if (!firebaseAuth) {
          throw new Error('Google Sign-In requires Firebase Authentication to be configured.');
        }
        const credential = await firebaseAuthActions.signInWithGoogle();
        if (credential.user) {
          setUser({
            id: credential.user.uid,
            uid: credential.user.uid,
            email: credential.user.email ?? '',
            displayName: credential.user.displayName ?? undefined,
            photoURL: credential.user.photoURL ?? undefined,
            emailVerified: Boolean(credential.user.emailVerified),
            creationTime: credential.user.metadata?.creationTime,
            lastSignInTime: credential.user.metadata?.lastSignInTime,
            phoneNumber: credential.user.phoneNumber ?? undefined,
            isGuest: false,
            isAnonymous: false
          });
        }
      },
      signUp: async (email, password, displayName) => {
        sessionStorage.removeItem(GUEST_STORAGE_KEY);
        if (!firebaseAuth) {
          throw new Error('Firebase Authentication is not configured. Please check project settings.');
        }
        const credential = await firebaseAuthActions.signUp(firebaseAuth, email, password);
        if (displayName) {
          await firebaseAuthActions.updateProfile(credential.user, { displayName });
        }
        await firebaseAuthActions.sendEmailVerification(credential.user).catch((err) => {
          console.warn('Could not send verification email immediately:', err);
        });
        setUser({
          id: credential.user.uid,
          uid: credential.user.uid,
          email: credential.user.email ?? '',
          displayName: displayName || credential.user.displayName || undefined,
          photoURL: credential.user.photoURL ?? undefined,
          emailVerified: Boolean(credential.user.emailVerified),
          creationTime: credential.user.metadata?.creationTime,
          lastSignInTime: credential.user.metadata?.lastSignInTime,
          phoneNumber: credential.user.phoneNumber ?? undefined,
          isGuest: false,
          isAnonymous: false
        });
      },
      continueAsGuest: async () => {
        // Try Firebase Anonymous Authentication first if available
        if (firebaseAuth) {
          try {
            await firebaseAuthActions.signInAnonymously();
            return;
          } catch (anonErr) {
            console.warn(
              '[Auth] Firebase Anonymous Authentication was not enabled or permitted, falling back to secure isolated guest session:',
              (anonErr as Error).message
            );
          }
        }

        // Secure isolated client-side guest session
        const guestId = 'guest_' + Math.random().toString(36).substring(2, 11);
        const guestUser: User = {
          id: guestId,
          uid: guestId,
          email: 'guest@pdfintelligence.local',
          displayName: 'Guest User',
          isGuest: true,
          isAnonymous: true,
          emailVerified: false,
          creationTime: new Date().toISOString()
        };
        try {
          sessionStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(guestUser));
        } catch {
          // ignore
        }
        setUser(guestUser);
      },
      exitGuestMode: async () => {
        sessionStorage.removeItem(GUEST_STORAGE_KEY);
        setUser(null);
        if (firebaseAuth?.currentUser?.isAnonymous) {
          await firebaseAuthActions.signOut(firebaseAuth).catch(() => {});
        }
      },
      resetPassword: async (email) => {
        if (!firebaseAuth) {
          throw new Error('Firebase Authentication is not configured.');
        }
        await firebaseAuthActions.sendPasswordResetEmail(firebaseAuth, email);
      },
      sendVerificationEmail: async () => {
        if (!firebaseAuth?.currentUser) {
          throw new Error('No active user to send verification email to.');
        }
        await firebaseAuthActions.sendEmailVerification(firebaseAuth.currentUser);
      },
      reloadUser: async () => {
        if (firebaseAuth?.currentUser) {
          await firebaseAuth.currentUser.reload();
          const refreshed = firebaseAuth.currentUser;
          if (refreshed) {
            setUser({
              id: refreshed.uid,
              uid: refreshed.uid,
              email: refreshed.email ?? '',
              displayName: refreshed.displayName ?? undefined,
              photoURL: refreshed.photoURL ?? undefined,
              emailVerified: Boolean(refreshed.emailVerified),
              creationTime: refreshed.metadata?.creationTime,
              lastSignInTime: refreshed.metadata?.lastSignInTime,
              phoneNumber: refreshed.phoneNumber ?? undefined
            });
          }
        }
      },
      updateUserProfile: async (data: { displayName?: string; photoURL?: string }) => {
        if (!firebaseAuth?.currentUser) {
          throw new Error('No authenticated user session found.');
        }
        await firebaseAuthActions.updateProfile(firebaseAuth.currentUser, data);
        setUser((prev) =>
          prev
            ? {
                ...prev,
                displayName: data.displayName !== undefined ? data.displayName : prev.displayName,
                photoURL: data.photoURL !== undefined ? data.photoURL : prev.photoURL
              }
            : null
        );
      },
      signOut: async () => {
        sessionStorage.removeItem(GUEST_STORAGE_KEY);
        setUser(null);
        if (firebaseAuth) {
          await firebaseAuthActions.signOut(firebaseAuth);
        }
      }
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}
