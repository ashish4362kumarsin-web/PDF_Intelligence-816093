export type ThemeMode = 'light' | 'dark' | 'system';

export type PdfStatus = 'uploading' | 'queued' | 'processing' | 'extracting' | 'ocr_processing' | 'indexing' | 'ready' | 'failed';

export interface User {
  id: string;
  email: string;
  displayName?: string;
  photoURL?: string;
}

export interface PdfDocument {
  id: string;
  title: string;
  status: PdfStatus;
  uploadedAt: string;
  size: number;
  pages?: number;
  summary?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export interface ChatSession {
  id: string;
  documentId: string;
  title: string;
  lastMessage?: string;
  updatedAt: string;
}

export interface NoteItem {
  id: string;
  title: string;
  body: string;
  updatedAt: string;
}

export interface ExtractedItem {
  id: string;
  title: string;
  type: 'heading' | 'fact' | 'table' | 'date' | 'number';
  value: string;
}

export interface ExtractedDataSet {
  headings: string[];
  names: string[];
  dates: string[];
  numbers: string[];
  key_facts: string[];
  terms: string[];
}

export interface DocumentExtractedData {
  documentId: string;
  data: ExtractedDataSet;
  updatedAt?: string;
}

export interface MindMapNode {
  id: string;
  label: string;
  children?: MindMapNode[];
}
