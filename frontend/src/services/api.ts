import { firebaseAuth } from './firebase';
import type { ChatMessage, ChatSession, DocumentExtractedData, MindMapNode, NoteItem, PdfDocument } from '@/types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api';

async function authorizationHeaders(): Promise<Record<string, string>> {
  const token = await firebaseAuth?.currentUser?.getIdToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const authHeaders = await authorizationHeaders();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...(options.headers ?? {})
    },
    ...options
  });

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(errorPayload.detail ?? 'Request failed');
  }

  return (await response.json()) as T;
}

export const api = {
  health: () => request<{ status: string }>('health'),
  getDocuments: () => request<{ data: PdfDocument[] }>('/pdfs'),
  searchDocuments: (query: string) => request<{ data: { documentId: string; documentName: string; pageNumber?: number; snippet: string }[] }>(`/pdfs/search?q=${encodeURIComponent(query)}`),
  getChats: () => request<{ data: ChatSession[] }>('/chat'),
  getChatMessages: (sessionId: string) =>
    request<{ data: ChatMessage[] }>(`/chat/${encodeURIComponent(sessionId)}/messages`),
  getNotes: () => request<{ data: NoteItem[] }>('/notes'),
  getSettings: () => request<{ data: Record<string, unknown> }>('/settings'),
  updateSettings: (payload: { theme?: 'light' | 'dark' | 'system' }) =>
    request<{ status: string; data: Record<string, unknown> }>('/settings', {
      method: 'PUT',
      body: JSON.stringify(payload)
    }),
  sendChat: (payload: { document_id: string; message: string; chat_session_id?: string }) =>
    request<{ message: string; chat_session_id: string }>('/chat', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  generateNotes: (payload: { document_id: string; scope?: string }) =>
    request<{ status: string; note: NoteItem }>('/notes/generate', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  getExtractedData: (documentId: string) =>
    request<{ data: DocumentExtractedData | null }>(`/extracted-data/${encodeURIComponent(documentId)}`),
  generateExtractedData: (documentId: string) =>
    request<{ status: string; result: DocumentExtractedData }>('/extracted-data/generate', {
      method: 'POST',
      body: JSON.stringify({ document_id: documentId })
    }),
  getMindMap: (documentId: string) =>
    request<{ data: { documentId: string; root: MindMapNode; updatedAt?: string } | null }>(`/mind-map/${encodeURIComponent(documentId)}`),
  generateMindMap: (documentId: string) =>
    request<{ status: string; result: { documentId: string; root: MindMapNode; updatedAt?: string } }>('/mind-map/generate', {
      method: 'POST',
      body: JSON.stringify({ document_id: documentId })
    }),
  deletePdf: (documentId: string) =>
    request<{ status: string; message: string }>(`/pdfs/${encodeURIComponent(documentId)}`, {
      method: 'DELETE'
    }),
  downloadPdf: async (documentId: string): Promise<Blob> => {
    const response = await fetch(`${API_BASE_URL}/pdfs/${encodeURIComponent(documentId)}/download`, {
      headers: await authorizationHeaders()
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({ detail: 'Could not open this PDF' }));
      throw new Error(payload.detail ?? 'Could not open this PDF');
    }
    return response.blob();
  },
  uploadPdf: async (formData: FormData) => {
    const authHeaders = await authorizationHeaders();
    const response = await fetch(`${API_BASE_URL}/pdfs/upload`, {
      method: 'POST',
      headers: authHeaders,
      body: formData
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({ detail: 'Upload failed' }));
      throw new Error(payload.detail ?? 'Upload failed');
    }

    return response.json();
  }
};
