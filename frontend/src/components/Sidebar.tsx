import {
  BookText,
  BrainCircuit,
  FileText,
  History,
  LayoutDashboard,
  MessageSquareText,
  NotebookPen,
  Settings
} from 'lucide-react';
import { NavLink } from 'react-router-dom';

export const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/library', label: 'My PDFs', icon: FileText },
  { to: '/chat', label: 'AI Chat', icon: MessageSquareText },
  { to: '/notes', label: 'Notes', icon: NotebookPen },
  { to: '/extracted-data', label: 'Extracted Data', icon: BookText },
  { to: '/mind-map', label: 'Mind Map', icon: BrainCircuit },
  { to: '/history', label: 'History', icon: History },
  { to: '/settings', label: 'Settings', icon: Settings }
];

function classNames(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export default function Sidebar() {
  return (
    <aside className="hidden w-72 flex-col border-r border-slate-200 bg-white dark:border-slate-700 dark:bg-[#0f172a] lg:flex">
      <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-5 dark:border-slate-800">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-bold text-white">
          PI
        </div>
        <div>
          <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">PDF Intelligence</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">AI document workspace</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              classNames(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                isActive
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900'
              )
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>

    </aside>
  );
}
