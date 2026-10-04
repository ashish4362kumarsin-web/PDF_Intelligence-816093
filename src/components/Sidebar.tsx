import { NavLink, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Database,
  FileText,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Network,
  Settings,
  Sparkles,
  User as UserIcon
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
}

export const navItems: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/library', label: 'PDF Library', icon: BookOpen },
  { to: '/chat', label: 'AI Chat', icon: MessageSquare },
  { to: '/notes', label: 'Study Notes', icon: FileText },
  { to: '/mindmap', label: 'Mind Map', icon: Network },
  { to: '/extracted-data', label: 'Extracted Data', icon: Database },
  { to: '/settings', label: 'Settings', icon: Settings }
];

export default function Sidebar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate('/login', { replace: true });
  }

  return (
    <aside
      aria-label="Desktop Navigation"
      className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 lg:flex"
    >
      {/* Brand Header */}
      <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-6 dark:border-slate-800">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-500 font-bold text-white shadow-md shadow-blue-500/20">
          PI
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-base font-bold tracking-tight text-slate-900 dark:text-white">
              PDF Intelligence
            </span>
          </div>
          <p className="flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
            <Sparkles className="h-3 w-3 text-blue-500" />
            AI Document Engine
          </p>
        </div>
      </div>

      {/* Main Navigation Links */}
      <div className="flex-1 overflow-y-auto px-4 py-5">
        <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Workspace
        </p>
        <nav className="space-y-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={`h-4 w-4 shrink-0 transition-transform group-hover:scale-110 ${
                      isActive ? 'text-white' : 'text-slate-400 dark:text-slate-400'
                    }`}
                  />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* User Footer */}
      <div className="border-t border-slate-200 p-4 dark:border-slate-800">
        <div className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/60">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              <UserIcon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-slate-800 dark:text-slate-200">
                {user?.displayName || user?.email?.split('@')[0] || 'User'}
              </p>
              <p className="truncate text-[10px] text-slate-500 dark:text-slate-400">
                {user?.email || 'Authenticated'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            title="Sign out"
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
