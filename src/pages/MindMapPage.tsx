import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Download,
  FolderTree,
  LoaderCircle,
  Maximize2,
  Minimize2,
  Network,
  Sparkles
} from 'lucide-react';
import { api } from '@/services/api';
import type { MindMapNode, PdfDocument } from '@/types';

function MindMapNodeItem({
  node,
  depth = 0,
  defaultExpanded = true
}: {
  node: MindMapNode;
  depth?: number;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const hasChildren = Boolean(node.children && node.children.length > 0);

  const colors = [
    'border-blue-500 bg-blue-50 text-blue-900 dark:border-blue-400 dark:bg-blue-950/70 dark:text-blue-100',
    'border-indigo-500 bg-indigo-50 text-indigo-900 dark:border-indigo-400 dark:bg-indigo-950/70 dark:text-indigo-100',
    'border-emerald-500 bg-emerald-50 text-emerald-900 dark:border-emerald-400 dark:bg-emerald-950/70 dark:text-emerald-100',
    'border-purple-500 bg-purple-50 text-purple-900 dark:border-purple-400 dark:bg-purple-950/70 dark:text-purple-100',
    'border-amber-500 bg-amber-50 text-amber-900 dark:border-amber-400 dark:bg-amber-950/70 dark:text-amber-100'
  ];

  const nodeColor = colors[depth % colors.length];

  return (
    <div className="relative my-2">
      <div className="flex items-center gap-2">
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
          >
            {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
        ) : (
          <div className="h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-600 ml-2 mr-2" />
        )}

        <div
          className={`rounded-xl border px-3 py-1.5 text-xs font-semibold shadow-sm transition hover:shadow ${nodeColor}`}
        >
          {node.label}
        </div>
      </div>

      {hasChildren && expanded && (
        <div className="ml-6 mt-1 border-l-2 border-slate-200 pl-4 space-y-1 dark:border-slate-700">
          {node.children!.map((child) => (
            <MindMapNodeItem key={child.id} node={child} depth={depth + 1} defaultExpanded={defaultExpanded} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function MindMapPage() {
  const [searchParams] = useSearchParams();
  const initialDocId = searchParams.get('doc');

  const [documents, setDocuments] = useState<PdfDocument[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string>(initialDocId || '');
  const [mindMap, setMindMap] = useState<MindMapNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [expandAll, setExpandAll] = useState(true);

  useEffect(() => {
    api.getDocuments()
      .then((res) => {
        setDocuments(res.data);
        if (res.data.length > 0) {
          const docId = selectedDocId && res.data.some((d) => d.id === selectedDocId)
            ? selectedDocId
            : res.data[0].id;
          setSelectedDocId(docId);
          loadMindMap(docId);
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load documents'))
      .finally(() => setLoading(false));
  }, []);

  async function loadMindMap(docId: string) {
    if (!docId) return;
    setError('');
    try {
      const res = await api.getMindMap(docId);
      if (res.data) {
        setMindMap(res.data.root);
      } else {
        setMindMap(null);
      }
    } catch {
      setMindMap(null);
    }
  }

  async function handleGenerateMindMap() {
    if (!selectedDocId || generating) return;
    setGenerating(true);
    setError('');

    try {
      const res = await api.generateMindMap(selectedDocId);
      if (res.result?.root) {
        setMindMap(res.result.root);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate mind map');
    } finally {
      setGenerating(false);
    }
  }

  function handleDownloadJson() {
    if (!mindMap) return;
    const blob = new Blob([JSON.stringify(mindMap, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mindmap-${selectedDocId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const selectedDoc = documents.find((d) => d.id === selectedDocId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Concept Mind Maps
          </h1>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            Synthesize interconnected document hierarchies into interactive, visual concept graphs.
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
                loadMindMap(e.target.value);
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
              onClick={handleGenerateMindMap}
              disabled={generating || !selectedDocId}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-600/30 transition hover:bg-blue-700 disabled:opacity-50"
            >
              {generating ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Generating Mind Map...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  {mindMap ? 'Regenerate Graph' : 'Generate Mind Map'}
                </>
              )}
            </button>

            {mindMap && (
              <>
                <button
                  type="button"
                  onClick={() => setExpandAll(!expandAll)}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  {expandAll ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                  {expandAll ? 'Collapse' : 'Expand'}
                </button>
                <button
                  type="button"
                  onClick={handleDownloadJson}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <Download className="h-3.5 w-3.5" />
                  Export JSON
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

      {/* Mind Map Canvas */}
      <div className="min-h-[450px] rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {mindMap ? (
          <div>
            <div className="mb-4 flex items-center gap-2 text-xs font-medium text-slate-500">
              <FolderTree className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span>Hierarchical Concept Tree for: <strong>{selectedDoc?.title}</strong></span>
            </div>
            <div className="overflow-x-auto p-2">
              <MindMapNodeItem key={`${mindMap.id}-${expandAll}`} node={mindMap} defaultExpanded={expandAll} />
            </div>
          </div>
        ) : (
          <div className="flex h-80 flex-col items-center justify-center text-center">
            <Network className="h-12 w-12 text-slate-300 dark:text-slate-600" />
            <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white">
              No Mind Map Generated Yet
            </h3>
            <p className="mt-1 max-w-sm text-xs text-slate-500">
              Click "Generate Mind Map" above to extract the core conceptual taxonomy from {selectedDoc?.title || 'your PDF'}.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
