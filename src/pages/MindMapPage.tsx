import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  Download,
  FolderTree,
  LoaderCircle,
  Maximize2,
  Minimize2,
  Network,
  RotateCcw,
  Sparkles,
  ZoomIn,
  ZoomOut,
  Layers,
  ChevronDown
} from 'lucide-react';
import { api } from '@/services/api';
import type { MindMapNode, PdfDocument } from '@/types';

interface LayoutNode {
  id: string;
  label: string;
  depth: number;
  colorIdx: number;
  x: number;
  y: number;
  width: number;
  height: number;
  children: LayoutNode[];
}

const BRANCH_COLORS = [
  {
    bg: 'bg-blue-500/10 dark:bg-blue-500/20',
    border: 'border-blue-400 dark:border-blue-500',
    text: 'text-blue-900 dark:text-blue-200',
    badge: 'bg-blue-600 text-white',
    line: '#3b82f6'
  },
  {
    bg: 'bg-indigo-500/10 dark:bg-indigo-500/20',
    border: 'border-indigo-400 dark:border-indigo-500',
    text: 'text-indigo-900 dark:text-indigo-200',
    badge: 'bg-indigo-600 text-white',
    line: '#6366f1'
  },
  {
    bg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
    border: 'border-emerald-400 dark:border-emerald-500',
    text: 'text-emerald-900 dark:text-emerald-200',
    badge: 'bg-emerald-600 text-white',
    line: '#10b981'
  },
  {
    bg: 'bg-amber-500/10 dark:bg-amber-500/20',
    border: 'border-amber-400 dark:border-amber-500',
    text: 'text-amber-900 dark:text-amber-200',
    badge: 'bg-amber-600 text-white',
    line: '#f59e0b'
  },
  {
    bg: 'bg-purple-500/10 dark:bg-purple-500/20',
    border: 'border-purple-400 dark:border-purple-500',
    text: 'text-purple-900 dark:text-purple-200',
    badge: 'bg-purple-600 text-white',
    line: '#a855f7'
  },
  {
    bg: 'bg-rose-500/10 dark:bg-rose-500/20',
    border: 'border-rose-400 dark:border-rose-500',
    text: 'text-rose-900 dark:text-rose-200',
    badge: 'bg-rose-600 text-white',
    line: '#f43f5e'
  }
];

export default function MindMapPage() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const initialDocId = location.state?.activeDocId || searchParams.get('doc') || '';

  const [documents, setDocuments] = useState<PdfDocument[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string>(initialDocId);
  const [mindMap, setMindMap] = useState<MindMapNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  // Zoom & Pan state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;
    api
      .getDocuments()
      .then((res) => {
        if (!isMounted) return;
        setDocuments(res.data);
        if (res.data.length > 0) {
          const docId =
            selectedDocId && res.data.some((d) => d.id === selectedDocId)
              ? selectedDocId
              : res.data[0].id;
          setSelectedDocId(docId);
          loadMindMap(docId);
        }
      })
      .catch((err) => {
        if (isMounted) setError(err instanceof Error ? err.message : 'Failed to load documents');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  async function loadMindMap(docId: string) {
    if (!docId) return;
    setError('');
    try {
      const res = await api.getMindMap(docId);
      if (res.data) {
        setMindMap(res.data.root);
        handleResetView();
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
        handleResetView();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate visual mind map');
    } finally {
      setGenerating(false);
    }
  }

  const handleZoomIn = () => setZoom((z) => Math.min(2.5, z + 0.15));
  const handleZoomOut = () => setZoom((z) => Math.max(0.4, z - 0.15));
  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleFitToScreen = () => {
    setZoom(0.85);
    setPan({ x: 0, y: 0 });
  };

  // Pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Compute Layout Tree
  // Non-overlapping hierarchical positioning
  function buildLayout(root: MindMapNode): {
    layoutRoot: LayoutNode;
    connections: Array<{ x1: number; y1: number; x2: number; y2: number; color: string }>;
    totalWidth: number;
    totalHeight: number;
  } {
    const LEVEL_HEIGHT = 160;
    const NODE_WIDTH = 220;
    const NODE_GAP = 30;

    // First calculate subtree widths
    function measureSubtree(node: MindMapNode): number {
      if (!node.children || node.children.length === 0) {
        return NODE_WIDTH;
      }
      let sum = 0;
      node.children.forEach((c) => {
        sum += measureSubtree(c) + NODE_GAP;
      });
      return Math.max(NODE_WIDTH, sum - NODE_GAP);
    }

    const totalWidth = Math.max(900, measureSubtree(root) + 120);
    const totalHeight = 700;

    const connections: Array<{ x1: number; y1: number; x2: number; y2: number; color: string }> = [];

    function positionNode(
      node: MindMapNode,
      depth: number,
      colorIdx: number,
      leftX: number,
      width: number
    ): LayoutNode {
      const centerX = leftX + width / 2;
      const centerY = 70 + depth * LEVEL_HEIGHT;
      const nodeWidth = depth === 0 ? 280 : depth === 1 ? 210 : 180;
      const nodeHeight = depth === 0 ? 64 : depth === 1 ? 52 : 46;

      const childrenNodes: LayoutNode[] = [];
      const children = node.children || [];

      if (children.length > 0) {
        const totalChildWidths = children.map((c) => measureSubtree(c));
        const totalWidthSum = totalChildWidths.reduce((a, b) => a + b, 0) + (children.length - 1) * NODE_GAP;

        let curX = leftX + (width - totalWidthSum) / 2;

        children.forEach((child, idx) => {
          const childW = totalChildWidths[idx];
          const childColor = depth === 0 ? idx % BRANCH_COLORS.length : colorIdx;
          const childNode = positionNode(child, depth + 1, childColor, curX, childW);
          childrenNodes.push(childNode);

          connections.push({
            x1: centerX,
            y1: centerY + nodeHeight / 2,
            x2: childNode.x + childNode.width / 2,
            y2: childNode.y - childNode.height / 2,
            color: BRANCH_COLORS[childColor % BRANCH_COLORS.length].line
          });

          curX += childW + NODE_GAP;
        });
      }

      return {
        id: node.id,
        label: node.label,
        depth,
        colorIdx,
        x: centerX - nodeWidth / 2,
        y: centerY - nodeHeight / 2,
        width: nodeWidth,
        height: nodeHeight,
        children: childrenNodes
      };
    }

    const layoutRoot = positionNode(root, 0, 0, 0, totalWidth);
    return { layoutRoot, connections, totalWidth, totalHeight };
  }

  const selectedDoc = documents.find((d) => d.id === selectedDocId);
  const layout = mindMap ? buildLayout(mindMap) : null;

  return (
    <div className="flex flex-col gap-4">
      {/* Top Action & Document Selector Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20">
            <Network className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
              Visual Mind Map
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Interactive geometric concept graph synthesized from document structure
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Document Picker */}
          <select
            value={selectedDocId}
            onChange={(e) => {
              setSelectedDocId(e.target.value);
              loadMindMap(e.target.value);
            }}
            disabled={loading || documents.length === 0}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            {documents.map((doc) => (
              <option key={doc.id} value={doc.id}>
                {doc.title}
              </option>
            ))}
            {documents.length === 0 && <option value="">No documents uploaded</option>}
          </select>

          {/* Generate Button */}
          <button
            type="button"
            onClick={handleGenerateMindMap}
            disabled={generating || !selectedDocId}
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-500 disabled:opacity-50"
          >
            {generating ? (
              <>
                <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                <span>{mindMap ? 'Regenerate' : 'Generate Mind Map'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
          <span className="flex-1 font-medium">{error}</span>
        </div>
      )}

      {/* Main Canvas View */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className={`relative h-[650px] w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/60 shadow-inner select-none dark:border-slate-800 dark:bg-[#080d19] ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
      >
        {/* Floating Zoom / Canvas Controls */}
        <div className="absolute right-4 top-4 z-20 flex items-center gap-1 rounded-xl border border-slate-200/90 bg-white/95 p-1 shadow-md backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
          <button
            type="button"
            onClick={handleZoomIn}
            className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            title="Zoom In"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            title="Zoom Out"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-0.5" />
          <button
            type="button"
            onClick={handleFitToScreen}
            className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            title="Fit to Screen"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleResetView}
            className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            title="Reset View"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <span className="px-2 text-[11px] font-mono font-medium text-slate-400">
            {Math.round(zoom * 100)}%
          </span>
        </div>

        {/* Legend / Info badge */}
        <div className="absolute left-4 bottom-4 z-20 hidden sm:flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white/90 px-3 py-1.5 text-[11px] text-slate-500 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-400">
          <span className="font-semibold text-slate-700 dark:text-slate-200">Interactive Controls:</span>
          <span>Click & Drag to pan</span>
          <span>•</span>
          <span>Zoom in/out to explore branches</span>
        </div>

        {/* Loading overlay */}
        {generating && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm dark:bg-slate-950/80">
            <LoaderCircle className="h-9 w-9 animate-spin text-blue-600 dark:text-blue-400 mb-2" />
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Generating Visual Mind Map...
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Analyzing structural hierarchies and topic relations
            </p>
          </div>
        )}

        {/* Empty state */}
        {!mindMap && !loading && !generating && (
          <div className="flex h-full flex-col items-center justify-center text-center p-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 mb-3">
              <Network className="h-7 w-7" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              No Mind Map Generated Yet
            </h3>
            <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
              Transform{' '}
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {selectedDoc?.title || 'this PDF'}
              </span>{' '}
              into an intuitive, non-overlapping geometric knowledge graph.
            </p>
            <button
              type="button"
              onClick={handleGenerateMindMap}
              disabled={!selectedDocId}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-blue-600/20 transition hover:bg-blue-500 disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4" />
              <span>Generate Mind Map</span>
            </button>
          </div>
        )}

        {/* Visual Map Render Container */}
        {layout && (
          <div
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: 'top center',
              transition: isDragging ? 'none' : 'transform 0.15s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
            className="absolute left-1/2 -translate-x-1/2 top-10 pointer-events-auto"
          >
            <div
              style={{
                width: layout.totalWidth,
                height: layout.totalHeight
              }}
              className="relative"
            >
              {/* SVG Connecting Bezier Lines */}
              <svg
                className="absolute inset-0 pointer-events-none"
                style={{ width: layout.totalWidth, height: layout.totalHeight }}
              >
                {layout.connections.map((c, i) => {
                  const midY = (c.y1 + c.y2) / 2;
                  const path = `M ${c.x1} ${c.y1} C ${c.x1} ${midY}, ${c.x2} ${midY}, ${c.x2} ${c.y2}`;
                  return (
                    <g key={i}>
                      <path
                        d={path}
                        fill="none"
                        stroke={c.color}
                        strokeWidth="2.5"
                        strokeOpacity="0.45"
                        strokeLinecap="round"
                      />
                      <circle cx={c.x2} cy={c.y2} r="3" fill={c.color} />
                    </g>
                  );
                })}
              </svg>

              {/* Render Geometric Nodes recursively */}
              {function renderNode(node: LayoutNode) {
                const colorConfig = BRANCH_COLORS[node.colorIdx % BRANCH_COLORS.length];

                return (
                  <React.Fragment key={node.id}>
                    {/* Node Card */}
                    <div
                      style={{
                        position: 'absolute',
                        left: node.x,
                        top: node.y,
                        width: node.width,
                        minHeight: node.height
                      }}
                      className={`flex items-center justify-center text-center transition-all ${
                        node.depth === 0
                          ? 'rounded-3xl bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-600 text-white shadow-xl shadow-blue-500/30 ring-4 ring-blue-500/20 px-5 py-3'
                          : node.depth === 1
                          ? `rounded-2xl border-2 ${colorConfig.border} ${colorConfig.bg} ${colorConfig.text} shadow-md px-3.5 py-2.5 backdrop-blur font-semibold text-xs`
                          : `rounded-xl border ${colorConfig.border} bg-white dark:bg-slate-900 ${colorConfig.text} shadow-sm px-3 py-1.5 text-[11px] font-medium`
                      }`}
                    >
                      <div className="line-clamp-2 leading-snug">
                        {node.depth === 0 ? (
                          <span className="text-sm font-extrabold uppercase tracking-wide">
                            {node.label}
                          </span>
                        ) : (
                          <span>{node.label}</span>
                        )}
                      </div>
                    </div>

                    {/* Children */}
                    {node.children.map((child) => renderNode(child))}
                  </React.Fragment>
                );
              }(layout.layoutRoot)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
