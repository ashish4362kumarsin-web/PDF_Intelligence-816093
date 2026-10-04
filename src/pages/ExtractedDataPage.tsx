import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  Calendar,
  Check,
  Copy,
  Database,
  Download,
  Hash,
  Heading,
  KeyRound,
  Lightbulb,
  LoaderCircle,
  Sparkles,
  Users
} from 'lucide-react';
import { api } from '@/services/api';
import type { DocumentExtractedData, ExtractedDataSet, PdfDocument } from '@/types';

export default function ExtractedDataPage() {
  const [searchParams] = useSearchParams();
  const initialDocId = searchParams.get('doc');

  const [documents, setDocuments] = useState<PdfDocument[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string>(initialDocId || '');
  const [extractedData, setExtractedData] = useState<ExtractedDataSet | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'facts' | 'dates' | 'numbers' | 'terms' | 'headings'>('all');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api.getDocuments()
      .then((res) => {
        setDocuments(res.data);
        if (res.data.length > 0) {
          const docId = selectedDocId && res.data.some((d) => d.id === selectedDocId)
            ? selectedDocId
            : res.data[0].id;
          setSelectedDocId(docId);
          loadExtractedData(docId);
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load documents'))
      .finally(() => setLoading(false));
  }, []);

  async function loadExtractedData(docId: string) {
    if (!docId) return;
    setError('');
    try {
      const res = await api.getExtractedData(docId);
      if (res.data?.data) {
        setExtractedData(res.data.data);
      } else {
        setExtractedData(null);
      }
    } catch {
      setExtractedData(null);
    }
  }

  async function handleGenerate() {
    if (!selectedDocId || generating) return;
    setGenerating(true);
    setError('');

    try {
      const res = await api.generateExtractedData(selectedDocId);
      if (res.result?.data) {
        setExtractedData(res.result.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to extract structured data');
    } finally {
      setGenerating(false);
    }
  }

  function handleCopy() {
    if (!extractedData) return;
    navigator.clipboard.writeText(JSON.stringify(extractedData, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownload() {
    if (!extractedData) return;
    const blob = new Blob([JSON.stringify(extractedData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `extracted-data-${selectedDocId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const selectedDoc = documents.find((d) => d.id === selectedDocId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Structured Data & Fact Extraction
          </h1>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            Unpack tabular statistics, dates, verified entities, and critical facts into categorized schemas.
          </p>
        </div>
      </div>

      {/* Control Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="w-full sm:max-w-md">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Select Document
            </label>
            <select
              value={selectedDocId}
              onChange={(e) => {
                setSelectedDocId(e.target.value);
                loadExtractedData(e.target.value);
              }}
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

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating || !selectedDocId}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-600/30 transition hover:bg-blue-700 disabled:opacity-50"
            >
              {generating ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Extracting Entities...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  {extractedData ? 'Re-extract Data' : 'Extract Data'}
                </>
              )}
            </button>

            {extractedData && (
              <>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? 'Copied' : 'Copy JSON'}
                </button>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <Download className="h-3.5 w-3.5" />
                  Export
                </button>
              </>
            )}
          </div>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Main Extracted View */}
      {extractedData ? (
        <div className="space-y-6">
          {/* Tabs */}
          <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3 dark:border-slate-800">
            {[
              { id: 'all', label: 'All Entities' },
              { id: 'facts', label: `Key Facts (${extractedData.key_facts?.length || 0})` },
              { id: 'dates', label: `Dates (${extractedData.dates?.length || 0})` },
              { id: 'numbers', label: `Numbers & Metrics (${extractedData.numbers?.length || 0})` },
              { id: 'terms', label: `Terms (${extractedData.terms?.length || 0})` },
              { id: 'headings', label: `Headings (${extractedData.headings?.length || 0})` }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Key Facts */}
            {(activeTab === 'all' || activeTab === 'facts') && (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                  <Lightbulb className="h-4 w-4 text-amber-500" />
                  <h3>Key Facts & Assertions</h3>
                </div>
                <div className="mt-4 space-y-2">
                  {extractedData.key_facts?.map((fact, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs text-slate-800 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-200"
                    >
                      {fact}
                    </div>
                  ))}
                  {(!extractedData.key_facts || extractedData.key_facts.length === 0) && (
                    <p className="text-xs text-slate-400">None detected</p>
                  )}
                </div>
              </div>
            )}

            {/* Dates & Milestones */}
            {(activeTab === 'all' || activeTab === 'dates') && (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                  <Calendar className="h-4 w-4 text-blue-500" />
                  <h3>Dates & Milestones</h3>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {extractedData.dates?.map((date, idx) => (
                    <span
                      key={idx}
                      className="rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-800 dark:border-blue-900 dark:bg-blue-950/60 dark:text-blue-300"
                    >
                      {date}
                    </span>
                  ))}
                  {(!extractedData.dates || extractedData.dates.length === 0) && (
                    <p className="text-xs text-slate-400">None detected</p>
                  )}
                </div>
              </div>
            )}

            {/* Numbers & Metrics */}
            {(activeTab === 'all' || activeTab === 'numbers') && (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                  <Hash className="h-4 w-4 text-emerald-500" />
                  <h3>Numbers, Statistics & Metrics</h3>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {extractedData.numbers?.map((num, idx) => (
                    <span
                      key={idx}
                      className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300"
                    >
                      {num}
                    </span>
                  ))}
                  {(!extractedData.numbers || extractedData.numbers.length === 0) && (
                    <p className="text-xs text-slate-400">None detected</p>
                  )}
                </div>
              </div>
            )}

            {/* Terms & Vocabulary */}
            {(activeTab === 'all' || activeTab === 'terms') && (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                  <KeyRound className="h-4 w-4 text-purple-500" />
                  <h3>Core Terminology & Concepts</h3>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {extractedData.terms?.map((term, idx) => (
                    <span
                      key={idx}
                      className="rounded-lg border border-purple-200 bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-800 dark:border-purple-900 dark:bg-purple-950/60 dark:text-purple-300"
                    >
                      {term}
                    </span>
                  ))}
                  {(!extractedData.terms || extractedData.terms.length === 0) && (
                    <p className="text-xs text-slate-400">None detected</p>
                  )}
                </div>
              </div>
            )}

            {/* Headings */}
            {(activeTab === 'all' || activeTab === 'headings') && (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:col-span-2">
                <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                  <Heading className="h-4 w-4 text-indigo-500" />
                  <h3>Document Outline & Headings</h3>
                </div>
                <div className="mt-4 space-y-1.5">
                  {extractedData.headings?.map((heading, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 dark:bg-slate-800/60 dark:text-slate-200"
                    >
                      <span className="text-slate-400">#{idx + 1}</span>
                      <span>{heading}</span>
                    </div>
                  ))}
                  {(!extractedData.headings || extractedData.headings.length === 0) && (
                    <p className="text-xs text-slate-400">None detected</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex h-80 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <Database className="h-12 w-12 text-slate-300 dark:text-slate-600" />
          <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white">
            No Structured Data Extracted Yet
          </h3>
          <p className="mt-1 max-w-sm text-xs text-slate-500">
            Click "Extract Data" above to parse all dates, numbers, facts, and definitions from {selectedDoc?.title || 'your PDF'}.
          </p>
        </div>
      )}
    </div>
  );
}
