import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { ThemeMode } from '@/types';
import { api } from '@/services/api';
import { useAuth } from './AuthContext';

interface ThemeContextValue {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  syncError: string;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [mode, setMode] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('pdf-intelligence-theme') as ThemeMode | null;
    if (saved) return saved;
    return 'system';
  });
  const [syncError, setSyncError] = useState('');

  useEffect(() => {
    if (authLoading || !user) return;
    let active = true;
    api.getSettings().then(({ data }) => {
      if (!active) return;
      if (data.theme === 'light' || data.theme === 'dark' || data.theme === 'system') {
        setMode(data.theme);
      }
    }).catch(() => {
      if (active) setSyncError('Theme is saved on this device, but account settings are unavailable.');
    });
    return () => { active = false; };
  }, [authLoading, user?.id]);

  useEffect(() => {
    localStorage.setItem('pdf-intelligence-theme', mode);

    const root = document.documentElement;
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
    const applyTheme = () => {
      const isDark = mode === 'dark' || (mode === 'system' && systemTheme.matches);
      root.classList.toggle('dark', isDark);
    };

    applyTheme();
    if (mode === 'system') systemTheme.addEventListener('change', applyTheme);
    return () => systemTheme.removeEventListener('change', applyTheme);
  }, [mode]);

  function updateMode(nextMode: ThemeMode) {
    setMode(nextMode);
    setSyncError('');
    if (user) {
      void api.updateSettings({ theme: nextMode }).catch(() => {
        setSyncError('Theme is active on this device, but could not be saved to your account.');
      });
    }
  }

  const value = useMemo(() => ({ mode, setMode: updateMode, syncError }), [mode, syncError, user?.id]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used inside ThemeProvider');
  }

  return context;
}
