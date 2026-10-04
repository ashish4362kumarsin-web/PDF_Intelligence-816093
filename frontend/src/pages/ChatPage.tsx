import { useEffect, useRef, useState } from 'react';
import { AlertCircle, Bot, LoaderCircle, Plus, SendHorizonal, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '@/services/api';
import type { ChatMessage, ChatSession, PdfDocument } from '@/types';
import MarkdownContent from '@/components/MarkdownContent';

export default function ChatPage() {
  const [documents, setDocuments] = useState<PdfDocument[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [documentId, setDocumentId] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const lastQuestion = useRef('');
  const messagesEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    async function loadWorkspace() {
      try {
        const [documentResult, chatResult] = await Promise.all([api.getDocuments(), api.getChats()]);
        if (!active) return;
        setDocuments(documentResult.data);
        setSessions(chatResult.data);
        if (chatResult.data[0]) {
          setSessionId(chatResult.data[0].id);
          setDocumentId(chatResult.data[0].documentId ?? '');
          setLoadingHistory(true);
          const history = await api.getChatMessages(chatResult.data[0].id);
          if (active) setMessages(history.data);
          if (active) setLoadingHistory(false);
        } else {
          setDocumentId(documentResult.data[0]?.id ?? '');
        }
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Could not load chat data.');
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadWorkspace();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ block: 'end' });
  }, [messages, sending]);

  async function selectSession(nextSessionId: string) {
    setSessionId(nextSessionId);
    setMessages([]);
    setError('');
    if (!nextSessionId) return;
    const selected = sessions.find((session) => session.id === nextSessionId);
    setDocumentId(selected?.documentId ?? '');
    setLoadingHistory(true);
    try {
      const result = await api.getChatMessages(nextSessionId);
      setMessages(result.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load this conversation.');
    } finally {
      setLoadingHistory(false);
    }
  }

  function startNewChat() {
    setSessionId('');
    setMessages([]);
    setError('');
  }

  async function sendMessage(text = question, appendQuestion = true) {
    const messageText = text.trim();
    if (!messageText || !documentId || sending) return;
    setError('');
    lastQuestion.current = messageText;
    if (appendQuestion) {
      setMessages((current) => [...current, {
        id: `local-${Date.now()}`,
        role: 'user',
        content: messageText,
        createdAt: new Date().toISOString()
      }]);
    }
    setQuestion('');
    setSending(true);
    try {
      const result = await api.sendChat({
        document_id: documentId,
        message: messageText,
        ...(sessionId ? { chat_session_id: sessionId } : {})
      });
      setSessionId(result.chat_session_id);
      setMessages((current) => [...current, {
        id: `local-${Date.now()}-answer`,
        role: 'assistant',
        content: result.message,
        createdAt: new Date().toISOString()
      }]);
      const updatedSessions = await api.getChats();
      setSessions(updatedSessions.data);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'The response could not be generated.');
      setQuestion(messageText);
    } finally {
      setSending(false);
    }
  }

  function handleComposerKey(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  }

  return (
    <div className="card flex h-[calc(100dvh-9rem)] min-h-[24rem] flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">AI Chat</h1>
          <p className="truncate text-sm text-slate-500 dark:text-slate-400">{documents.find((document) => document.id === documentId)?.title ?? 'Select a document'}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <select aria-label="Select a PDF" value={documentId} onChange={(event) => { setDocumentId(event.target.value); setSessionId(''); setMessages([]); }} className="hidden max-w-48 rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 sm:block">
            {documents.map((document) => <option key={document.id} value={document.id}>{document.title}</option>)}
          </select>
          <select aria-label="Select a saved chat" value={sessionId} onChange={(event) => void selectSession(event.target.value)} className="hidden max-w-40 rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 sm:block">
            <option value="">New conversation</option>
            {sessions.map((session) => <option key={session.id} value={session.id}>{session.title}</option>)}
          </select>
          <button type="button" onClick={startNewChat} aria-label="Start a new chat" className="min-h-10 rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"><Plus className="h-4 w-4" /></button>
        </div>
      </div>

      {documents.length > 0 && (
        <div className="space-y-2 border-b border-slate-200 px-4 py-2 dark:border-slate-800 sm:hidden">
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">Document
            <select value={documentId} onChange={(event) => { setDocumentId(event.target.value); setSessionId(''); setMessages([]); }} className="mt-1 min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
              {documents.map((document) => <option key={document.id} value={document.id}>{document.title}</option>)}
            </select>
          </label>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">Saved conversation
            <select value={sessionId} onChange={(event) => void selectSession(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
              <option value="">New conversation</option>
              {sessions.map((session) => <option key={session.id} value={session.id}>{session.title}</option>)}
            </select>
          </label>
        </div>
      )}

      <div className="flex-1 space-y-4 overflow-y-auto overscroll-contain p-4" aria-live="polite">
        {loading || loadingHistory ? <p className="text-sm text-slate-500 dark:text-slate-400" role="status">Loading conversation...</p> : documents.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <Bot className="h-8 w-8 text-blue-500" />
            <h2 className="mt-3 font-semibold text-slate-900 dark:text-slate-100">Upload a PDF to start</h2>
            <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">Answers are generated from text extracted from your own document.</p>
            <Link to="/library" className="mt-4 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white">Go to My PDFs</Link>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center px-2 text-center text-sm text-slate-500 dark:text-slate-400">Ask a question about the selected PDF to begin.</div>
        ) : messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[90%] whitespace-pre-wrap break-words rounded-2xl px-4 py-3 sm:max-w-[80%] ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-100'}`}>
              <div className="mb-2 flex items-center gap-2 text-xs opacity-75">
                {msg.role === 'user' ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                {msg.role === 'user' ? 'You' : 'PDF Intelligence'}
              </div>
              <MarkdownContent content={msg.content} />
            </div>
          </div>
        ))}

        {sending && <p className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400" role="status"><LoaderCircle className="h-4 w-4 animate-spin" />Analyzing the selected PDF...</p>}
        <div ref={messagesEnd} />
      </div>

      {error && <div role="alert" className="mx-3 mb-2 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200"><AlertCircle className="h-4 w-4 shrink-0" /><span className="flex-1">{error}</span><button type="button" disabled={sending || !lastQuestion.current} onClick={() => void sendMessage(lastQuestion.current, false)} className="font-semibold underline disabled:opacity-50">Retry</button></div>}

      <div className="border-t border-slate-200 p-3 dark:border-slate-800">
        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-900">
          <textarea
            aria-label="Chat message"
            rows={1}
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={handleComposerKey}
            disabled={!documentId || sending}
            className="max-h-32 min-h-10 flex-1 resize-y border-0 bg-transparent px-2 py-2 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none disabled:opacity-60 dark:text-slate-100"
            placeholder="Ask a question about this PDF..."
          />
          <button type="button" onClick={() => void sendMessage()} disabled={!documentId || !question.trim() || sending} aria-label="Send message" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl bg-blue-600 p-2.5 text-white disabled:cursor-not-allowed disabled:opacity-50">
            <SendHorizonal className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
