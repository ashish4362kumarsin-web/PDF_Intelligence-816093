import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import type { ThemeMode } from '@/types';

export default function SettingsPage() {
  const { mode, setMode, syncError } = useTheme();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const modes: Array<{ value: ThemeMode; label: string }> = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'system', label: 'System' }
  ];

  async function handleSignOut() {
    await signOut();
    navigate('/login', { replace: true });
  }

  return (
    <div className="space-y-5">
      <div className="card p-5">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Settings</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Manage your account and appearance preferences.</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Theme</h2>
          <div className="mt-4 inline-flex max-w-full rounded-xl border border-slate-200 bg-slate-100 p-1 dark:border-slate-700 dark:bg-slate-950" role="group" aria-label="Color theme">
            {modes.map((item) => <button key={item.value} type="button" aria-pressed={mode === item.value} onClick={() => setMode(item.value)} className={`min-h-10 rounded-lg px-4 text-sm font-medium ${mode === item.value ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white' : 'text-slate-600 dark:text-slate-300'}`}>{item.label}</button>)}
          </div>
          {syncError && <p className="mt-3 text-sm text-amber-700 dark:text-amber-300" role="status">{syncError}</p>}
        </section>

        <section className="card p-5">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Account</h2>
          <p className="mt-2 break-all text-sm text-slate-600 dark:text-slate-300">{user?.displayName || user?.email}</p>
          <button type="button" onClick={() => void handleSignOut()} className="mt-4 min-h-11 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 dark:border-red-900/50 dark:text-red-300 dark:hover:bg-red-950/30">Sign out</button>
        </section>
      </div>
    </div>
  );
}
