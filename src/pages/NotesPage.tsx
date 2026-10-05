import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  Check,
  Copy,
  Download,
  FileText,
  LoaderCircle,
  Plus,
  Sparkles
} from 'lucide-react';
import { api } from '@/services/api';
import type { NoteItem, PdfDocument } from '@/types';
import AiResponseRenderer from '@/components/AiResponseRenderer';

export default function NotesPage() {
  const [searchParams] = useSearchParams();
  const initialDocId = searchParams.get('doc');

  const [documents, setDocuments] = useState<PdfDocument[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string>(initialDocId || '');
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string>('');
  const [scope, setScope] = useState('comprehensive');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    Promise.all([api.getDocuments(), api.getNotes()])
      .then(([docsRes, notesRes]) => {
        setDocuments(docsRes.data);
        if (docsRes.data.length > 0) {
          if (!selectedDocId || !docsRes.data.some((d) => d.id === selectedDocId)) {
            setSelectedDocId(docsRes.data[0].id);
          }
        }
        setNotes(notesRes.data);
        if (notesRes.data.length > 0) {
          setActiveNoteId(notesRes.data[0].id);
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load data'))
      .finally(() => setLoading(false));
  }, []);

  async function handleGenerateNotes() {
    if (!selectedDocId || generating) return;

    setGenerating(true);
    setError('');

    try {
      const res = await api.generateNotes({
        document_id: selectedDocId,
        scope
      });

      if (res.note) {
        setNotes((prev) => [res.note, ...prev.filter((n) => n.id !== res.note.id)]);
        setActiveNoteId(res.note.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate study notes');
    } finally {
      setGenerating(false);
    }
  }

  const activeNote = notes.find((n) => n.id === activeNoteId);

  function handleCopy() {
    if (!activeNote) return;
    navigator.clipboard.writeText(activeNote.body);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownload() {
    if (!activeNote) return;
    const blob = new Blob([activeNote.body], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeNote.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            AI Study Notes & Syntheses
          </h1>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            Automatically transform lengthy PDFs into high-yield study guides, summaries, and exam prep notes.
          </p>
        </div>
      </div>

      {/* Generator Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Select Document
            </label>
            <select
              value={selectedDocId}
              onChange={(e) => setSelectedDocId(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm font-medium text-slate-800 outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              {documents.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title}
                </option>
              ))}
              {documents.length === 0 && <option value="">No documents available</option>}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Note Scope
            </label>
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm font-medium text-slate-800 outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="comprehensive">Comprehensive Study Guide</option>
              <option value="executive">Executive Summary</option>
              <option value="concepts">Key Concepts & Terminology</option>
              <option value="exam">Exam & Quiz Review Sheet</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={handleGenerateNotes}
              disabled={generating || !selectedDocId}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-600/30 transition hover:bg-blue-700 disabled:opacity-50"
            >
              {generating ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate Notes
                </>
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Main Content Viewer */}
      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Saved notes sidebar */}
        <div className="w-full shrink-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:w-80">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Saved Note Collections
          </h2>

          <div className="mt-3 space-y-1.5 max-h-96 overflow-y-auto">
            {notes.map((note) => (
              <button
                key={note.id}
                type="button"
                onClick={() => setActiveNoteId(note.id)}
                className={`w-full rounded-xl p-3 text-left transition ${
                  activeNoteId === note.id
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 shrink-0" />
                  <p className="truncate text-xs font-semibold">{note.title}</p>
                </div>
                <p
                  className={`mt-1 text-[10px] ${
                    activeNoteId === note.id ? 'text-blue-100' : 'text-slate-400'
                  }`}
                >
                  {new Date(note.updatedAt).toLocaleDateString()}
                </p>
              </button>
            ))}

            {notes.length === 0 && !loading && (
              <p className="py-8 text-center text-xs text-slate-400">
                No study notes generated yet.
              </p>
            )}
          </div>
        </div>

        {/* Note Viewer */}
        <div className="flex-1 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {activeNote ? (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {activeNote.title}
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Updated {new Date(activeNote.updatedAt).toLocaleString()}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download MD
                  </button>
                </div>
              </div>

              <div className="pt-6 text-sm">
                <AiResponseRenderer content={activeNote.body} allowCopy={false} />
              </div>
            </div>
          ) : (
            <div className="flex h-64 flex-col items-center justify-center text-center">
              <FileText className="h-10 w-10 text-slate-300 dark:text-slate-600" />
              <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
                No note selected
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Select a note on the left or generate a new study guide above.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
