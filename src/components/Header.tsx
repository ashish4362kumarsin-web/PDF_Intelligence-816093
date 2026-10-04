import { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, LogOut, MoreVertical, Moon, Search, SunMedium, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { navItems } from './Sidebar';
import { useTheme } from '@/contexts/ThemeContext';

export default function Header() {
  const { mode, setMode } = useTheme();
  const { user, signOut, sendVerificationEmail, reloadUser, isConfigured } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [verificationSent, setVerificationSent] = useState(false);
  const [verificationBusy, setVerificationBusy] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const pageTitle = navItems.find((item) => item.to === location.pathname)?.label ?? 'Workspace';

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [menuOpen]);

  async function handleSignOut() {
    await signOut();
    navigate('/login', { replace: true });
  }

  function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    navigate(`/library${globalSearch.trim() ? `?search=${encodeURIComponent(globalSearch.trim())}` : ''}`);
  }

  return (
    <>
      {user && user.emailVerified === false && isConfigured && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200 sm:px-6">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>
              Your email address (<strong>{user.email}</strong>) is not yet verified.
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={checkingStatus}
              onClick={async () => {
                setCheckingStatus(true);
                try {
                  await reloadUser();
                } catch (err) {
                  console.warn('Failed to refresh user auth state:', err);
                } finally {
                  setCheckingStatus(false);
                }
              }}
              className="text-amber-800 underline hover:no-underline disabled:opacity-60 dark:text-amber-300"
            >
              {checkingStatus ? 'Checking...' : 'Refresh verification status'}
            </button>
            <span className="text-amber-400">•</span>
            <button
              type="button"
              disabled={verificationBusy || verificationSent}
              onClick={async () => {
                setVerificationBusy(true);
                try {
                  await sendVerificationEmail();
                  setVerificationSent(true);
                } catch (err) {
                  console.warn('Failed to resend verification email:', err);
                } finally {
                  setVerificationBusy(false);
                }
              }}
              className="font-semibold text-amber-800 underline hover:no-underline disabled:opacity-60 dark:text-amber-300"
            >
              {verificationSent
                ? 'Verification email sent!'
                : verificationBusy
                ? 'Sending...'
                : 'Resend verification email'}
            </button>
          </div>
        </div>
      )}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur dark:border-slate-700 dark:bg-[#0f172a]/90 sm:px-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-sm font-semibold text-white">PI</div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">PDF Intelligence</p>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">{pageTitle}</p>
          </div>
        </div>

        <form role="search" onSubmit={handleSearch} className="hidden items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 md:flex">
          <Search className="h-4 w-4" />
          <input aria-label="Search PDFs" value={globalSearch} onChange={(event) => setGlobalSearch(event.target.value)} placeholder="Search PDFs" className="w-40 bg-transparent text-slate-900 outline-none placeholder:text-slate-500 dark:text-slate-100" />
          <button type="submit" aria-label="Open PDF search" className="sr-only">Search</button>
        </form>

        <div className="relative flex shrink-0 items-center gap-2">
          <button
            type="button"
            aria-label={mode === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            className="rounded-lg border border-slate-200 bg-white p-2.5 text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            onClick={() => setMode(mode === 'dark' ? 'light' : 'dark')}
          >
            {mode === 'dark' ? <SunMedium className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          <button type="button" onClick={handleSignOut} aria-label="Sign out" className="hidden items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 lg:flex">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-100"><User className="h-4 w-4" /></span>
            <span className="max-w-40 truncate">{user?.displayName || user?.email}</span>
            <LogOut className="h-4 w-4" />
          </button>

          <button
            type="button"
            className="rounded-lg border border-slate-200 bg-white p-2.5 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800 lg:hidden"
            aria-label="Open navigation and account menu"
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation-menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <MoreVertical className="h-5 w-5" />
          </button>

          {menuOpen && (
            <div id="mobile-navigation-menu" className="absolute right-0 top-full z-30 mt-2 max-h-[calc(100dvh-5rem)] w-[min(22rem,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900 lg:hidden">
              <div className="mb-2 border-b border-slate-200 px-3 py-3 dark:border-slate-700">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Account</p>
                <p className="mt-1 truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{user?.displayName || user?.email}</p>
              </div>
              <nav aria-label="Mobile navigation" className="space-y-1">
                {navItems.map(({ to, label, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    onClick={() => setMenuOpen(false)}
                    className={({ isActive }) => `flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${isActive ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'}`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {label}
                  </NavLink>
                ))}
              </nav>
              <div className="mt-2 border-t border-slate-200 pt-2 dark:border-slate-700">
                <button type="button" onClick={() => setMode(mode === 'dark' ? 'light' : 'dark')} className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">
                  {mode === 'dark' ? <SunMedium className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  Theme: {mode === 'dark' ? 'Dark' : mode === 'system' ? 'System' : 'Light'}
                </button>
                <button type="button" onClick={handleSignOut} className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/30">
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  </>
  );
}
