import { useEffect, useState } from 'react';
import { ArrowUpRight, FileText, MessageSquareText, NotebookPen, Sparkles, UploadCloud } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '@/services/api';
import type { ChatSession, PdfDocument } from '@/types';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<PdfDocument[]>([]);
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadDashboard() {
    setLoading(true);
    setError('');
    try {
      const [documentResult, chatResult] = await Promise.all([api.getDocuments(), api.getChats()]);
      setDocuments(documentResult.data);
      setChats(chatResult.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load workspace data.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDashboard();
  }, []);

  const recentDocuments = documents.slice(0, 4);
  const readyCount = documents.filter((document) => document.status === 'ready').length;

  return (
    <div className="space-y-6">
      <section className="card p-5 sm:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.12em] text-blue-600 dark:text-blue-300">PDF Intelligence</p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">Your document workspace</h1>
          </div>
          <button type="button" onClick={() => navigate('/library')} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-500">
            <UploadCloud className="mr-2 h-4 w-4" />
            Upload PDF
          </button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard label="PDFs uploaded" value={loading ? '...' : String(documents.length)} detail="Your private documents" />
        <StatCard label="Documents ready" value={loading ? '...' : String(readyCount)} detail="Processed and available" />
        <StatCard label="AI chats" value={loading ? '...' : String(chats.length)} detail="Saved conversations" />
      </section>

      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">{error} <button type="button" onClick={() => void loadDashboard()} className="ml-2 font-semibold underline">Retry</button></div>}

      <section className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Recent PDFs</h2>
            <Link to="/library" className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 dark:text-blue-300">
              View all <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>

          {loading ? <p className="text-sm text-slate-500 dark:text-slate-400" role="status">Loading documents...</p> : recentDocuments.length === 0 ? (
            <div className="surface p-4">
              <p className="font-medium text-slate-900 dark:text-slate-100">No PDFs yet</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Upload a document to start a grounded AI workspace.</p>
            </div>
          ) : <div className="space-y-3">
            {recentDocuments.map((pdf) => (
              <Link to="/library" key={pdf.id} className="surface flex items-center justify-between gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800/70">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900 dark:text-slate-100">{pdf.title}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{pdf.uploadedAt ? new Date(pdf.uploadedAt).toLocaleString() : 'Upload date unavailable'}</p>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                  {pdf.status}
                </span>
              </Link>
            ))}
          </div>}
        </div>

        <div className="card p-5">
          <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Quick actions</h2>
          <div className="space-y-3">
            <QuickAction to="/library" label="Upload PDF" icon={UploadCloud} />
            <QuickAction to="/chat" label="Open AI Chat" icon={MessageSquareText} />
            <QuickAction to="/notes" label="View Notes" icon={NotebookPen} />
            <QuickAction to="/extracted-data" label="Extracted Data" icon={Sparkles} />
          </div>
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="card p-5">
      <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
      <div className="mt-3 flex items-end justify-between gap-2">
        <p className="text-3xl font-semibold text-slate-900 dark:text-slate-100">{value}</p>
      </div>
      <p className="mt-2 text-sm text-emerald-600 dark:text-emerald-400">{detail}</p>
    </div>
  );
}

function QuickAction({ to, label, icon: Icon }: { to: string; label: string; icon: typeof UploadCloud }) {
  return (
    <Link to={to} className="flex min-h-11 w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
      <span className="flex items-center gap-2"><Icon className="h-4 w-4" />{label}</span>
      <ArrowUpRight className="h-4 w-4" />
    </Link>
  );
}
