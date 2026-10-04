import { useEffect, useState } from 'react';
import { ArrowUpRight, FileText, MessageSquareText, NotebookPen } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '@/services/api';

interface HistoryEntry {
  id: string;
  title: string;
  date: string;
  kind: 'PDF' | 'Chat' | 'Note';
  to: string;
}

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([api.getDocuments(), api.getChats(), api.getNotes()]).then(([documents, chats, notes]) => {
      if (!active) return;
      const entries: HistoryEntry[] = [
        ...documents.data.map((document) => ({ id: `pdf-${document.id}`, title: document.title, date: document.uploadedAt, kind: 'PDF' as const, to: '/library' })),
        ...chats.data.map((chat) => ({ id: `chat-${chat.id}`, title: chat.title, date: chat.updatedAt, kind: 'Chat' as const, to: '/chat' })),
        ...notes.data.map((note) => ({ id: `note-${note.id}`, title: note.title, date: note.updatedAt, kind: 'Note' as const, to: '/notes' }))
      ];
      entries.sort((left, right) => Date.parse(right.date ?? '') - Date.parse(left.date ?? ''));
      setHistory(entries);
    }).catch((loadError: unknown) => {
      if (active) setError(loadError instanceof Error ? loadError.message : 'Could not load activity.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  return (
    <div className="space-y-5">
      <div className="card p-5">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">History</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Your uploaded PDFs and saved AI work.</p>
      </div>

      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">{error}</div>}
      {loading ? <div className="card p-5 text-sm text-slate-500 dark:text-slate-400" role="status">Loading activity...</div> : history.length === 0 ? (
        <div className="card px-5 py-12 text-center"><p className="font-semibold text-slate-900 dark:text-slate-100">No activity yet</p><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Uploaded PDFs, chats, and notes will appear here.</p></div>
      ) : <div className="space-y-3">
        {history.map((item) => {
          const Icon = item.kind === 'PDF' ? FileText : item.kind === 'Chat' ? MessageSquareText : NotebookPen;
          return <Link key={item.id} to={item.to} className="card flex min-h-16 items-center justify-between gap-3 p-4 hover:border-blue-300 dark:hover:border-blue-700">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300"><Icon className="h-4 w-4" /></span>
              <div className="min-w-0"><p className="truncate font-medium text-slate-900 dark:text-slate-100">{item.title}</p><p className="text-sm text-slate-500 dark:text-slate-400">{item.kind} · {item.date ? new Date(item.date).toLocaleString() : 'Date unavailable'}</p></div>
            </div>
            <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-500" />
          </Link>;
        })}
      </div>}
    </div>
  );
}
