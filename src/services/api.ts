import { firebaseAuth } from './firebase';
import { firestoreService } from './firestoreService';
import { MAX_PDF_SIZE_BYTES, MAX_PDF_SIZE_LABEL } from '@/types';
import type {
  ChatMessage,
  ChatSession,
  DocumentExtractedData,
  MindMapNode,
  NoteItem,
  PdfDocument,
  PdfIntelligence,
  QuizRecord
} from '@/types';

/**
 * Resolves the centralized API base URL cleanly:
 * - If in browser on a deployed hostname (e.g. *.run.app) and env var points to localhost,
 *   we use relative '/api' to avoid Mixed Content / connection refused.
 * - If env var is '/api' or a valid remote HTTPS URL, uses it stripped of trailing slashes.
 */
export function getApiBaseUrl(): string {
  const envVal = (import.meta.env.VITE_API_BASE_URL || '').trim();

  if (typeof window !== 'undefined') {
    const isBrowserLocal =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1';

    // If browser is on deployed domain (Cloud Run, preview, etc.), ignore localhost/127.0.0.1
    if (!isBrowserLocal && (envVal.includes('localhost') || envVal.includes('127.0.0.1'))) {
      return '/api';
    }

    // If browser is on local but envVal points to port 8000 (control plane port, not app port 3000), use '/api'
    if (isBrowserLocal && envVal.includes(':8000')) {
      return '/api';
    }
  }

  if (envVal) {
    return envVal.replace(/\/+$/, '');
  }

  return '/api';
}

export function buildApiUrl(path: string): string {
  const base = getApiBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  // If base ends with /api and cleanPath starts with /api/, avoid duplication
  if (base.endsWith('/api') && cleanPath.startsWith('/api/')) {
    return `${base}${cleanPath.substring(4)}`;
  }
  // If base is an absolute root URL without /api and cleanPath does not have /api, prepend it
  if (!base.endsWith('/api') && !cleanPath.startsWith('/api')) {
    return `${base}/api${cleanPath}`;
  }

  return `${base}${cleanPath}`;
}

export async function authorizationHeaders(): Promise<Record<string, string>> {
  if (firebaseAuth?.currentUser) {
    try {
      const token = await firebaseAuth.currentUser.getIdToken();
      if (token) return { Authorization: `Bearer ${token}` };
    } catch (err) {
      console.warn('Failed to retrieve Firebase ID token:', err);
    }
  }
  return {};
}

/**
 * Validates a PDF file strictly on the frontend before any network call.
 */
export function validatePdfFile(file?: File | null): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'Please select a PDF file.' };
  }

  const name = file.name || '';
  const isPdfExt = name.toLowerCase().endsWith('.pdf');
  const isPdfMime = !file.type || file.type === 'application/pdf' || file.type === 'application/x-pdf';

  if (!isPdfExt || !isPdfMime) {
    return { valid: false, error: 'Only PDF files are supported.' };
  }

  if (file.size > MAX_PDF_SIZE_BYTES) {
    return { valid: false, error: `PDF is too large. Maximum allowed size is ${MAX_PDF_SIZE_LABEL}.` };
  }

  if (file.size === 0) {
    return { valid: false, error: 'The selected PDF file is empty (0 bytes).' };
  }

  return { valid: true };
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const authHeaders = await authorizationHeaders();
  const fullUrl = buildApiUrl(path);

  let response: Response;
  try {
    response = await fetch(fullUrl, {
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...(options.headers ?? {})
      },
      ...options
    });
  } catch (netErr) {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      throw new Error('Network failure: Your browser is currently offline. Please check your internet connection.');
    }
    throw new Error('Backend unavailable: Unable to reach the PDF Intelligence server. Please verify the server is running.');
  }

  if (!response.ok) {
    let errorMessage = `Request failed (${response.status})`;
    try {
      const errorPayload = await response.json();
      errorMessage = errorPayload.error || errorPayload.detail || errorPayload.message || errorMessage;
    } catch {
      try {
        const textPayload = await response.text();
        if (textPayload && textPayload.length < 200) {
          errorMessage = textPayload;
        }
      } catch {
        // default fallback
      }
    }
    throw new Error(errorMessage);
  }

  return (await response.json()) as T;
}

export interface UploadOptions {
  onProgress?: (percent: number, loadedBytes: number, totalBytes: number) => void;
  signal?: AbortSignal;
}

export const api = {
  health: () => request<{ status: string }>('/health'),
  getDocuments: () => request<{ data: PdfDocument[] }>('/pdfs'),
  searchDocuments: (query: string) =>
    request<{ data: { documentId: string; documentName: string; pageNumber?: number; snippet: string }[] }>(
      `/pdfs/search?q=${encodeURIComponent(query)}`
    ),
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
    request<{ data: { documentId: string; root: MindMapNode; updatedAt?: string } | null }>(
      `/mind-map/${encodeURIComponent(documentId)}`
    ),
  generateMindMap: (documentId: string) =>
    request<{ status: string; result: { documentId: string; root: MindMapNode; updatedAt?: string } }>(
      '/mind-map/generate',
      {
        method: 'POST',
        body: JSON.stringify({ document_id: documentId })
      }
    ),
  getPdfIntelligence: (documentId: string) =>
    request<{ data: PdfIntelligence | null }>(`/pdfs/${encodeURIComponent(documentId)}/intelligence`),
  generatePdfIntelligence: (documentId: string) =>
    request<{ status: string; data: PdfIntelligence }>(
      `/pdfs/${encodeURIComponent(documentId)}/intelligence/generate`,
      {
        method: 'POST'
      }
    ),
  generateQuiz: (payload: {
    document_id: string;
    question_count: number;
    difficulty: string;
    topic?: string;
    question_type?: string;
  }) =>
    request<{
      status: string;
      quiz: {
        documentId: string;
        documentName: string;
        difficulty: 'Easy' | 'Medium' | 'Hard';
        questionCount: number;
        questions: any[];
      };
    }>('/quiz/generate', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  saveQuizResult: (payload: QuizRecord) =>
    request<{ status: string; id: string }>('/quiz/save', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  getQuizHistory: (documentId?: string) =>
    request<{ data: QuizRecord[] }>(
      `/quiz/history${documentId ? `?documentId=${encodeURIComponent(documentId)}` : ''}`
    ),
  getQuizById: (quizId: string) =>
    request<{ data: QuizRecord | null }>(`/quiz/${encodeURIComponent(quizId)}`),
  createConversation: (payload: { document_id: string; title?: string }) =>
    request<{ status: string; session: ChatSession }>('/chat/conversations', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  deleteConversation: (sessionId: string) =>
    request<{ status: string }>(`/chat/conversations/${encodeURIComponent(sessionId)}`, {
      method: 'DELETE'
    }),
  deletePdf: (documentId: string) =>
    request<{ status: string; message: string }>(`/pdfs/${encodeURIComponent(documentId)}`, {
      method: 'DELETE'
    }),
  downloadPdf: async (documentId: string): Promise<Blob> => {
    const authHeaders = await authorizationHeaders();
    const downloadUrl = buildApiUrl(`/pdfs/${encodeURIComponent(documentId)}/download`);

    let response: Response;
    try {
      response = await fetch(downloadUrl, {
        headers: authHeaders
      });
    } catch {
      throw new Error('Network error: Unable to download PDF. Please check your connection.');
    }

    if (!response.ok) {
      const payload = await response.json().catch(() => ({ detail: 'Could not open this PDF' }));
      throw new Error(payload.error || payload.detail || 'Could not open this PDF');
    }
    return response.blob();
  },

  /**
   * PDF Upload with:
   * - Strict frontend validation (format, size up to 80MB)
   * - Authentication requirement check
   * - True multipart streaming
   * - Real progress tracking (0% -> 100%)
   * - Granular error mapping (no generic "Failed to fetch")
   */
  uploadPdf: async (
    fileOrFormData: File | FormData,
    options: UploadOptions = {}
  ): Promise<{ status: string; document: PdfDocument }> => {
    let file: File | null = null;
    let formData: FormData;

    if (fileOrFormData instanceof File) {
      file = fileOrFormData;
      const validation = validatePdfFile(file);
      if (!validation.valid) {
        throw new Error(validation.error);
      }
      formData = new FormData();
      formData.append('file', file, file.name);
    } else {
      formData = fileOrFormData;
      const candidate = formData.get('file');
      if (candidate instanceof File) {
        file = candidate;
        const validation = validatePdfFile(file);
        if (!validation.valid) {
          throw new Error(validation.error);
        }
      }
    }

    const authHeaders = await authorizationHeaders();
    if (!authHeaders.Authorization) {
      throw new Error('Please sign in before uploading a PDF.');
    }

    const uploadUrl = buildApiUrl('/pdfs/upload');

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', uploadUrl);

      // Generous 5 minute timeout for 80MB files
      xhr.timeout = 300000;

      // Set authorization headers
      for (const [key, value] of Object.entries(authHeaders)) {
        xhr.setRequestHeader(key, value);
      }

      // Track true upload progress
      if (xhr.upload && options.onProgress) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.min(100, Math.round((event.loaded / event.total) * 100));
            options.onProgress?.(percent, event.loaded, event.total);
          }
        };
      }

      // Handle signal abort
      if (options.signal) {
        options.signal.addEventListener('abort', () => {
          xhr.abort();
          reject(new Error('Upload was cancelled.'));
        });
      }

      xhr.onload = () => {
        const status = xhr.status;
        let responseJson: any = null;
        try {
          responseJson = JSON.parse(xhr.responseText);
        } catch {
          // not JSON
        }

        if (status >= 200 && status < 300) {
          if (options.onProgress) {
            options.onProgress(100, file?.size || 0, file?.size || 0);
          }
          resolve(responseJson || { status: 'success' });
          return;
        }

        if (status === 413) {
          reject(new Error(`PDF is too large. Maximum allowed size is ${MAX_PDF_SIZE_LABEL}.`));
          return;
        }

        if (status === 401) {
          reject(new Error('Please sign in before uploading a PDF.'));
          return;
        }

        if (status === 403) {
          reject(new Error(responseJson?.error || 'Access denied: You do not have permission to upload this file.'));
          return;
        }

        if (status === 400 || status === 422) {
          reject(new Error(responseJson?.error || responseJson?.detail || 'Only PDF files are supported.'));
          return;
        }

        if (status >= 500) {
          reject(new Error(responseJson?.error || `Server error (${status}) while uploading PDF. Please try again.`));
          return;
        }

        const msg = responseJson?.error || responseJson?.detail || responseJson?.message || `Upload failed (${status})`;
        reject(new Error(msg));
      };

      xhr.onerror = () => {
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          reject(new Error('Network failure: Your device appears offline. Please check your internet connection.'));
          return;
        }
        reject(
          new Error(
            'Backend unavailable: Unable to reach the PDF Intelligence server. Please verify your connection or refresh the page.'
          )
        );
      };

      xhr.ontimeout = () => {
        reject(new Error('Upload timed out. The server took too long to receive the file. Please try again.'));
      };

      xhr.send(formData);
    });
  }
};
