import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  where
} from 'firebase/firestore';
import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytesResumable
} from 'firebase/storage';
import { db, storage } from './firebase';
import type {
  ChatMessage,
  ChatSession,
  DocumentExtractedData,
  ExtractedDataSet,
  MindMapNode,
  NoteItem,
  PdfDocument,
  PdfIntelligence,
  QuizRecord
} from '@/types';

/**
 * Real Firebase Cloud Firestore & Storage Service
 * Enforces strict per-user multi-tenant isolation under `users/{uid}/...`
 */
export const firestoreService = {
  // -------------------------------------------------------------
  // 1. Documents (PDFs)
  // -------------------------------------------------------------
  async saveDocument(
    uid: string,
    document: PdfDocument & { storagePath?: string; summary?: string }
  ): Promise<void> {
    if (!db || !uid) return;
    const docRef = doc(db, 'users', uid, 'documents', document.id);
    await setDoc(
      docRef,
      {
        id: document.id,
        ownerId: uid,
        title: document.title,
        status: document.status,
        uploadedAt: document.uploadedAt || new Date().toISOString(),
        size: document.size || 0,
        pages: document.pages || 1,
        storagePath: document.storagePath || '',
        summary: document.summary || ''
      },
      { merge: true }
    );
  },

  async getDocuments(uid: string): Promise<PdfDocument[]> {
    if (!db || !uid) return [];
    try {
      const colRef = collection(db, 'users', uid, 'documents');
      const q = query(colRef, orderBy('uploadedAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) => d.data() as PdfDocument);
    } catch (err) {
      console.warn('[Firestore] Error loading user documents:', err);
      // Fallback without orderBy if index is still propagating
      try {
        const colRef = collection(db, 'users', uid, 'documents');
        const snapshot = await getDocs(colRef);
        return snapshot.docs.map((d) => d.data() as PdfDocument);
      } catch {
        return [];
      }
    }
  },

  async deleteDocument(uid: string, docId: string): Promise<void> {
    if (!db || !uid || !docId) return;
    try {
      const docRef = doc(db, 'users', uid, 'documents', docId);
      await deleteDoc(docRef);
    } catch (err) {
      console.warn(`[Firestore] Failed to delete document ${docId}:`, err);
    }
  },

  // -------------------------------------------------------------
  // 2. Chat Sessions & Messages
  // -------------------------------------------------------------
  async saveChatSession(uid: string, session: ChatSession): Promise<void> {
    if (!db || !uid) return;
    const sessionRef = doc(db, 'users', uid, 'conversations', session.id);
    await setDoc(
      sessionRef,
      {
        id: session.id,
        ownerId: uid,
        documentId: session.documentId,
        title: session.title || 'Untitled Conversation',
        updatedAt: session.updatedAt || new Date().toISOString()
      },
      { merge: true }
    );
  },

  async getChatSessions(uid: string): Promise<ChatSession[]> {
    if (!db || !uid) return [];
    try {
      const colRef = collection(db, 'users', uid, 'conversations');
      const q = query(colRef, orderBy('updatedAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) => d.data() as ChatSession);
    } catch (err) {
      console.warn('[Firestore] Error loading conversations:', err);
      try {
        const colRef = collection(db, 'users', uid, 'conversations');
        const snapshot = await getDocs(colRef);
        return snapshot.docs.map((d) => d.data() as ChatSession);
      } catch {
        return [];
      }
    }
  },

  async deleteChatSession(uid: string, sessionId: string): Promise<void> {
    if (!db || !uid || !sessionId) return;
    try {
      const sessionRef = doc(db, 'users', uid, 'conversations', sessionId);
      await deleteDoc(sessionRef);
    } catch (err) {
      console.warn(`[Firestore] Error deleting conversation ${sessionId}:`, err);
    }
  },

  async saveChatMessage(
    uid: string,
    sessionId: string,
    message: ChatMessage
  ): Promise<void> {
    if (!db || !uid || !sessionId) return;
    const msgRef = doc(
      db,
      'users',
      uid,
      'conversations',
      sessionId,
      'messages',
      message.id
    );
    await setDoc(msgRef, {
      id: message.id,
      sessionId,
      ownerId: uid,
      role: message.role,
      content: message.content,
      createdAt: message.createdAt || new Date().toISOString()
    });
  },

  async getChatMessages(uid: string, sessionId: string): Promise<ChatMessage[]> {
    if (!db || !uid || !sessionId) return [];
    try {
      const colRef = collection(
        db,
        'users',
        uid,
        'conversations',
        sessionId,
        'messages'
      );
      const q = query(colRef, orderBy('createdAt', 'asc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) => d.data() as ChatMessage);
    } catch (err) {
      console.warn(`[Firestore] Error loading messages for ${sessionId}:`, err);
      try {
        const colRef = collection(
          db,
          'users',
          uid,
          'conversations',
          sessionId,
          'messages'
        );
        const snapshot = await getDocs(colRef);
        return snapshot.docs
          .map((d) => d.data() as ChatMessage)
          .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
      } catch {
        return [];
      }
    }
  },

  // -------------------------------------------------------------
  // 3. Study Notes
  // -------------------------------------------------------------
  async saveStudyNote(uid: string, note: NoteItem): Promise<void> {
    if (!db || !uid) return;
    const noteRef = doc(db, 'users', uid, 'studyNotes', note.id);
    await setDoc(
      noteRef,
      {
        id: note.id,
        ownerId: uid,
        documentId: note.documentId,
        title: note.title,
        body: note.body,
        updatedAt: note.updatedAt || new Date().toISOString()
      },
      { merge: true }
    );
  },

  async getStudyNotes(uid: string): Promise<NoteItem[]> {
    if (!db || !uid) return [];
    try {
      const colRef = collection(db, 'users', uid, 'studyNotes');
      const q = query(colRef, orderBy('updatedAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) => d.data() as NoteItem);
    } catch (err) {
      console.warn('[Firestore] Error loading study notes:', err);
      try {
        const colRef = collection(db, 'users', uid, 'studyNotes');
        const snapshot = await getDocs(colRef);
        return snapshot.docs.map((d) => d.data() as NoteItem);
      } catch {
        return [];
      }
    }
  },

  async deleteStudyNote(uid: string, noteId: string): Promise<void> {
    if (!db || !uid || !noteId) return;
    try {
      const noteRef = doc(db, 'users', uid, 'studyNotes', noteId);
      await deleteDoc(noteRef);
    } catch (err) {
      console.warn(`[Firestore] Error deleting study note ${noteId}:`, err);
    }
  },

  // -------------------------------------------------------------
  // 4. Mind Maps
  // -------------------------------------------------------------
  async saveMindMap(
    uid: string,
    documentId: string,
    root: MindMapNode
  ): Promise<void> {
    if (!db || !uid || !documentId) return;
    const mapRef = doc(db, 'users', uid, 'mindMaps', documentId);
    await setDoc(
      mapRef,
      {
        documentId,
        ownerId: uid,
        root,
        updatedAt: new Date().toISOString()
      },
      { merge: true }
    );
  },

  async getMindMap(
    uid: string,
    documentId: string
  ): Promise<{ documentId: string; root: MindMapNode; updatedAt?: string } | null> {
    if (!db || !uid || !documentId) return null;
    try {
      const mapRef = doc(db, 'users', uid, 'mindMaps', documentId);
      const snap = await getDoc(mapRef);
      if (snap.exists()) {
        const d = snap.data();
        return {
          documentId: d.documentId,
          root: d.root,
          updatedAt: d.updatedAt
        };
      }
    } catch (err) {
      console.warn(`[Firestore] Error loading mind map for ${documentId}:`, err);
    }
    return null;
  },

  // -------------------------------------------------------------
  // 5. Extracted Data
  // -------------------------------------------------------------
  async saveExtractedData(
    uid: string,
    documentId: string,
    data: ExtractedDataSet
  ): Promise<void> {
    if (!db || !uid || !documentId) return;
    const dataRef = doc(db, 'users', uid, 'extractedData', documentId);
    await setDoc(
      dataRef,
      {
        documentId,
        ownerId: uid,
        data,
        updatedAt: new Date().toISOString()
      },
      { merge: true }
    );
  },

  async getExtractedData(
    uid: string,
    documentId: string
  ): Promise<DocumentExtractedData | null> {
    if (!db || !uid || !documentId) return null;
    try {
      const dataRef = doc(db, 'users', uid, 'extractedData', documentId);
      const snap = await getDoc(dataRef);
      if (snap.exists()) {
        const d = snap.data();
        return {
          documentId: d.documentId,
          data: d.data,
          updatedAt: d.updatedAt
        };
      }
    } catch (err) {
      console.warn(`[Firestore] Error loading extracted data for ${documentId}:`, err);
    }
    return null;
  },

  // -------------------------------------------------------------
  // 6. PDF Intelligence & Synthesis
  // -------------------------------------------------------------
  async savePdfIntelligence(
    uid: string,
    documentId: string,
    intelligence: PdfIntelligence
  ): Promise<void> {
    if (!db || !uid || !documentId) return;
    const intelRef = doc(db, 'users', uid, 'intelligence', documentId);
    await setDoc(
      intelRef,
      {
        ...intelligence,
        documentId,
        ownerId: uid,
        updatedAt: new Date().toISOString()
      },
      { merge: true }
    );
  },

  async getPdfIntelligence(
    uid: string,
    documentId: string
  ): Promise<PdfIntelligence | null> {
    if (!db || !uid || !documentId) return null;
    try {
      const intelRef = doc(db, 'users', uid, 'intelligence', documentId);
      const snap = await getDoc(intelRef);
      if (snap.exists()) {
        return snap.data() as PdfIntelligence;
      }
    } catch (err) {
      console.warn(`[Firestore] Error loading intelligence for ${documentId}:`, err);
    }
    return null;
  },

  // -------------------------------------------------------------
  // 7. Quiz History
  // -------------------------------------------------------------
  async saveQuizRecord(uid: string, record: QuizRecord): Promise<void> {
    if (!db || !uid) return;
    const quizRef = doc(db, 'users', uid, 'quizHistory', record.id);
    await setDoc(
      quizRef,
      {
        ...record,
        ownerId: uid,
        savedAt: new Date().toISOString()
      },
      { merge: true }
    );
  },

  async getQuizHistory(uid: string, documentId?: string): Promise<QuizRecord[]> {
    if (!db || !uid) return [];
    try {
      const colRef = collection(db, 'users', uid, 'quizHistory');
      let q = query(colRef, orderBy('createdAt', 'desc'));
      if (documentId) {
        q = query(colRef, where('documentId', '==', documentId), orderBy('createdAt', 'desc'));
      }
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) => d.data() as QuizRecord);
    } catch (err) {
      console.warn('[Firestore] Error loading quiz history:', err);
      try {
        const colRef = collection(db, 'users', uid, 'quizHistory');
        const snapshot = await getDocs(colRef);
        const all = snapshot.docs.map((d) => d.data() as QuizRecord);
        if (documentId) {
          return all.filter((r) => r.documentId === documentId);
        }
        return all;
      } catch {
        return [];
      }
    }
  },

  // -------------------------------------------------------------
  // 8. Firebase Cloud Storage for PDF Files
  // -------------------------------------------------------------
  async uploadPdfFile(
    uid: string,
    docId: string,
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    if (!storage || !uid) return '';
    try {
      const safeFilename = file.name.replace(/[^\w\s.-]/g, '_');
      const storagePath = `users/${uid}/pdfs/${docId}/${safeFilename}`;
      const storageReference = ref(storage, storagePath);

      const uploadTask = uploadBytesResumable(storageReference, file, {
        contentType: 'application/pdf',
        customMetadata: {
          uid,
          docId,
          originalName: file.name
        }
      });

      return new Promise<string>((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            if (onProgress && snapshot.totalBytes > 0) {
              const pct = Math.round(
                (snapshot.bytesTransferred / snapshot.totalBytes) * 100
              );
              onProgress(pct);
            }
          },
          (uploadErr) => {
            console.warn('[Firebase Storage] Upload error:', uploadErr);
            // Non-fatal: the server already has the buffer
            resolve(storagePath);
          },
          async () => {
            try {
              const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
              resolve(downloadUrl || storagePath);
            } catch {
              resolve(storagePath);
            }
          }
        );
      });
    } catch (err) {
      console.warn('[Firebase Storage] Storage operation skipped:', err);
      return '';
    }
  }
};
