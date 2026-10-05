import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, DragEvent } from 'react';
import { AlertCircle, FileText, HelpCircle, MessageSquare, Network, Search, Sparkles, Trash2, UploadCloud, X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import type { PdfDocument } from '@/types';

const maxUploadSizeBytes = 80 * 1024 * 1024;

export default function LibraryPage() {
  const { isGuest } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const fileInput = useRef<HTMLInputElement>(null);
  const [documents, setDocuments] = useState<PdfDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [query, setQuery] = useState(() => new URLSearchParams(location.search).get('search') ?? '');
  const [sort, setSort] = useState('newest');
  const [error, setError] = useState('');
  const [failedUpload, setFailedUpload] = useState<File | null>(null);
  const [canReload, setCanReload] = useState(false);
  const [openDocument, setOpenDocument] = useState<{ title: string; url: string } | null>(null);

  async function loadDocuments() {
    setLoading(true);
    setError('');
    setCanReload(false);
    try {
      const result = await api.getDocuments();
      setDocuments(result.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load your PDFs.');
      setCanReload(true);
    } finally {
      setLoading(false);
    }
  }

  async function searchDocuments(q: string) {
    const value = q.trim();
    if (!value) {
      await loadDocuments();
      return;
    }

    setLoading(true);
    setError('');
    setCanReload(false);
    try {
      const result = await api.searchDocuments(value);
      setDocuments(result.data.map((item) => ({
        id: item.documentId,
        title: item.documentName,
        status: 'ready',
        uploadedAt: new Date().toISOString(),
        size: 0,
        pages: item.pageNumber ?? undefined,
        summary: item.snippet,
      })));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not search your PDFs.');
      setCanReload(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDocuments();
  }, []);

  useEffect(() => {
    const hasPending = documents.some(
      (doc) => doc.status !== 'ready' && doc.status !== 'failed'
    );
    if (!hasPending) return;
    const timer = setTimeout(() => {
      void loadDocuments();
    }, 2000);
    return () => clearTimeout(timer);
  }, [documents]);

  useEffect(() => {
    const nextQuery = new URLSearchParams(location.search).get('search') ?? '';
    setQuery(nextQuery);
    if (nextQuery.trim()) {
      void searchDocuments(nextQuery);
      return;
    }
    void loadDocuments();
  }, [location.search]);

  useEffect(() => () => {
    if (openDocument?.url) URL.revokeObjectURL(openDocument.url);
  }, [openDocument?.url]);

  async function uploadFile(file?: File) {
    if (!file) return;

    if (isGuest) {
      navigate('/login', {
        state: {
          message: 'Sign in to upload PDFs and save your documents.',
          returnTo: '/library',
          pendingAction: 'upload'
        }
      });
      return;
    }

    setError('');
    if (!file.name.toLowerCase().endsWith('.pdf') || (file.type && file.type !== 'application/pdf')) {
      setError('Choose a PDF file to upload.');
      return;
    }
    if (file.size > maxUploadSizeBytes) {
      setError('This PDF is larger than the 20 MB upload limit.');
      return;
    }

    setUploading(true);
    setFailedUpload(null);
    setCanReload(false);
    const formData = new FormData();
    formData.append('file', file);
    let uploadSucceeded = false;
    try {
      await api.uploadPdf(formData);
      uploadSucceeded = true;
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'PDF upload failed.');
      setFailedUpload(file);
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = '';
    }
    if (uploadSucceeded) await loadDocuments();
  }

  async function openPdf(document: PdfDocument) {
    setError('');
    try {
      const blob = await api.downloadPdf(document.id);
      setOpenDocument({ title: document.title, url: URL.createObjectURL(blob) });
    } catch (openError) {
      setError(openError instanceof Error ? openError.message : 'Could not open this PDF.');
    }
  }

  async function removePdf(document: PdfDocument) {
    if (!window.confirm(`Delete ${document.title}? This also removes its stored PDF and extracted text.`)) return;
    setError('');
    try {
      await api.deletePdf(document.id);
      setDocuments((current) => current.filter((item) => item.id !== document.id));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Could not delete this PDF.');
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    void uploadFile(event.dataTransfer.files[0]);
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    void uploadFile(event.target.files?.[0]);
  }

  const visibleDocuments = [...documents]
    .filter((document) => document.title.toLowerCase().includes(query.trim().toLowerCase()))
    .sort((left, right) => {
      if (sort === 'name') return left.title.localeCompare(right.title);
      const direction = sort === 'oldest' ? 1 : -1;
      return direction * (Date.parse(left.uploadedAt ?? '') - Date.parse(right.uploadedAt ?? ''));
    });

  return (
    <div className="space-y-5">
      <div className="card p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">My PDFs</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Manage uploaded files and review document status.</p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="flex min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
              <Search className="h-4 w-4" />
              <input aria-label="Search PDFs" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search PDFs" className="min-w-0 bg-transparent outline-none placeholder:text-slate-400" />
            </label>
            <select aria-label="Sort PDFs" value={sort} onChange={(event) => setSort(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="name">Name</option>
            </select>
          </div>
        </div>
      </div>

      <input ref={fileInput} type="file" accept="application/pdf,.pdf" className="hidden" onChange={handleFileChange} />
      <div
        onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragging(false); }}
        onDrop={handleDrop}
        className={`rounded-xl border border-dashed p-4 transition sm:p-5 ${dragging ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30' : 'border-slate-300 bg-white/60 dark:border-slate-700 dark:bg-slate-900/40'}`}
      >
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"><UploadCloud className="h-5 w-5" /></span>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{uploading ? 'Uploading and processing PDF...' : 'Add a PDF'}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">PDF up to 20 MB, or drag it here.</p>
            </div>
          </div>
          <button type="button" onClick={() => fileInput.current?.click()} disabled={uploading} className="min-h-11 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-60">
            {uploading ? 'Working...' : 'Choose PDF'}
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="flex-1">{error}</span>
          {failedUpload ? (
            <button type="button" disabled={uploading} onClick={() => void uploadFile(failedUpload)} className="font-semibold underline disabled:opacity-60">Retry upload</button>
          ) : canReload ? (
            <button type="button" onClick={() => void loadDocuments()} className="font-semibold underline">Refresh list</button>
          ) : (
            <button type="button" onClick={() => setError('')} aria-label="Dismiss error" className="font-semibold underline">Dismiss</button>
          )}
        </div>
      )}

      {loading ? (
        <div className="card p-6 text-sm text-slate-500 dark:text-slate-400" role="status">Loading your PDFs...</div>
      ) : visibleDocuments.length === 0 ? (
        <div className="card flex flex-col items-center px-5 py-12 text-center">
          <FileText className="h-8 w-8 text-slate-400" />
          <h2 className="mt-3 font-semibold text-slate-900 dark:text-slate-100">{query ? 'No matching PDFs' : 'No PDFs yet'}</h2>
          <p className="mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">{query ? 'Try a different search.' : 'Upload a PDF to store it privately and start working with its contents.'}</p>
        </div>
      ) : (
        <div className="space-y-3">
        {visibleDocuments.map((doc) => (
          <div key={doc.id} className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300">
                <FileText className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <p className="truncate font-medium text-slate-900 dark:text-slate-100">{doc.title}</p>
                {doc.summary && (
                  <p className="mt-1 max-w-xl truncate text-sm text-slate-600 dark:text-slate-300">{doc.summary}</p>
                )}
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                  <span>PDF</span>
                  <span>•</span>
                  <span>{doc.pages ?? '—'} pages</span>
                  <span>•</span>
                  <span>{doc.size ? `${(doc.size / (1024 * 1024)).toFixed(1)} MB` : 'Search match'}</span>
                  <span>•</span>
                  <span>{doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : 'Date unavailable'}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <span className={`rounded-full px-2 py-1 text-xs font-medium capitalize ${doc.status === 'ready' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : doc.status === 'failed' ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'}`}>
                {doc.status === 'ocr_processing' ? 'OCR in progress' : doc.status === 'extracting' ? 'Extracting text' : doc.status === 'indexing' ? 'Indexing' : doc.status}
              </span>
              <button type="button" onClick={() => void openPdf(doc)} className="min-h-10 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white dark:bg-slate-200 dark:text-slate-900">
                Open
              </button>
              <button type="button" aria-label={`Delete ${doc.title}`} onClick={() => void removePdf(doc)} className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-red-600 dark:border-red-900/30 dark:bg-red-950/30 dark:text-red-300">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
      )}

      {openDocument && (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/90 p-2 sm:p-5" role="dialog" aria-modal="true" aria-label={`PDF viewer: ${openDocument.title}`}>
          <div className="flex min-h-12 items-center justify-between gap-3 rounded-t-xl bg-white px-3 dark:bg-slate-900 sm:px-4">
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{openDocument.title}</p>
            <button type="button" onClick={() => setOpenDocument(null)} aria-label="Close PDF viewer" className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"><X className="h-5 w-5" /></button>
          </div>
          <iframe title={`PDF viewer: ${openDocument.title}`} src={openDocument.url} className="min-h-0 flex-1 rounded-b-xl bg-slate-200" />
        </div>
      )}
    </div>
  );
}
