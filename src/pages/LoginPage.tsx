import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  LoaderCircle,
  Sparkles,
  UserCheck
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getAuthErrorMessage } from '@/services/firebase';

export default function LoginPage() {
  const { user, loading, isConfigured, signIn, signInWithGoogle, continueAsGuest, resetPassword } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [guestBusy, setGuestBusy] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetBusy, setResetBusy] = useState(false);

  // Check for redirect message (e.g. Guest attempted upload)
  useEffect(() => {
    if (location.state?.message) {
      setError(location.state.message);
    }
  }, [location.state]);

  // If already authenticated and not guest, redirect straight to dashboard
  useEffect(() => {
    if (!loading && user && !user.isGuest) {
      const returnTo = location.state?.returnTo || '/dashboard';
      navigate(returnTo, { replace: true, state: location.state });
    }
  }, [user, loading, navigate, location.state]);

  if (loading) {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-slate-100 p-4 dark:bg-[#070c18]"
        role="status"
      >
        <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
          <LoaderCircle className="h-5 w-5 animate-spin text-blue-600" />
          <span>Verifying authentication session...</span>
        </div>
      </div>
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');

    if (!email.trim() || !email.includes('@')) {
      setError('Please provide a valid email address.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setBusy(true);

    try {
      await signIn(email.trim(), password);
      const returnTo = location.state?.returnTo || '/dashboard';
      navigate(returnTo, { replace: true, state: location.state });
    } catch (authError) {
      setError(getAuthErrorMessage(authError));
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogleSignIn() {
    setError('');
    setMessage('');
    setGoogleBusy(true);

    try {
      await signInWithGoogle();
      const returnTo = location.state?.returnTo || '/dashboard';
      navigate(returnTo, { replace: true, state: location.state });
    } catch (authError) {
      setError(getAuthErrorMessage(authError));
    } finally {
      setGoogleBusy(false);
    }
  }

  async function handleContinueAsGuest() {
    setError('');
    setMessage('');
    setGuestBusy(true);

    try {
      await continueAsGuest();
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError('Could not initialize guest session. Please try again.');
    } finally {
      setGuestBusy(false);
    }
  }

  async function handlePasswordResetSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');

    if (!resetEmail.trim()) {
      setError('Please enter your email address to receive password reset instructions.');
      return;
    }

    setResetBusy(true);
    try {
      await resetPassword(resetEmail.trim());
      setMessage('Password reset email sent. Please check your inbox.');
      setShowResetModal(false);
    } catch (authError) {
      setError(getAuthErrorMessage(authError));
    } finally {
      setResetBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100/90 p-4 transition-colors dark:bg-[#070c18]">
      {/* Polished, recessed authentication card */}
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xl shadow-slate-900/5 ring-1 ring-black/[0.03] transition-all dark:border-slate-800/80 dark:bg-[#0c1324] dark:shadow-2xl dark:shadow-black/40 dark:ring-white/[0.04] sm:p-8">
        
        {/* Subtle inner top glow accent */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-600" />

        {/* Brand header */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-lg font-bold text-white shadow-md shadow-blue-500/25">
            PI
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Welcome back
          </h1>
          <p className="mt-1.5 flex items-center justify-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <Sparkles className="h-3.5 w-3.5 text-blue-500" />
            PDF Intelligence Workspace
          </p>
        </div>

        {/* Configuration Notice */}
        {!isConfigured && (
          <div
            className="mb-5 flex items-start gap-2.5 rounded-2xl border border-amber-300/80 bg-amber-50/80 p-3.5 text-xs text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-200"
            role="status"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <div>
              <p className="font-semibold">Firebase Authentication Setup</p>
              <p className="mt-0.5 text-amber-800/90 dark:text-amber-300/90">
                Set <code className="font-mono">VITE_FIREBASE_*</code> in environment to activate account sync.
              </p>
            </div>
          </div>
        )}

        {/* Error notification */}
        {error && (
          <div
            role="alert"
            className="mb-4 flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50/90 p-3.5 text-xs font-medium text-red-800 dark:border-red-900/60 dark:bg-red-950/35 dark:text-red-200"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
            <span className="flex-1 leading-relaxed">{error}</span>
          </div>
        )}

        {/* Success message */}
        {message && (
          <div
            role="status"
            className="mb-4 flex items-start gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50/90 p-3.5 text-xs font-medium text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/35 dark:text-emerald-200"
          >
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span className="flex-1 leading-relaxed">{message}</span>
          </div>
        )}

        {/* Google Sign-In */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={busy || googleBusy || !isConfigured}
          className="flex min-h-11 w-full items-center justify-center gap-3 rounded-xl border border-slate-200/90 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50/80 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          {googleBusy ? (
            <LoaderCircle className="h-4 w-4 animate-spin text-blue-600" />
          ) : (
            <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
          )}
          <span>{googleBusy ? 'Connecting with Google...' : 'Continue with Google'}</span>
        </button>

        {/* Single centered horizontal line: ──────── OR SIGN IN WITH EMAIL ──────── */}
        <div className="relative my-6 flex items-center justify-center">
          <div className="w-full border-t border-slate-200 dark:border-slate-800" />
          <span className="absolute bg-white px-3 text-[11px] font-semibold tracking-wider text-slate-400 dark:bg-[#0c1324] whitespace-nowrap">
            OR SIGN IN WITH EMAIL
          </span>
        </div>

        {/* Email & Password Form */}
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label
              htmlFor="login-email"
              className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300"
            >
              Email address
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy || googleBusy || guestBusy}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              placeholder="name@example.com"
            />
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label
                htmlFor="login-password"
                className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300"
              >
                Password
              </label>
              <button
                type="button"
                onClick={() => {
                  setResetEmail(email);
                  setShowResetModal(true);
                }}
                className="text-xs font-medium text-blue-600 transition hover:underline dark:text-blue-400"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={busy || googleBusy || guestBusy}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={busy || googleBusy || guestBusy || !isConfigured}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-600/25 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy && <LoaderCircle className="h-4 w-4 animate-spin" />}
            <span>{busy ? 'Signing in...' : 'Sign in'}</span>
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-slate-500 dark:text-slate-400">
          New here?{' '}
          <Link to="/signup" className="font-semibold text-blue-600 hover:underline dark:text-blue-400">
            Create an account
          </Link>
        </p>

        {/* Centered separator: ──────── OR ──────── */}
        <div className="relative my-5 flex items-center justify-center">
          <div className="w-full border-t border-slate-200 dark:border-slate-800" />
          <span className="absolute bg-white px-3 text-[10px] font-semibold tracking-wider text-slate-400 dark:bg-[#0c1324] whitespace-nowrap">
            OR
          </span>
        </div>

        {/* Continue as Guest Button */}
        <div>
          <button
            type="button"
            onClick={handleContinueAsGuest}
            disabled={busy || googleBusy || guestBusy}
            className="flex min-h-11 w-full items-center justify-center gap-2.5 rounded-xl border border-slate-200/90 bg-slate-50/80 px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            {guestBusy ? (
              <LoaderCircle className="h-4 w-4 animate-spin text-slate-500" />
            ) : (
              <UserCheck className="h-4 w-4 text-slate-500 dark:text-slate-400" />
            )}
            <span>Continue as Guest</span>
          </button>
          <p className="mt-2 text-center text-[11px] text-slate-400 dark:text-slate-500">
            Explore the workspace • Sign in required to upload & save documents
          </p>
        </div>

        {/* Forgot Password Modal */}
        {showResetModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-modal-title"
          >
            <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
              <h2 id="reset-modal-title" className="text-base font-bold text-slate-900 dark:text-white">
                Reset your password
              </h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Enter your registered email address and we'll send you a password reset link.
              </p>

              <form onSubmit={handlePasswordResetSubmit} className="mt-4 space-y-3">
                <input
                  type="email"
                  required
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowResetModal(false)}
                    className="rounded-lg px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={resetBusy}
                    className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-60"
                  >
                    {resetBusy && <LoaderCircle className="h-3 w-3 animate-spin" />}
                    <span>{resetBusy ? 'Sending...' : 'Send link'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
