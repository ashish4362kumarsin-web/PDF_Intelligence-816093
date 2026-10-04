import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getAuthErrorMessage } from '@/services/firebase';

export default function LoginPage() {
  const { isConfigured, signIn, resetPassword } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');
    setBusy(true);
    try {
      await signIn(email, password);
      navigate('/dashboard', { replace: true });
    } catch (authError) {
      setError(getAuthErrorMessage(authError));
    } finally {
      setBusy(false);
    }
  }

  async function handlePasswordReset() {
    setError('');
    setMessage('');
    if (!email.trim()) {
      setError('Enter your email address first to receive a password reset link.');
      return;
    }

    setBusy(true);
    try {
      await resetPassword(email);
      setMessage('If an account exists for this email, a password reset link has been sent.');
    } catch (authError) {
      setError(getAuthErrorMessage(authError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4 dark:bg-[#0b1020]">
      <div className="card w-full max-w-md p-6">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-lg font-bold text-white">PI</div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Welcome back</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Sign in to continue to PDF Intelligence</p>
        </div>

        {!isConfigured && (
          <p className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200" role="status">
            Firebase sign-in is unavailable. Configure the VITE_FIREBASE_* values in frontend/.env.local.
          </p>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="login-email" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Email</label>
            <input id="login-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" placeholder="you@example.com" />
          </div>
          <div>
            <label htmlFor="login-password" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Password</label>
            <input id="login-password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" placeholder="••••••••" />
          </div>
          {error && <p className="text-sm text-red-600 dark:text-red-400" role="alert">{error}</p>}
          {message && <p className="text-sm text-emerald-700 dark:text-emerald-400" role="status">{message}</p>}
          <button type="submit" disabled={!isConfigured || busy} className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60">
            {busy ? 'Please wait...' : 'Sign in'}
          </button>
        </form>

        <button type="button" onClick={handlePasswordReset} disabled={!isConfigured || busy} className="mt-3 w-full text-center text-sm font-medium text-blue-600 disabled:cursor-not-allowed disabled:opacity-60 dark:text-blue-300">
          Forgot password?
        </button>

        <p className="mt-5 text-center text-sm text-slate-500 dark:text-slate-400">
          New here?{' '}
          <Link to="/signup" className="font-medium text-blue-600 dark:text-blue-300">Create an account</Link>
        </p>
      </div>
    </div>
  );
}
