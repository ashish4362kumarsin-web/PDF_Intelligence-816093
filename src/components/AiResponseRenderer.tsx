import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  AlertTriangle,
  BookOpen,
  Check,
  Copy,
  Info,
  Lightbulb,
  Sparkles,
  HelpCircle,
  FileCode2
} from 'lucide-react';

interface AiResponseRendererProps {
  content: string;
  className?: string;
  allowCopy?: boolean;
}

export default function AiResponseRenderer({
  content,
  className = '',
  allowCopy = true
}: AiResponseRendererProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  if (!content || !content.trim()) {
    return <p className="text-sm italic text-slate-400">No content available.</p>;
  }

  return (
    <div className={`relative group/ai-renderer text-slate-800 dark:text-slate-200 ${className}`}>
      {allowCopy && (
        <div className="absolute right-0 top-0 opacity-0 group-hover/ai-renderer:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white/90 px-2.5 py-1 text-xs font-medium text-slate-600 shadow-sm backdrop-blur transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800/90 dark:text-slate-300 dark:hover:bg-slate-700"
            title="Copy response"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-emerald-600 dark:text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      )}

      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="mt-4 mb-3 text-xl font-bold tracking-tight text-slate-900 border-b border-slate-200 pb-1.5 dark:text-white dark:border-slate-800 first:mt-0">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mt-4 mb-2 text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 first:mt-0">
              <span className="h-4 w-1 rounded-full bg-blue-600 dark:bg-blue-400 shrink-0 inline-block" />
              <span>{children}</span>
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-3 mb-1.5 text-base font-semibold text-slate-800 dark:text-slate-200 first:mt-0">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="mt-2 mb-1 text-sm font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              {children}
            </h4>
          ),
          p: ({ children }) => {
            // Inspect children to detect educational prefixes
            const textContent = React.Children.toArray(children)
              .map((c) => (typeof c === 'string' ? c : ''))
              .join('');

            // Exam trap or warning callout
            if (/^(warning|exam trap|caution|danger|note of caution):/i.test(textContent.trim())) {
              return (
                <div className="my-3.5 flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50/70 p-3.5 text-sm text-amber-900 shadow-sm dark:border-amber-800/60 dark:bg-amber-950/25 dark:text-amber-200">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  <div className="leading-relaxed flex-1 font-medium">{children}</div>
                </div>
              );
            }

            // Definition callout
            if (/^(definition|defined as|key term):/i.test(textContent.trim())) {
              return (
                <div className="my-3.5 flex items-start gap-3 rounded-xl border border-indigo-200 bg-indigo-50/60 p-3.5 text-sm text-indigo-950 shadow-sm dark:border-indigo-900/50 dark:bg-indigo-950/25 dark:text-indigo-200">
                  <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
                  <div className="leading-relaxed flex-1">{children}</div>
                </div>
              );
            }

            // Key Fact / Important takeaway
            if (/^(key fact|important fact|key point|takeaway|summary point):/i.test(textContent.trim())) {
              return (
                <div className="my-3.5 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5 text-sm text-emerald-950 shadow-sm dark:border-emerald-900/50 dark:bg-emerald-950/25 dark:text-emerald-200">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <div className="leading-relaxed flex-1">{children}</div>
                </div>
              );
            }

            // Example callout
            if (/^(example|case study|illustration|practical example):/i.test(textContent.trim())) {
              return (
                <div className="my-3.5 flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50/60 p-3.5 text-sm text-sky-950 shadow-sm dark:border-sky-900/50 dark:bg-sky-950/25 dark:text-sky-200">
                  <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" />
                  <div className="leading-relaxed flex-1">{children}</div>
                </div>
              );
            }

            // Standard paragraph with readable typography and spacing
            return (
              <p className="my-2.5 text-sm leading-relaxed text-slate-700 dark:text-slate-300 last:mb-0">
                {children}
              </p>
            );
          },
          ul: ({ children }) => (
            <ul className="my-3 space-y-1.5 pl-5 text-sm text-slate-700 dark:text-slate-300 list-disc marker:text-blue-500 dark:marker:text-blue-400">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="my-3 space-y-1.5 pl-5 text-sm text-slate-700 dark:text-slate-300 list-decimal marker:font-semibold marker:text-slate-500 dark:marker:text-slate-400">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          strong: ({ children }) => (
            <strong className="font-semibold text-slate-900 dark:text-white">
              {children}
            </strong>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-3 border-l-4 border-blue-500 bg-blue-50/40 p-3.5 rounded-r-xl text-sm italic text-slate-700 dark:border-blue-400 dark:bg-blue-950/20 dark:text-slate-300">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="my-4 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-700 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {children}
            </tbody>
          ),
          tr: ({ children }) => (
            <tr className="transition hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
              {children}
            </tr>
          ),
          th: ({ children }) => <th className="px-4 py-2.5">{children}</th>,
          td: ({ children }) => <td className="px-4 py-2.5 align-top">{children}</td>,
          code: ({ className: codeClassName, children, ...props }) => {
            const isInline = !codeClassName && typeof children === 'string' && !children.includes('\n');
            if (isInline) {
              return (
                <code
                  className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-xs font-medium text-slate-800 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <div className="my-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-900 text-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/70 px-3.5 py-1.5 text-xs text-slate-400">
                  <span className="flex items-center gap-1.5 font-mono">
                    <FileCode2 className="h-3.5 w-3.5 text-blue-400" />
                    Code
                  </span>
                </div>
                <pre className="overflow-x-auto p-4 text-xs font-mono leading-relaxed">
                  <code>{children}</code>
                </pre>
              </div>
            );
          }
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
