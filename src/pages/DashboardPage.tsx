import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, DragEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Database,
  FileCheck2,
  FileText,
  LoaderCircle,
  MessageSquare,
  Network,
  Plus,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Trash2,
  UploadCloud
} from 'lucide-react';
import { api, validatePdfFile } from '@/services/api';
import { MAX_PDF_SIZE_BYTES, MAX_PDF_SIZE_LABEL } from '@/types';
import type { NoteItem, PdfDocument } from '@/types';

export default function DashboardPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [documents, setDocuments] = useState<PdfDocument[]>([]);
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  async function loadData() {
    try {
      const [docsRes, notesRes] = await Promise.allSettled([
        api.getDocuments(),
        api.getNotes()
      ]);

      if (docsRes.status === 'fulfilled') {
        setDocuments(docsRes.value.data);
      }
      if (notesRes.status === 'fulfilled') {
        setNotes(notesRes.value.data);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadData();
    // Poll documents every 6 seconds if any are in processing state
    const timer = setInterval(() => {
      api.getDocuments().then((res) => {
        setDocuments(res.data);
      }).catch(() => {});
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  async function handleFileUpload(file?: File | null) {
    if (!file) {
      setUploadError('Please select a PDF file.');
      return;
    }

    const validation = validatePdfFile(file);
    if (!validation.valid) {
      setUploadError(validation.error || 'Invalid file.');
      setUploadSuccess('');
      return;
    }

    setSelectedFile(file);
    setUploadError('');
    setUploadSuccess('');
    setUploadProgress(0);
    setUploading(true);

    try {
      await api.uploadPdf(file, {
        onProgress: (percent) => {
          setUploadProgress(percent);
        }
      });
      setUploadSuccess(`PDF "${file.name}" uploaded successfully.`);
      setSelectedFile(null);
      await loadData();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (uploading) return;
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    if (!uploading) setDragActive(true);
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this PDF?')) return;
    try {
      await api.deletePdf(id);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete');
    }
  }

  function formatBytes(bytes: number) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  }

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            Document Intelligence Hub
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Upload PDFs to generate grounded AI insights, dynamic mind maps, structured facts, and study notes.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setRefreshing(true);
              loadData();
            }}
            disabled={refreshing}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-blue-600/30 transition hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Upload PDF
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              if (e.target.files && e.target.files[0]) {
                handleFileUpload(e.target.files[0]);
                e.target.value = '';
              }
            }}
          />
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              PDF Documents
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <BookOpen className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
              {documents.length}
            </span>
            <span className="text-xs text-slate-500">
              {documents.filter((d) => d.status === 'ready').length} ready
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              AI Conversations
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              <MessageSquare className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
              {documents.length > 0 ? 'Active' : '0'}
            </span>
            <span className="text-xs text-slate-500">Grounded in PDFs</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Study Notes
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <FileText className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
              {notes.length}
            </span>
            <span className="text-xs text-slate-500">Generated summaries</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Visual Mind Maps
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400">
              <Network className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
              AI Hierarchies
            </span>
            <span className="text-xs text-slate-500">Interactive node graphs</span>
          </div>
        </div>
      </div>

      {/* Upload Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => {
          if (!uploading) fileInputRef.current?.click();
        }}
        className={`group relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-all ${
          uploading
            ? 'cursor-not-allowed border-blue-400 bg-blue-50/30 dark:border-blue-700 dark:bg-blue-950/20'
            : dragActive
            ? 'cursor-pointer border-blue-500 bg-blue-50/50 dark:border-blue-400 dark:bg-blue-950/30'
            : 'cursor-pointer border-slate-300 bg-white hover:border-blue-400 hover:bg-slate-50/60 dark:border-slate-700 dark:bg-slate-900/60 dark:hover:border-slate-600'
        }`}
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 transition group-hover:scale-110 dark:bg-blue-950/80 dark:text-blue-400">
          {uploading ? (
            <LoaderCircle className="h-7 w-7 animate-spin" />
          ) : (
            <UploadCloud className="h-7 w-7" />
          )}
        </div>
        <div className="mt-4 space-y-1">
          <p className="text-base font-semibold text-slate-800 dark:text-slate-200">
            {uploading ? `Uploading... ${uploadProgress}%` : 'Click to upload or drag & drop PDF'}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Supports standard and scanned PDFs up to {MAX_PDF_SIZE_LABEL} with OCR fallback
          </p>
        </div>

        {uploading && (
          <div className="mt-4 w-full max-w-xs">
            <div className="flex items-center justify-between text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
              <span className="truncate max-w-[180px]">{selectedFile?.name || 'Uploading file'}</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
              <div
                className="h-full bg-blue-600 transition-all duration-200"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {uploadSuccess && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2 text-xs font-medium text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>{uploadSuccess}</span>
          </div>
        )}

        {uploadError && (
          <div className="mt-4 flex flex-col items-center gap-2">
            <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-2 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{uploadError}</span>
            </div>
            {selectedFile && !uploading && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleFileUpload(selectedFile);
                }}
                className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-50 dark:border-red-900 dark:bg-slate-800 dark:text-red-300"
              >
                <RotateCcw className="h-3 w-3" />
                Retry Upload
              </button>
            )}
          </div>
        )}
      </div>

      {/* Quick Launchpad & Documents */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Recent Documents Table */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:col-span-2">
          <div className="flex items-center justify-between pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Recent Documents
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Your processed documents available for question-answering
              </p>
            </div>
            <Link
              to="/library"
              className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              View library <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <LoaderCircle className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          ) : documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <BookOpen className="h-10 w-10 text-slate-300 dark:text-slate-600" />
              <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
                No documents uploaded yet
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Upload your first PDF document above to start analyzing
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {documents.slice(0, 5).map((doc) => (
                <div
                  key={doc.id}
                  className="group flex flex-col justify-between gap-3 py-4 sm:flex-row sm:items-center"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <FileCheck2 className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
                      <span className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {doc.title}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                          doc.status === 'ready'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : doc.status === 'failed'
                            ? 'bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                            : 'bg-amber-50 text-amber-700 animate-pulse dark:bg-amber-950/60 dark:text-amber-300'
                        }`}
                      >
                        {doc.status}
                      </span>
                    </div>
                    <p className="mt-1 flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                      <span>{doc.pages ? `${doc.pages} pages` : 'Analyzing'}</span>
                      <span>•</span>
                      <span>{formatBytes(doc.size)}</span>
                      <span>•</span>
                      <span>{new Date(doc.uploadedAt).toLocaleDateString()}</span>
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => navigate(`/chat?doc=${doc.id}`)}
                      title="Chat with Document"
                      className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-50 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:text-blue-400"
                    >
                      <MessageSquare className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate(`/notes?doc=${doc.id}`)}
                      title="Study Notes"
                      className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-50 hover:text-emerald-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:text-emerald-400"
                    >
                      <FileText className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate(`/mindmap?doc=${doc.id}`)}
                      title="Mind Map"
                      className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-50 hover:text-purple-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:text-purple-400"
                    >
                      <Network className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate(`/extracted-data?doc=${doc.id}`)}
                      title="Extracted Data"
                      className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-50 hover:text-amber-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:text-amber-400"
                    >
                      <Database className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleDelete(doc.id, e)}
                      title="Delete"
                      className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Feature Hub Card */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
              <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              Intelligence Capabilities
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Powerful tools enabled for all uploaded documents
            </p>

            <div className="mt-4 space-y-3">
              <Link
                to="/chat"
                className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3 transition hover:border-blue-200 hover:bg-blue-50/50 dark:border-slate-800 dark:bg-slate-800/60 dark:hover:border-blue-900/50"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                  <MessageSquare className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    Grounded AI Chat
                  </p>
                  <p className="truncate text-[11px] text-slate-500">
                    Ask questions with page-level citations
                  </p>
                </div>
              </Link>

              <Link
                to="/notes"
                className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3 transition hover:border-emerald-200 hover:bg-emerald-50/50 dark:border-slate-800 dark:bg-slate-800/60 dark:hover:border-emerald-900/50"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    Study Notes Generator
                  </p>
                  <p className="truncate text-[11px] text-slate-500">
                    Synthesizes executive summaries & key concepts
                  </p>
                </div>
              </Link>

              <Link
                to="/mindmap"
                className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3 transition hover:border-purple-200 hover:bg-purple-50/50 dark:border-slate-800 dark:bg-slate-800/60 dark:hover:border-purple-900/50"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                  <Network className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    Concept Mind Maps
                  </p>
                  <p className="truncate text-[11px] text-slate-500">
                    Interactive expandable hierarchical graphs
                  </p>
                </div>
              </Link>

              <Link
                to="/extracted-data"
                className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3 transition hover:border-amber-200 hover:bg-amber-50/50 dark:border-slate-800 dark:bg-slate-800/60 dark:hover:border-amber-900/50"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                  <Database className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    Structured Data Extraction
                  </p>
                  <p className="truncate text-[11px] text-slate-500">
                    Dates, numbers, key entities & terms
                  </p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
