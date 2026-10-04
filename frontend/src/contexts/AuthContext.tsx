import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { User } from '@/types';
import { firebaseAuth, firebaseAuthActions, firebaseConfigured } from '@/services/firebase';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isConfigured: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firebaseAuth) {
      setLoading(false);
      return;
    }

    return firebaseAuth.onAuthStateChanged((firebaseUser) => {
      setUser(firebaseUser ? {
        id: firebaseUser.uid,
        email: firebaseUser.email ?? '',
        displayName: firebaseUser.displayName ?? undefined,
        photoURL: firebaseUser.photoURL ?? undefined
      } : null);
      setLoading(false);
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isConfigured: firebaseConfigured,
      isAuthenticated: Boolean(user),
      signIn: async (email, password) => {
        if (!firebaseAuth) throw new Error('Firebase authentication is not configured.');
        await firebaseAuthActions.signIn(firebaseAuth, email, password);
      },
      signUp: async (email, password, displayName) => {
        if (!firebaseAuth) throw new Error('Firebase authentication is not configured.');
        const credential = await firebaseAuthActions.signUp(firebaseAuth, email, password);
        await firebaseAuthActions.updateProfile(credential.user, { displayName });
        await firebaseAuthActions.sendEmailVerification(credential.user);
      },
      resetPassword: async (email) => {
        if (!firebaseAuth) throw new Error('Firebase authentication is not configured.');
        await firebaseAuthActions.sendPasswordResetEmail(firebaseAuth, email);
      },
      signOut: async () => {
        if (!firebaseAuth) return;
        await firebaseAuthActions.signOut(firebaseAuth);
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
