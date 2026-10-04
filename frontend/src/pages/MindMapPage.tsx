import { useEffect, useState } from 'react';
import { AlertCircle, Minus, Plus, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '@/services/api';
import type { MindMapNode, PdfDocument } from '@/types';

function Node({ node, depth = 0 }: { node: MindMapNode; depth?: number }) {
  return (
    <div className="flex flex-col items-center">
      <div className={`max-w-64 break-words rounded-xl border px-3 py-2 text-center text-sm font-medium ${depth === 0 ? 'border-indigo-300 bg-indigo-100 text-indigo-950 dark:border-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-100' : depth === 1 ? 'border-blue-300 bg-blue-50 text-blue-950 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-100' : 'border-cyan-300 bg-cyan-50 text-cyan-950 dark:border-cyan-800 dark:bg-cyan-950/30 dark:text-cyan-100'}`}>
        {node.label}
      </div>
      {node.children && (
        <div className={`mt-4 flex flex-wrap justify-center gap-4 ${depth > 0 ? 'gap-2' : ''}`}>
          {node.children.map((child) => (
            <Node key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function MindMapPage() {
  const [documents, setDocuments] = useState<PdfDocument[]>([]);
  const [documentId, setDocumentId] = useState('');
  const [root, setRoot] = useState<MindMapNode | null>(null);
  const [zoom, setZoom] = useState(1);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
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
      setRoot(null);
      return;
    }
    let active = true;
    setLoading(true);
    setError('');
    api.getMindMap(documentId).then((result) => {
      if (active) setRoot(result.data?.root ?? null);
    }).catch((loadError: unknown) => {
      if (active) setError(loadError instanceof Error ? loadError.message : 'Could not load mind map.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [documentId]);

  async function generateMindMap() {
    if (!documentId || generating) return;
    setGenerating(true);
    setError('');
    try {
      const result = await api.generateMindMap(documentId);
      setRoot(result.result.root);
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : 'Mind map could not be generated.');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="card p-5">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Mind map</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Generate a navigable topic map from your document.</p>
      </div>

      {documents.length > 0 && <section className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
        <label className="min-w-0 flex-1 text-sm font-medium text-slate-700 dark:text-slate-200">Document
          <select value={documentId} onChange={(event) => setDocumentId(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900">
            {documents.map((document) => <option key={document.id} value={document.id}>{document.title}</option>)}
          </select>
        </label>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button type="button" aria-label="Zoom out" onClick={() => setZoom((value) => Math.max(0.6, value - 0.1))} className="min-h-11 min-w-11 rounded-lg border border-slate-200 p-2 dark:border-slate-700"><Minus className="mx-auto h-4 w-4" /></button>
          <span className="min-w-12 text-center text-sm text-slate-600 dark:text-slate-300">{Math.round(zoom * 100)}%</span>
          <button type="button" aria-label="Zoom in" onClick={() => setZoom((value) => Math.min(1.6, value + 0.1))} className="min-h-11 min-w-11 rounded-lg border border-slate-200 p-2 dark:border-slate-700"><Plus className="mx-auto h-4 w-4" /></button>
          <button type="button" onClick={() => void generateMindMap()} disabled={!documentId || generating} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"><Sparkles className="h-4 w-4" />{generating ? 'Generating...' : 'Generate'}</button>
        </div>
      </section>}

      {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}
      {loading ? <div className="card p-5 text-sm text-slate-500 dark:text-slate-400" role="status">Loading mind map...</div> : documents.length === 0 ? (
        <div className="card flex flex-col items-center px-5 py-12 text-center"><p className="font-semibold text-slate-900 dark:text-slate-100">No PDFs available</p><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Upload a document to generate a mind map from its content.</p><Link to="/library" className="mt-4 text-sm font-semibold text-blue-600 dark:text-blue-300">Go to My PDFs</Link></div>
      ) : root ? (
        <div className="card max-h-[70dvh] overflow-auto overscroll-contain p-5 sm:p-7">
          <div className="min-h-80 min-w-max p-4" style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}>
            <Node node={root} />
          </div>
        </div>
      ) : <div className="card flex flex-col items-center px-5 py-12 text-center"><p className="font-semibold text-slate-900 dark:text-slate-100">No mind map saved</p><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Generate a map from the selected PDF to see its topics and supporting concepts.</p></div>}
    </div>
  );
}
