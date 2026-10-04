import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getAuthErrorMessage } from '@/services/firebase';

export default function SignupPage() {
  const { isConfigured, signUp } = useAuth();
  const [displayName, setDisplayName] = useState('');
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
      await signUp(email, password, displayName.trim());
      setMessage('Account created. Check your email for a verification link.');
      setPassword('');
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
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Create account</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Start organizing and understanding your PDFs with AI.</p>
        </div>

        {!isConfigured && (
          <p className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200" role="status">
            Firebase sign-up is unavailable. Configure the VITE_FIREBASE_* values in frontend/.env.local.
          </p>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="signup-name" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Full name</label>
            <input id="signup-name" type="text" autoComplete="name" required value={displayName} onChange={(event) => setDisplayName(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" placeholder="Alex Morgan" />
          </div>
          <div>
            <label htmlFor="signup-email" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Email</label>
            <input id="signup-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" placeholder="you@example.com" />
          </div>
          <div>
            <label htmlFor="signup-password" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Password</label>
            <input id="signup-password" type="password" autoComplete="new-password" minLength={6} required value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" placeholder="Create a password" />
          </div>
          {error && <p className="text-sm text-red-600 dark:text-red-400" role="alert">{error}</p>}
          {message && <p className="text-sm text-emerald-700 dark:text-emerald-400" role="status">{message}</p>}
          <button type="submit" disabled={!isConfigured || busy} className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60">
            {busy ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-500 dark:text-slate-400">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-blue-600 dark:text-blue-300">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
