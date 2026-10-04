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
  isDemoAllowed: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  reloadUser: () => Promise<void>;
  signOut: () => Promise<void>;
  enterDemoMode: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Demo allowed only in development/preview when Firebase is not configured, or explicitly enabled
  const isDemoAllowed = Boolean(
    !firebaseConfigured &&
      (import.meta.env.VITE_ALLOW_DEMO_AUTH === 'true' || import.meta.env.DEV)
  );

  useEffect(() => {
    if (!firebaseAuth) {
      // Check if previously stored demo user session exists
      if (isDemoAllowed) {
        const savedDemo = localStorage.getItem('pdf_intelligence_demo_user');
        if (savedDemo) {
          try {
            setUser(JSON.parse(savedDemo));
          } catch {
            setUser(null);
          }
        }
      } else {
        localStorage.removeItem('pdf_intelligence_demo_user');
        setUser(null);
      }
      setLoading(false);
      return;
    }

    // Subscribe to real Firebase authentication state
    const unsubscribe = firebaseAuth.onAuthStateChanged((firebaseUser) => {
      if (firebaseUser) {
        setUser({
          id: firebaseUser.uid,
          email: firebaseUser.email ?? '',
          displayName: firebaseUser.displayName ?? undefined,
          photoURL: firebaseUser.photoURL ?? undefined,
          emailVerified: firebaseUser.emailVerified
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isDemoAllowed]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isConfigured: firebaseConfigured,
      isAuthenticated: Boolean(user),
      isDemoAllowed,
      signIn: async (email, password) => {
        if (!firebaseAuth) {
          if (!isDemoAllowed) {
            throw new Error('Firebase authentication is not configured in this environment.');
          }
          const demoUser: User = {
            id: 'demo-user',
            email: email || 'demo@pdfintelligence.local',
            displayName: email ? email.split('@')[0] : 'Demo User',
            emailVerified: true
          };
          localStorage.setItem('pdf_intelligence_demo_user', JSON.stringify(demoUser));
          setUser(demoUser);
          return;
        }
        await firebaseAuthActions.signIn(firebaseAuth, email, password);
      },
      signInWithGoogle: async () => {
        if (!firebaseAuth) {
          if (!isDemoAllowed) {
            throw new Error('Google Sign-In requires Firebase to be configured.');
          }
          const demoGoogleUser: User = {
            id: 'demo-google-user',
            email: 'google.demo@pdfintelligence.local',
            displayName: 'Google Demo User',
            photoURL: undefined,
            emailVerified: true
          };
          localStorage.setItem('pdf_intelligence_demo_user', JSON.stringify(demoGoogleUser));
          setUser(demoGoogleUser);
          return;
        }
        const credential = await firebaseAuthActions.signInWithGoogle();
        if (credential.user) {
          setUser({
            id: credential.user.uid,
            email: credential.user.email ?? '',
            displayName: credential.user.displayName ?? undefined,
            photoURL: credential.user.photoURL ?? undefined,
            emailVerified: credential.user.emailVerified
          });
        }
      },
      signUp: async (email, password, displayName) => {
        if (!firebaseAuth) {
          if (!isDemoAllowed) {
            throw new Error('Firebase authentication is not configured in this environment.');
          }
          const demoUser: User = {
            id: 'demo-user',
            email: email || 'demo@pdfintelligence.local',
            displayName: displayName || (email ? email.split('@')[0] : 'Demo User'),
            emailVerified: false
          };
          localStorage.setItem('pdf_intelligence_demo_user', JSON.stringify(demoUser));
          setUser(demoUser);
          return;
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
          email: credential.user.email ?? '',
          displayName: displayName || credential.user.displayName || undefined,
          photoURL: credential.user.photoURL ?? undefined,
          emailVerified: credential.user.emailVerified
        });
      },
      resetPassword: async (email) => {
        if (!firebaseAuth) {
          if (!isDemoAllowed) {
            throw new Error('Firebase authentication is not configured in this environment.');
          }
          return;
        }
        await firebaseAuthActions.sendPasswordResetEmail(firebaseAuth, email);
      },
      sendVerificationEmail: async () => {
        if (!firebaseAuth?.currentUser) {
          if (isDemoAllowed && user) {
            setUser({ ...user, emailVerified: true });
            return;
          }
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
              email: refreshed.email ?? '',
              displayName: refreshed.displayName ?? undefined,
              photoURL: refreshed.photoURL ?? undefined,
              emailVerified: refreshed.emailVerified
            });
          }
        }
      },
      signOut: async () => {
        localStorage.removeItem('pdf_intelligence_demo_user');
        setUser(null);
        if (!firebaseAuth) return;
        await firebaseAuthActions.signOut(firebaseAuth);
      },
      enterDemoMode: () => {
        if (!isDemoAllowed) {
          throw new Error('Demo mode is disabled in production.');
        }
        const demoUser: User = {
          id: 'demo-user',
          email: 'demo@pdfintelligence.local',
          displayName: 'Demo User',
          emailVerified: true
        };
        localStorage.setItem('pdf_intelligence_demo_user', JSON.stringify(demoUser));
        setUser(demoUser);
      }
    }),
    [user, loading, isDemoAllowed]
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
