export const MAX_PDF_SIZE_BYTES = 80 * 1024 * 1024; // 83,886,080 bytes (80 MB)
export const MAX_PDF_SIZE_LABEL = '80 MB';

export type ThemeMode = 'light' | 'dark' | 'system';

export type PdfStatus = 'uploading' | 'queued' | 'processing' | 'extracting' | 'ocr_processing' | 'indexing' | 'ready' | 'failed';

export interface User {
  id: string;
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  emailVerified?: boolean;
  creationTime?: string;
  lastSignInTime?: string;
  phoneNumber?: string;
  isGuest?: boolean;
  isAnonymous?: boolean;
}

export interface PdfDocument {
  id: string;
  title: string;
  status: PdfStatus;
  uploadedAt: string;
  size: number;
  pages?: number;
  summary?: string;
  storagePath?: string;
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

export interface PdfIntelligence {
  documentId: string;
  overview: string;
  mainTopics: string[];
  keyConcepts: string[];
  importantKeywords: string[];
  importantDefinitions: Array<{ term: string; definition: string }>;
  documentStructure: Array<{ section: string; description: string }>;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced' | 'Comprehensive';
  pageCount: number;
  majorSections: string[];
  importantFacts: string[];
  studyRecommendations: string[];
  examConcepts: string[];
  suggestedQuestions: string[];
  suggestedNextActions: Array<'Generate Study Notes' | 'Ask AI' | 'Create Mind Map' | 'Practice Quiz'>;
  relatedConcepts: string[];
  updatedAt?: string;
}

export type QuizDifficulty = 'Easy' | 'Medium' | 'Hard';
export type QuizQuestionType = 'mcq' | 'true_false' | 'short_answer' | 'conceptual';

export interface QuizQuestion {
  id: string;
  type: QuizQuestionType;
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
}

export interface QuizRecord {
  id: string;
  documentId: string;
  documentName: string;
  createdAt: string;
  difficulty: QuizDifficulty;
  questionCount: number;
  score: number;
  percentage: number;
  questions: QuizQuestion[];
  userAnswers: Record<string, string>;
}
