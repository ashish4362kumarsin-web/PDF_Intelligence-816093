import { useEffect, useRef, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  FileText,
  LoaderCircle,
  MessageSquare,
  Plus,
  Send,
  Sparkles,
  Trash2,
  User as UserIcon,
  X,
  ChevronDown
} from 'lucide-react';
import { api } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import type { ChatMessage, ChatSession, PdfDocument } from '@/types';
import AiResponseRenderer from '@/components/AiResponseRenderer';

export default function ChatPage() {
  const { user, isGuest } = useAuth();
  const [searchParams] = useSearchParams();
  const location = useLocation();

  const initialDocId = location.state?.activeDocId || searchParams.get('doc') || '';

  const [documents, setDocuments] = useState<PdfDocument[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string>(initialDocId);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  // Drawers state
  const [conversationsDrawerOpen, setConversationsDrawerOpen] = useState(false);
  const [docDrawerOpen, setDocDrawerOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load documents
  useEffect(() => {
    let isMounted = true;
    api
      .getDocuments()
      .then((res) => {
        if (!isMounted) return;
        setDocuments(res.data);
        if (res.data.length > 0) {
          if (!selectedDocId || !res.data.some((d) => d.id === selectedDocId)) {
            setSelectedDocId(res.data[0].id);
          }
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load documents');
        }
      })
      .finally(() => {
        if (isMounted) setLoadingDocs(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Load conversation sessions for active document
  useEffect(() => {
    if (!selectedDocId) {
      setSessions([]);
      setCurrentSessionId('');
      setMessages([]);
      return;
    }

    let isMounted = true;
    api
      .getChats()
      .then((res) => {
        if (!isMounted) return;
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

    return () => {
      isMounted = false;
    };
  }, [selectedDocId]);

  // Load messages for active session
  useEffect(() => {
    if (!currentSessionId) {
      setMessages([]);
      return;
    }

    let isMounted = true;
    setLoadingMessages(true);
    api
      .getChatMessages(currentSessionId)
      .then((res) => {
        if (isMounted) setMessages(res.data);
      })
      .catch((err) => {
        if (isMounted) setError(err instanceof Error ? err.message : 'Failed to load messages');
      })
      .finally(() => {
        if (isMounted) setLoadingMessages(false);
      });

    return () => {
      isMounted = false;
    };
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
        api
          .getChats()
          .then((c) => setSessions(c.data.filter((s) => s.documentId === selectedDocId)));
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

  const handleNewConversation = () => {
    setCurrentSessionId('');
    setMessages([]);
    setConversationsDrawerOpen(false);
  };

  const selectedDoc = documents.find((d) => d.id === selectedDocId);

  return (
    <div className="relative flex h-[calc(100vh-8.5rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      
      {/* Top Drawer Controls Bar */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-slate-100 bg-slate-50/70 px-4 dark:border-slate-800 dark:bg-slate-900/80">
        
        {/* Left: Button for Conversation Drawer (slides Left -> Right) */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setConversationsDrawerOpen(true)}
            className="flex h-8 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            title="Open Conversations"
          >
            <MessageSquare className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            <span>Conversations</span>
            {sessions.length > 0 && (
              <span className="rounded-full bg-blue-50 px-1.5 py-0.2 text-[10px] font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                {sessions.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={handleNewConversation}
            className="flex h-8 items-center gap-1.5 rounded-xl border border-dashed border-slate-300 bg-white px-2.5 text-xs font-medium text-slate-600 transition hover:border-blue-400 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:text-blue-400"
            title="Start New Conversation"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">New</span>
          </button>
        </div>

        {/* Right: Target Document Drawer Button */}
        {/* Button appearance: two short parallel horizontal lines with curved corners, compact size, subtle border */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setDocDrawerOpen((prev) => !prev)}
            className={`flex h-8 items-center gap-2 rounded-xl border px-3 text-xs font-semibold shadow-sm transition ${
              docDrawerOpen
                ? 'border-blue-500 bg-blue-50 text-blue-800 dark:border-blue-500 dark:bg-blue-950/60 dark:text-blue-200'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
            }`}
            title="Target Document Options"
            aria-expanded={docDrawerOpen}
          >
            {/* Two short parallel horizontal lines with curved corners */}
            <div className="flex flex-col gap-1 w-3.5 items-center justify-center">
              <span className="h-0.5 w-full rounded-full bg-slate-600 dark:bg-slate-300" />
              <span className="h-0.5 w-full rounded-full bg-slate-600 dark:bg-slate-300" />
            </div>
            <span className="max-w-44 truncate">
              {selectedDoc ? selectedDoc.title : 'Select Document'}
            </span>
            <ChevronDown
              className={`h-3 w-3 text-slate-400 transition-transform ${
                docDrawerOpen ? 'rotate-180' : ''
              }`}
            />
          </button>
        </div>
      </div>

      {/* Target Document Drawer: Slides TOP → DOWN */}
      {docDrawerOpen && (
        <div className="border-b border-slate-200 bg-white p-4 shadow-lg transition-all animate-fade-in dark:border-slate-800 dark:bg-slate-900 z-10">
          <div className="mx-auto max-w-3xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  TARGET DOCUMENT
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDocDrawerOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                  Active Document
                </label>
                <select
                  value={selectedDocId}
                  onChange={(e) => {
                    setSelectedDocId(e.target.value);
                    setDocDrawerOpen(false);
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-medium text-slate-800 focus:border-blue-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  {documents.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.title} ({doc.pages || 1} pages)
                    </option>
                  ))}
                  {documents.length === 0 && <option value="">No documents available</option>}
                </select>
              </div>

              {selectedDoc && (
                <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 text-xs dark:border-slate-800 dark:bg-slate-800/40">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      Processing Status:
                    </span>
                    <span className="flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400 capitalize">
                      <CheckCircle2 className="h-3 w-3" />
                      {selectedDoc.status}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-slate-500 dark:text-slate-400">
                    <span>Pages:</span>
                    <span>{selectedDoc.pages || 1}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Conversation Drawer: Slides LEFT → RIGHT */}
      {conversationsDrawerOpen && (
        <div
          className="fixed inset-0 z-50 flex bg-slate-900/40 backdrop-blur-sm transition-opacity"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative flex h-full w-full max-w-sm flex-col border-r border-slate-200 bg-white shadow-2xl transition-transform animate-fade-in dark:border-slate-800 dark:bg-slate-900">
            {/* Drawer Header */}
            <div className="flex h-16 items-center justify-between border-b border-slate-200 px-5 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  CONVERSATIONS
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setConversationsDrawerOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* + New Conversation button */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={handleNewConversation}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-500"
              >
                <Plus className="h-4 w-4" />
                <span>New Conversation</span>
              </button>
            </div>

            {/* Conversation list */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
              {sessions.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No conversations yet for this document.
                </div>
              ) : (
                sessions.map((s) => {
                  const isSelected = currentSessionId === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setCurrentSessionId(s.id);
                        setConversationsDrawerOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-left text-xs transition ${
                        isSelected
                          ? 'bg-blue-600 font-semibold text-white shadow-sm'
                          : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate">{s.title || 'Untitled Chat'}</p>
                        {s.updatedAt && (
                          <p
                            className={`mt-0.5 text-[10px] ${
                              isSelected ? 'text-blue-100' : 'text-slate-400'
                            }`}
                          >
                            {new Date(s.updatedAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Chat Messages Panel (Full Width and Height) */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {messages.length === 0 && !loadingMessages && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20">
              <Sparkles className="h-7 w-7" />
            </div>
            <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white">
              Ask anything about your document
            </h3>
            <p className="mt-1 max-w-md text-xs text-slate-500 dark:text-slate-400">
              Get detailed answers with structured explanations, key facts, definitions, and citations.
            </p>

            {/* Suggestions */}
            <div className="mt-6 flex flex-wrap justify-center gap-2 max-w-lg">
              {[
                'Summarize the core takeaways of this document',
                'What are the key conclusions or recommendations?',
                'List any significant dates and milestones mentioned',
                'Explain the main methodology or concepts used'
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => handleSend(suggestion)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700 transition hover:border-blue-400 hover:bg-blue-50/60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-blue-600"
                >
                  "{suggestion}"
                </button>
              ))}
            </div>
          </div>
        )}

        {loadingMessages && (
          <div className="flex h-40 items-center justify-center">
            <LoaderCircle className="h-6 w-6 animate-spin text-blue-600 dark:text-blue-400" />
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
                <Bot className="h-4 w-4" />
              </div>
            )}

            <div
              className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'border border-slate-200/80 bg-slate-50/80 shadow-sm dark:border-slate-800 dark:bg-slate-850'
              }`}
            >
              {msg.role === 'user' ? (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              ) : (
                <AiResponseRenderer content={msg.content} />
              )}
            </div>

            {msg.role === 'user' && (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                <UserIcon className="h-4 w-4" />
              </div>
            )}
          </div>
        ))}

        {sending && (
          <div className="flex gap-3 justify-start">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">
              <Bot className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-medium text-slate-600 dark:border-slate-800 dark:bg-slate-850 dark:text-slate-300">
              <LoaderCircle className="h-4 w-4 animate-spin text-blue-600" />
              <span>Analyzing document and formulating structured response...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Error notification */}
      {error && (
        <div className="mx-4 mb-2 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
            <span>{error}</span>
          </div>
          <button type="button" onClick={() => setError('')} className="p-1 hover:text-red-900">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Input area */}
      <div className="shrink-0 border-t border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900 sm:p-4">
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
                ? `Ask anything about ${selectedDoc?.title || 'this PDF'}...`
                : 'Please select a document above'
            }
            className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
          <button
            type="submit"
            disabled={!inputMessage.trim() || sending || !selectedDocId}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-600/25 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            title="Send Message"
          >
            {sending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </form>
      </div>
    </div>
  );
}
