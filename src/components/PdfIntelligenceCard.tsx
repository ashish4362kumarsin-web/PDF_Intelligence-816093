import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  BookOpen,
  MessageSquare,
  Network,
  HelpCircle,
  Clock,
  Layers,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  Tag,
  RefreshCw,
  LoaderCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import type { PdfDocument, PdfIntelligence } from '@/types';
import { api } from '@/services/api';
import AiResponseRenderer from './AiResponseRenderer';

interface PdfIntelligenceCardProps {
  document: PdfDocument | null;
  className?: string;
}

export default function PdfIntelligenceCard({
  document,
  className = ''
}: PdfIntelligenceCardProps) {
  const navigate = useNavigate();
  const [intelligence, setIntelligence] = useState<PdfIntelligence | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [expandedSection, setExpandedSection] = useState<'overview' | 'concepts' | 'exam' | 'all'>('all');

  useEffect(() => {
    if (!document?.id) {
      setIntelligence(null);
      setError('');
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError('');

    api
      .getPdfIntelligence(document.id)
      .then((res) => {
        if (isMounted) {
          setIntelligence(res.data);
        }
      })
      .catch((err) => {
        // If not generated yet, that's normal; user can click generate
        if (isMounted) {
          setIntelligence(null);
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [document?.id]);

  const handleGenerate = async () => {
    if (!document?.id) return;
    setGenerating(true);
    setError('');

    try {
      const res = await api.generatePdfIntelligence(document.id);
      setIntelligence(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not generate PDF intelligence');
    } finally {
      setGenerating(false);
    }
  };

  if (!document) {
    return (
      <div className={`rounded-2xl border border-dashed border-slate-300 bg-white/50 p-6 text-center dark:border-slate-800 dark:bg-slate-900/40 ${className}`}>
        <Sparkles className="mx-auto h-8 w-8 text-slate-400 mb-2" />
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          PDF Intelligence
        </h3>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Select or upload a PDF document to view deep intelligence and synthesized knowledge.
        </p>
      </div>
    );
  }

  const difficultyColors = {
    Beginner: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
    Intermediate: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
    Advanced: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
    Comprehensive: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800'
  };

  return (
    <section
      aria-label="PDF Intelligence"
      className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition dark:border-slate-800 dark:bg-slate-900 sm:p-6 ${className}`}
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              PDF Intelligence
              {intelligence?.difficulty && (
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${difficultyColors[intelligence.difficulty] || difficultyColors.Intermediate}`}>
                  {intelligence.difficulty}
                </span>
              )}
            </h2>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">
              {document.title} • {document.pages || 1} {document.pages === 1 ? 'page' : 'pages'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {intelligence && (
            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              title="Regenerate Intelligence"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${generating ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          )}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <LoaderCircle className="h-6 w-6 animate-spin text-blue-600 dark:text-blue-400 mb-2" />
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Analyzing document structure and intelligence...
          </p>
        </div>
      ) : intelligence ? (
        <div className="mt-5 space-y-6">
          {/* Overview */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
              Document Overview
            </h3>
            <div className="rounded-xl bg-slate-50 p-3.5 text-sm leading-relaxed text-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
              <AiResponseRenderer content={intelligence.overview} allowCopy={false} />
            </div>
          </div>

          {/* Main Topics & Key Concepts */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Main Topics */}
            {intelligence.mainTopics?.length > 0 && (
              <div className="rounded-xl border border-slate-100 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900/80">
                <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                  <Layers className="h-3.5 w-3.5 text-blue-500" />
                  Main Topics
                </h4>
                <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                  {intelligence.mainTopics.map((topic, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-blue-500 font-bold">•</span>
                      <span>{topic}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Key Concepts */}
            {intelligence.keyConcepts?.length > 0 && (
              <div className="rounded-xl border border-slate-100 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900/80">
                <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                  <Tag className="h-3.5 w-3.5 text-indigo-500" />
                  Key Concepts
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {intelligence.keyConcepts.map((concept, idx) => (
                    <span
                      key={idx}
                      className="rounded-lg bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300"
                    >
                      {concept}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Key Definitions */}
          {intelligence.importantDefinitions?.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
                Important Definitions
              </h3>
              <div className="space-y-2">
                {intelligence.importantDefinitions.map((item, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 text-xs dark:border-slate-800 dark:bg-slate-800/40"
                  >
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {item.term}:{' '}
                    </span>
                    <span className="text-slate-600 dark:text-slate-300">
                      {item.definition}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Exam / High-Yield Concepts */}
          {intelligence.examConcepts?.length > 0 && (
            <div className="rounded-xl border border-amber-200/80 bg-amber-50/50 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
              <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-200 mb-2">
                <Lightbulb className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                Exam-Relevant Concepts & Traps
              </h4>
              <ul className="space-y-1 text-xs text-amber-900/90 dark:text-amber-200/90">
                {intelligence.examConcepts.map((concept, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-amber-600 font-bold">▲</span>
                    <span>{concept}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommended Actions */}
          <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
              Recommended Next Actions
            </h4>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <button
                type="button"
                onClick={() => navigate('/notes', { state: { activeDocId: document.id } })}
                className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white p-3 text-center transition hover:border-blue-400 hover:bg-blue-50/50 dark:border-slate-800 dark:bg-slate-800/60 dark:hover:bg-slate-800"
              >
                <BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Study Notes
                </span>
              </button>

              <button
                type="button"
                onClick={() => navigate('/chat', { state: { activeDocId: document.id } })}
                className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white p-3 text-center transition hover:border-indigo-400 hover:bg-indigo-50/50 dark:border-slate-800 dark:bg-slate-800/60 dark:hover:bg-slate-800"
              >
                <MessageSquare className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Ask AI
                </span>
              </button>

              <button
                type="button"
                onClick={() => navigate('/mindmap', { state: { activeDocId: document.id } })}
                className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white p-3 text-center transition hover:border-emerald-400 hover:bg-emerald-50/50 dark:border-slate-800 dark:bg-slate-800/60 dark:hover:bg-slate-800"
              >
                <Network className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Mind Map
                </span>
              </button>

              <button
                type="button"
                onClick={() => navigate('/quiz', { state: { activeDocId: document.id } })}
                className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white p-3 text-center transition hover:border-amber-400 hover:bg-amber-50/50 dark:border-slate-800 dark:bg-slate-800/60 dark:hover:bg-slate-800"
              >
                <HelpCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Practice Quiz
                </span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-5 rounded-xl bg-slate-50 p-6 text-center dark:bg-slate-800/40">
          <Sparkles className="mx-auto h-7 w-7 text-blue-500 mb-2" />
          <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            Synthesize Intelligence
          </h4>
          <p className="mx-auto mt-1 max-w-md text-xs text-slate-500 dark:text-slate-400">
            Analyze this PDF for deep executive overview, main topics, key concepts, high-yield exam traps, and suggested study actions.
          </p>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-blue-600/20 transition hover:bg-blue-700 disabled:opacity-60"
          >
            {generating ? (
              <>
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Analyzing Document...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate PDF Intelligence
              </>
            )}
          </button>
        </div>
      )}
    </section>
  );
}
