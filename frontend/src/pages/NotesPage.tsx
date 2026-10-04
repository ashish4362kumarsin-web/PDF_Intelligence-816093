import { useEffect, useState } from 'react';
import { AlertCircle, NotebookPen, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '@/services/api';
import type { NoteItem, PdfDocument } from '@/types';
import MarkdownContent from '@/components/MarkdownContent';

export default function NotesPage() {
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [documents, setDocuments] = useState<PdfDocument[]>([]);
  const [documentId, setDocumentId] = useState('');
  const [selectedNoteId, setSelectedNoteId] = useState('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  async function loadNotes() {
    setLoading(true);
    setError('');
    try {
      const [notesResult, documentsResult] = await Promise.all([api.getNotes(), api.getDocuments()]);
      setNotes(notesResult.data);
      setDocuments(documentsResult.data);
      setSelectedNoteId((current) => current || notesResult.data[0]?.id || '');
      setDocumentId((current) => current || documentsResult.data[0]?.id || '');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load notes.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadNotes(); }, []);

  async function generateNotes() {
    if (!documentId || generating) return;
    setGenerating(true);
    setError('');
    try {
      const result = await api.generateNotes({ document_id: documentId });
      setNotes((current) => [result.note, ...current]);
      setSelectedNoteId(result.note.id);
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : 'Notes could not be generated.');
    } finally {
      setGenerating(false);
    }
  }

  const selectedNote = notes.find((note) => note.id === selectedNoteId);

  return (
    <div className="space-y-5">
      <div className="card p-5">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Generated notes</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Generate and revisit study notes based on your stored PDFs.</p>
      </div>

      <section className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
        <label className="min-w-0 flex-1 text-sm font-medium text-slate-700 dark:text-slate-200">
          Document
          <select value={documentId} onChange={(event) => setDocumentId(event.target.value)} disabled={documents.length === 0} className="mt-1 min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900">
            {documents.length === 0 ? <option value="">No PDFs available</option> : documents.map((document) => <option key={document.id} value={document.id}>{document.title}</option>)}
          </select>
        </label>
        <button type="button" onClick={() => void generateNotes()} disabled={!documentId || generating} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60">
          <Sparkles className="h-4 w-4" />{generating ? 'Generating notes...' : 'Generate notes'}
        </button>
      </section>

      {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span className="flex-1">{error}</span><button type="button" onClick={() => void loadNotes()} className="font-semibold underline">Retry</button></div>}

      {loading ? <div className="card p-5 text-sm text-slate-500 dark:text-slate-400" role="status">Loading saved notes...</div> : notes.length === 0 ? (
        <div className="card flex flex-col items-center px-5 py-12 text-center">
          <NotebookPen className="h-8 w-8 text-slate-400" />
          <h2 className="mt-3 font-semibold text-slate-900 dark:text-slate-100">No saved notes yet</h2>
          <p className="mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">Select a PDF above and generate notes from its extracted content.</p>
          {documents.length === 0 && <Link to="/library" className="mt-4 text-sm font-semibold text-blue-600 dark:text-blue-300">Upload a PDF</Link>}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[16rem_minmax(0,1fr)]">
          <nav aria-label="Saved notes" className="card space-y-1 p-2">
            {notes.map((note) => (
              <button key={note.id} type="button" onClick={() => setSelectedNoteId(note.id)} className={`w-full rounded-lg px-3 py-3 text-left text-sm ${selectedNoteId === note.id ? 'bg-blue-100 font-semibold text-blue-900 dark:bg-blue-950/50 dark:text-blue-100' : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'}`}>
                <span className="block truncate">{note.title}</span>
                <span className="mt-1 block text-xs font-normal text-slate-500 dark:text-slate-400">{note.updatedAt ? new Date(note.updatedAt).toLocaleDateString() : ''}</span>
              </button>
            ))}
          </nav>
          {selectedNote && <article className="card min-w-0 p-5 sm:p-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{selectedNote.title}</h2>
            <div className="mt-4 text-sm leading-7 text-slate-700 dark:text-slate-200"><MarkdownContent content={selectedNote.body} /></div>
          </article>}
        </div>
      )}
    </div>
  );
}
