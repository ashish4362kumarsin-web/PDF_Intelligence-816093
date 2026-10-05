import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  Calendar,
  Check,
  CheckCircle2,
  Copy,
  Edit2,
  KeyRound,
  LoaderCircle,
  LogOut,
  Mail,
  RefreshCw,
  Save,
  Send,
  ShieldCheck,
  User as UserIcon,
  X
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getAuthErrorMessage } from '@/services/firebase';

export default function ProfilePage() {
  const { user, signOut, sendVerificationEmail, reloadUser, updateUserProfile } = useAuth();
  const navigate = useNavigate();

  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [photoURL, setPhotoURL] = useState(user?.photoURL || '');
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const [verificationSending, setVerificationSending] = useState(false);
  const [verificationSuccess, setVerificationSuccess] = useState('');
  const [refreshingStatus, setRefreshingStatus] = useState(false);
  const [copiedUid, setCopiedUid] = useState(false);

  if (!user) {
    return null;
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      await updateUserProfile({
        displayName: displayName.trim() || undefined,
        photoURL: photoURL.trim() || undefined
      });
      setSuccessMessage('Profile updated successfully.');
      setIsEditing(false);
    } catch (err) {
      setErrorMessage(getAuthErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleSendVerification() {
    setVerificationSending(true);
    setVerificationSuccess('');
    setErrorMessage('');

    try {
      await sendVerificationEmail();
      setVerificationSuccess('Verification email sent! Check your inbox.');
    } catch (err) {
      setErrorMessage(getAuthErrorMessage(err));
    } finally {
      setVerificationSending(false);
    }
  }

  async function handleRefreshStatus() {
    setRefreshingStatus(true);
    setErrorMessage('');
    try {
      await reloadUser();
    } catch (err) {
      setErrorMessage(getAuthErrorMessage(err));
    } finally {
      setRefreshingStatus(false);
    }
  }

  function handleCopyUid() {
    if (user?.uid) {
      navigator.clipboard.writeText(user.uid);
      setCopiedUid(true);
      setTimeout(() => setCopiedUid(false), 2000);
    }
  }

  async function handleSignOut() {
    await signOut();
    navigate('/login', { replace: true });
  }

  const initials = (user.displayName || user.email || 'U')
    .slice(0, 2)
    .toUpperCase();

  const formattedCreationDate = user.creationTime
    ? new Date(user.creationTime).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : 'Unknown';

  const formattedLastSignIn = user.lastSignInTime
    ? new Date(user.lastSignInTime).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : 'Active now';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            User Profile
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Real authenticated account details and personal identity preferences.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSignOut}
            className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3.5 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 dark:border-red-900/50 dark:bg-slate-900 dark:text-red-400 dark:hover:bg-red-950/30"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign Out
          </button>
        </div>
      </div>

      {successMessage && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Profile Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="relative">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'User profile'}
                  className="h-20 w-20 rounded-2xl object-cover ring-2 ring-blue-500/20 shadow-md"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-2xl font-bold text-white shadow-md">
                  {initials}
                </div>
              )}
            </div>

            {/* Profile Info */}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  {user.displayName || 'Unnamed User'}
                </h2>
                {user.emailVerified ? (
                  <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                    <CheckCircle2 className="h-3 w-3" />
                    Verified
                  </span>
                ) : (
                  <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                    <AlertCircle className="h-3 w-3" />
                    Unverified
                  </span>
                )}
              </div>

              <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <Mail className="h-3.5 w-3.5" />
                <span>{user.email}</span>
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-mono text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  <span className="text-slate-400">UID:</span>
                  <span className="truncate max-w-[140px] sm:max-w-none">{user.uid}</span>
                  <button
                    type="button"
                    onClick={handleCopyUid}
                    title="Copy UID"
                    className="ml-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {copiedUid ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {!isEditing && (
            <button
              type="button"
              onClick={() => {
                setDisplayName(user.displayName || '');
                setPhotoURL(user.photoURL || '');
                setIsEditing(true);
              }}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <Edit2 className="h-3.5 w-3.5" />
              Edit Profile
            </button>
          )}
        </div>

        {/* Edit Form */}
        {isEditing && (
          <form onSubmit={handleSaveProfile} className="mt-6 border-t border-slate-100 pt-6 dark:border-slate-800">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Edit Account Information
            </h3>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Full Name / Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Jane Doe"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Avatar Photo URL (Optional)
                </label>
                <input
                  type="url"
                  value={photoURL}
                  onChange={(e) => setPhotoURL(e.target.value)}
                  placeholder="https://example.com/avatar.jpg"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                disabled={saving}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <X className="h-3.5 w-3.5" />
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-blue-600/30 transition hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Account Verification & Security Section */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Email Verification Box */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
              <ShieldCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              Email Verification
            </h3>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                user.emailVerified
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                  : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
              }`}
            >
              {user.emailVerified ? 'Verified' : 'Pending'}
            </span>
          </div>

          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            {user.emailVerified
              ? 'Your email address is verified. You have full authenticated access to all document analytics and AI features.'
              : 'Your email address is not yet verified. Please verify your address to ensure permanent account security.'}
          </p>

          {verificationSuccess && (
            <p className="mt-3 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              {verificationSuccess}
            </p>
          )}

          {!user.emailVerified && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleSendVerification}
                disabled={verificationSending}
                className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm shadow-blue-600/30 transition hover:bg-blue-700 disabled:opacity-50"
              >
                {verificationSending ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                {verificationSending ? 'Sending...' : 'Send Verification Email'}
              </button>

              <button
                type="button"
                onClick={handleRefreshStatus}
                disabled={refreshingStatus}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${refreshingStatus ? 'animate-spin' : ''}`} />
                Check Status
              </button>
            </div>
          )}
        </div>

        {/* Account Details Box */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
            <KeyRound className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            Account Overview
          </h3>

          <div className="mt-4 space-y-3 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
              <span className="flex items-center gap-1.5 text-slate-500">
                <Calendar className="h-3.5 w-3.5" />
                Member Since
              </span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {formattedCreationDate}
              </span>
            </div>

            <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
              <span className="flex items-center gap-1.5 text-slate-500">
                <RefreshCw className="h-3.5 w-3.5" />
                Last Session
              </span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {formattedLastSignIn}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-500">
                <UserIcon className="h-3.5 w-3.5" />
                Tenant Isolation
              </span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                Active (UID Isolated)
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
