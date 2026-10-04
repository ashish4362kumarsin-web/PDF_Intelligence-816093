import { useEffect, useState } from 'react';
import { AlertCircle, FileSearch, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '@/services/api';
import type { ExtractedDataSet, PdfDocument } from '@/types';

const categories: Array<{ key: keyof ExtractedDataSet; label: string }> = [
  { key: 'headings', label: 'Headings' },
  { key: 'names', label: 'Names' },
  { key: 'dates', label: 'Dates' },
  { key: 'numbers', label: 'Numbers' },
  { key: 'key_facts', label: 'Key facts' },
  { key: 'terms', label: 'Important terms' }
];

export default function ExtractedDataPage() {
  const [documents, setDocuments] = useState<PdfDocument[]>([]);
  const [documentId, setDocumentId] = useState('');
  const [data, setData] = useState<ExtractedDataSet | null>(null);
  const [loading, setLoading] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api.getDocuments().then((result) => {
      if (!active) return;
      setDocuments(result.data);
      setDocumentId(result.data[0]?.id ?? '');
      setLoading(false);
    }).catch((loadError: unknown) => {
      if (active) {
        setError(loadError instanceof Error ? loadError.message : 'Could not load documents.');
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!documentId) {
      setData(null);
      return;
    }
    let active = true;
    setLoading(true);
    setError('');
    api.getExtractedData(documentId).then((result) => {
      if (active) setData(result.data?.data ?? null);
    }).catch((loadError: unknown) => {
      if (active) setError(loadError instanceof Error ? loadError.message : 'Could not load extracted data.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [documentId]);

  async function generateData() {
    if (!documentId || extracting) return;
    setExtracting(true);
    setError('');
    try {
      const result = await api.generateExtractedData(documentId);
      setData(result.result.data);
    } catch (extractError) {
      setError(extractError instanceof Error ? extractError.message : 'Could not extract document data.');
    } finally {
      setExtracting(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="card p-5">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Extracted data</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Structured information extracted from the selected document.</p>
      </div>

      {documents.length > 0 && <section className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
        <label className="min-w-0 flex-1 text-sm font-medium text-slate-700 dark:text-slate-200">Document
          <select value={documentId} onChange={(event) => setDocumentId(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900">
            {documents.map((document) => <option key={document.id} value={document.id}>{document.title}</option>)}
          </select>
        </label>
        <button type="button" onClick={() => void generateData()} disabled={!documentId || extracting} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60">
          <Sparkles className="h-4 w-4" />{extracting ? 'Extracting...' : 'Extract data'}
        </button>
      </section>}

      {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{error}</span></div>}
      {loading ? <div className="card p-5 text-sm text-slate-500 dark:text-slate-400" role="status">Loading document data...</div> : documents.length === 0 ? (
        <div className="card flex flex-col items-center px-5 py-12 text-center"><FileSearch className="h-8 w-8 text-slate-400" /><h2 className="mt-3 font-semibold text-slate-900 dark:text-slate-100">No PDFs available</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Upload a document before extracting information.</p><Link to="/library" className="mt-4 text-sm font-semibold text-blue-600 dark:text-blue-300">Go to My PDFs</Link></div>
      ) : data === null ? (
        <div className="card flex flex-col items-center px-5 py-12 text-center"><FileSearch className="h-8 w-8 text-slate-400" /><h2 className="mt-3 font-semibold text-slate-900 dark:text-slate-100">No extracted data yet</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Extracted values will appear here after analysis.</p></div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {categories.map(({ key, label }) => (
            <section key={key} className="card min-w-0 p-4">
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</h2>
              {data[key].length ? <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{data[key].map((value, index) => <li key={`${key}-${index}`} className="break-words">{value}</li>)}</ul> : <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">No {label.toLowerCase()} found in this document.</p>}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
