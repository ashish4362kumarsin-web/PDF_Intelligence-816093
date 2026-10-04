import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  AlertCircle,
  Bot,
  Copy,
  FileText,
  LoaderCircle,
  MessageSquare,
  Plus,
  Send,
  Sparkles,
  User as UserIcon
} from 'lucide-react';
import { api } from '@/services/api';
import type { ChatMessage, ChatSession, PdfDocument } from '@/types';

export default function ChatPage() {
  const [searchParams] = useSearchParams();
  const initialDocId = searchParams.get('doc');

  const [documents, setDocuments] = useState<PdfDocument[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string>(initialDocId || '');
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.getDocuments()
      .then((res) => {
        setDocuments(res.data);
        if (res.data.length > 0) {
          if (!selectedDocId || !res.data.some((d) => d.id === selectedDocId)) {
            setSelectedDocId(res.data[0].id);
          }
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load documents'))
      .finally(() => setLoadingDocs(false));
  }, []);

  useEffect(() => {
    if (!selectedDocId) return;

    api.getChats()
      .then((res) => {
        const docSessions = res.data.filter((s) => s.documentId === selectedDocId);
        setSessions(docSessions);
        if (docSessions.length > 0) {
          setCurrentSessionId(docSessions[0].id);
        } else {
          setCurrentSessionId('');
          setMessages([]);
        }
      })
      .catch(() => {});
  }, [selectedDocId]);

  useEffect(() => {
    if (!currentSessionId) {
      setMessages([]);
      return;
    }

    setLoadingMessages(true);
    api.getChatMessages(currentSessionId)
      .then((res) => {
        setMessages(res.data);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load messages'))
      .finally(() => setLoadingMessages(false));
  }, [currentSessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  async function handleSend(customText?: string) {
    const textToSend = (customText || inputMessage).trim();
    if (!textToSend || !selectedDocId || sending) return;

    setInputMessage('');
    setError('');

    const tempUserMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: textToSend,
      createdAt: new Date().toISOString()
    };

    setMessages((prev) => [...prev, tempUserMsg]);
    setSending(true);

    try {
      const res = await api.sendChat({
        document_id: selectedDocId,
        message: textToSend,
        chat_session_id: currentSessionId || undefined
      });

      if (res.chat_session_id && res.chat_session_id !== currentSessionId) {
        setCurrentSessionId(res.chat_session_id);
        // refresh sessions
        api.getChats().then((c) => setSessions(c.data.filter((s) => s.documentId === selectedDocId)));
      }

      const assistantMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: res.message,
        createdAt: new Date().toISOString()
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate response');
    } finally {
      setSending(false);
    }
  }

  function handleCopy(content: string, id: string) {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  const selectedDoc = documents.find((d) => d.id === selectedDocId);

  return (
    <div className="flex h-[calc(100vh-8.5rem)] flex-col gap-4 lg:flex-row">
      {/* Sessions / Document Selector Panel */}
      <div className="flex w-full shrink-0 flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:w-72">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Target Document
        </label>
        <select
          value={selectedDocId}
          onChange={(e) => setSelectedDocId(e.target.value)}
          disabled={loadingDocs || documents.length === 0}
          className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm font-medium text-slate-800 outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
        >
          {documents.map((doc) => (
            <option key={doc.id} value={doc.id}>
              {doc.title}
            </option>
          ))}
          {documents.length === 0 && <option value="">No documents available</option>}
        </select>

        {selectedDoc && (
          <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-800/60 dark:text-slate-400">
            <p className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
              <FileText className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              {selectedDoc.title}
            </p>
            <p className="mt-1">
              Status: <span className="capitalize font-medium text-emerald-600 dark:text-emerald-400">{selectedDoc.status}</span>
            </p>
          </div>
        )}

        <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Conversations
          </span>
          <button
            type="button"
            onClick={() => {
              setCurrentSessionId('');
              setMessages([]);
            }}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/40"
          >
            <Plus className="h-3.5 w-3.5" />
            New
          </button>
        </div>

        <div className="mt-2 flex-1 overflow-y-auto space-y-1">
          {sessions.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setCurrentSessionId(s.id)}
              className={`w-full truncate rounded-xl px-3 py-2 text-left text-xs font-medium transition ${
                currentSessionId === s.id
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              {s.title}
            </button>
          ))}
          {sessions.length === 0 && (
            <p className="py-4 text-center text-xs text-slate-400">
              No previous chats for this document.
            </p>
          )}
        </div>
      </div>

      {/* Main Chat Panel */}
      <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {/* Messages container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {messages.length === 0 && !loadingMessages && (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
                <Sparkles className="h-7 w-7" />
              </div>
              <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white">
                Ask anything about your document
              </h3>
              <p className="mt-1 max-w-md text-xs text-slate-500">
                Get answers grounded directly in the text with factual explanations and page citations.
              </p>

              {/* Suggestions */}
              <div className="mt-6 flex flex-wrap justify-center gap-2 max-w-lg">
                {[
                  'Summarize the core takeaways of this document',
                  'What are the key conclusions or recommendations?',
                  'List any significant dates and milestones mentioned',
                  'Explain the main methodology used'
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => handleSend(suggestion)}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-blue-800"
                  >
                    "{suggestion}"
                  </button>
                ))}
              </div>
            </div>
          )}

          {loadingMessages && (
            <div className="flex h-40 items-center justify-center">
              <LoaderCircle className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-600/30">
                  <Bot className="h-4 w-4" />
                </div>
              )}

              <div
                className={`relative max-w-2xl rounded-2xl p-4 text-sm ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-none'
                    : 'border border-slate-100 bg-slate-50 text-slate-800 rounded-bl-none dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-200'
                }`}
              >
                {msg.role === 'assistant' && (
                  <button
                    type="button"
                    onClick={() => handleCopy(msg.content, msg.id)}
                    title="Copy message"
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                )}

                <div className="prose prose-sm dark:prose-invert max-w-none break-words">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {msg.content}
                  </ReactMarkdown>
                </div>
              </div>

              {msg.role === 'user' && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  <UserIcon className="h-4 w-4" />
                </div>
              )}
            </div>
          ))}

          {sending && (
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">
                <Bot className="h-4 w-4" />
              </div>
              <div className="flex items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-800">
                <LoaderCircle className="h-3.5 w-3.5 animate-spin text-blue-600" />
                <span>Reading document & synthesizing answer...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {error && (
          <div className="mx-4 mb-2 flex items-center gap-2 rounded-xl bg-red-50 p-2.5 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Input Bar */}
        <div className="border-t border-slate-200 p-4 dark:border-slate-800">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              disabled={sending || !selectedDocId}
              placeholder={
                selectedDocId
                  ? 'Ask a question about the document...'
                  : 'Please upload or select a document first'
              }
              className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
            <button
              type="submit"
              disabled={sending || !inputMessage.trim() || !selectedDocId}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-600/30 transition hover:bg-blue-700 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
