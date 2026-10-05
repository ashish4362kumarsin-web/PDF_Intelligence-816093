import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, AlertCircle, RefreshCw, Send, ShieldCheck, ShieldAlert, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import type { ThemeMode } from '@/types';

export default function SettingsPage() {
  const { mode, setMode, syncError } = useTheme();
  const { user, signOut, isConfigured, sendVerificationEmail, reloadUser } = useAuth();
  const navigate = useNavigate();
  const [verificationSending, setVerificationSending] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const modes: Array<{ value: ThemeMode; label: string }> = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'system', label: 'System' }
  ];

  async function handleSignOut() {
    await signOut();
    navigate('/login', { replace: true });
  }

  async function handleSendVerification() {
    setVerificationSending(true);
    setVerificationMessage('');
    try {
      await sendVerificationEmail();
      setVerificationMessage('Verification email successfully sent! Check your inbox.');
    } catch (err) {
      setVerificationMessage(
        err instanceof Error ? err.message : 'Could not send verification email.'
      );
    } finally {
      setVerificationSending(false);
    }
  }

  async function handleRefreshStatus() {
    setRefreshing(true);
    try {
      await reloadUser();
    } catch (err) {
      console.warn('Failed to reload user:', err);
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="card p-5">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Settings</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Manage your account profile, authentication status, and appearance preferences.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Account & Profile Card */}
        <section className="card flex flex-col justify-between p-5">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Account</h2>
              {user?.emailVerified ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                  <AlertCircle className="h-3.5 w-3.5" />
                  Unverified
                </span>
              )}
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-medium uppercase tracking-wider text-slate-400">
                  Full Name
                </label>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                  {user?.displayName || 'Not provided'}
                </p>
              </div>

              <div>
                <label className="text-xs font-medium uppercase tracking-wider text-slate-400">
                  Email Address
                </label>
                <p className="break-all text-sm font-medium text-slate-800 dark:text-slate-200">
                  {user?.email || 'Unknown'}
                </p>
              </div>

              <div>
                <label className="text-xs font-medium uppercase tracking-wider text-slate-400">
                  User ID
                </label>
                <p className="font-mono text-xs text-slate-500 dark:text-slate-400">
                  {user?.id}
                </p>
              </div>

              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => navigate('/profile')}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
                >
                  Manage profile & avatar →
                </button>
              </div>

              {!user?.emailVerified && isConfigured && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3.5 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
                  <p className="font-medium">Verify your email address</p>
                  <p className="mt-1 text-amber-700 dark:text-amber-300">
                    A verified email confirms your account ownership and enables password recovery.
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={verificationSending}
                      onClick={handleSendVerification}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 font-medium text-white transition hover:bg-amber-500 disabled:opacity-60"
                    >
                      <Send className="h-3.5 w-3.5" />
                      {verificationSending ? 'Sending...' : 'Send Verification Email'}
                    </button>
                    <button
                      type="button"
                      disabled={refreshing}
                      onClick={handleRefreshStatus}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 py-1.5 font-medium text-amber-800 transition hover:bg-amber-50 disabled:opacity-60 dark:border-amber-800 dark:bg-slate-900 dark:text-amber-200 dark:hover:bg-slate-800"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                      Check Status
                    </button>
                  </div>
                  {verificationMessage && (
                    <p className="mt-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                      {verificationMessage}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 border-t border-slate-200 pt-4 dark:border-slate-800">
            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-red-200 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 dark:border-red-900/50 dark:text-red-300 dark:hover:bg-red-950/30"
            >
              <LogOut className="h-4 w-4" />
              Sign out of account
            </button>
          </div>
        </section>

        {/* System & Configuration Card */}
        <div className="space-y-6">
          <section className="card p-5">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Theme</h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Customize the look and feel of your interface.
            </p>
            <div
              className="mt-4 inline-flex max-w-full rounded-xl border border-slate-200 bg-slate-100 p-1 dark:border-slate-700 dark:bg-slate-950"
              role="group"
              aria-label="Color theme"
            >
              {modes.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  aria-pressed={mode === item.value}
                  onClick={() => setMode(item.value)}
                  className={`min-h-10 rounded-lg px-4 text-sm font-medium transition ${
                    mode === item.value
                      ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            {syncError && (
              <p className="mt-3 text-sm text-amber-700 dark:text-amber-300" role="status">
                {syncError}
              </p>
            )}
          </section>

          {/* Authentication & Cloud Service Status */}
          <section className="card p-5">
            <div className="flex items-center gap-2">
              {isConfigured ? (
                <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <ShieldAlert className="h-5 w-5 text-amber-500" />
              )}
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Firebase Integration
              </h2>
            </div>

            <div className="mt-3 space-y-2 text-xs">
              <div className="flex items-center justify-between border-b border-slate-100 py-1.5 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Firebase Client Auth</span>
                <span
                  className={`font-semibold ${
                    isConfigured
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-amber-600 dark:text-amber-400'
                  }`}
                >
                  {isConfigured ? 'Connected (Live)' : 'Local Demo Mode'}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 py-1.5 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Sign-in Methods</span>
                <span className="text-slate-700 dark:text-slate-300">
                  Email / Password, Google OAuth
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-slate-500 dark:text-slate-400">Project Config</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">
                  {import.meta.env.VITE_FIREBASE_PROJECT_ID || 'Local Workspace'}
                </span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
