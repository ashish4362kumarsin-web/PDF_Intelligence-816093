import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  HelpCircle,
  Clock,
  Sparkles,
  BookOpen,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  RotateCcw,
  History,
  X,
  AlertCircle,
  LoaderCircle,
  FileText,
  ChevronRight,
  Trophy
} from 'lucide-react';
import type { PdfDocument, QuizDifficulty, QuizQuestion, QuizRecord } from '@/types';
import { api } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import AiResponseRenderer from '@/components/AiResponseRenderer';

export default function QuizPage() {
  const { user, isGuest } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [documents, setDocuments] = useState<PdfDocument[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string>('');
  const [loadingDocs, setLoadingDocs] = useState(true);

  // Configuration options
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [difficulty, setDifficulty] = useState<QuizDifficulty>('Medium');
  const [questionType, setQuestionType] = useState<string>('mcq');
  const [customTopic, setCustomTopic] = useState<string>('');

  // Active quiz state
  const [quizState, setQuizState] = useState<'config' | 'generating' | 'active' | 'results'>('config');
  const [activeQuestions, setActiveQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [activeQuizRecord, setActiveQuizRecord] = useState<QuizRecord | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // History Drawer state
  const [historyOpen, setHistoryOpen] = useState(false);
  const [quizHistory, setQuizHistory] = useState<QuizRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Load documents
  useEffect(() => {
    let isMounted = true;
    api
      .getDocuments()
      .then((res) => {
        if (!isMounted) return;
        setDocuments(res.data);
        const preferredId =
          location.state?.activeDocId ||
          (res.data.length > 0 ? res.data[0].id : '');
        setSelectedDocId(preferredId);
      })
      .catch((err) => {
        console.warn('Could not load documents for quiz:', err);
      })
      .finally(() => {
        if (isMounted) setLoadingDocs(false);
      });

    return () => {
      isMounted = false;
    };
  }, [location.state]);

  // Load Quiz History from Firestore
  const loadHistory = async () => {
    if (isGuest) {
      setQuizHistory([]);
      return;
    }
    setLoadingHistory(true);
    try {
      const res = await api.getQuizHistory();
      setQuizHistory(res.data || []);
    } catch (err) {
      console.warn('Could not load quiz history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [isGuest]);

  const selectedDoc = documents.find((d) => d.id === selectedDocId);

  // Start Generating Quiz
  const handleStartQuiz = async () => {
    if (!selectedDocId) {
      setErrorMessage('Please select a PDF document first.');
      return;
    }
    setErrorMessage('');
    setQuizState('generating');

    try {
      const res = await api.generateQuiz({
        document_id: selectedDocId,
        question_count: questionCount,
        difficulty,
        topic: customTopic.trim() || undefined,
        question_type: questionType
      });

      if (!res.quiz?.questions || res.quiz.questions.length === 0) {
        throw new Error('No quiz questions could be generated from this document.');
      }

      setActiveQuestions(res.quiz.questions);
      setCurrentQuestionIndex(0);
      setUserAnswers({});
      setActiveQuizRecord(null);
      setQuizState('active');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to generate quiz');
      setQuizState('config');
    }
  };

  // Submit Quiz
  const handleSubmitQuiz = async () => {
    let correctCount = 0;
    activeQuestions.forEach((q) => {
      const selected = userAnswers[q.id]?.trim().toLowerCase();
      const expected = q.correctAnswer?.trim().toLowerCase();
      if (selected === expected) {
        correctCount++;
      }
    });

    const percentage = Math.round((correctCount / activeQuestions.length) * 100);
    const newRecord: QuizRecord = {
      id: 'quiz_' + Date.now(),
      documentId: selectedDocId,
      documentName: selectedDoc?.title || 'Document Quiz',
      createdAt: new Date().toISOString(),
      difficulty,
      questionCount: activeQuestions.length,
      score: correctCount,
      percentage,
      questions: activeQuestions,
      userAnswers
    };

    setActiveQuizRecord(newRecord);
    setQuizState('results');

    // Persist to Firestore if user is authenticated
    if (!isGuest && user?.uid) {
      api.saveQuizResult(newRecord).catch((err) => {
        console.warn('Could not persist quiz history:', err);
      });
      setQuizHistory((prev) => [newRecord, ...prev]);
    }
  };

  const handleSelectOption = (questionId: string, option: string) => {
    setUserAnswers((prev) => ({
      ...prev,
      [questionId]: option
    }));
  };

  const currentQuestion = activeQuestions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === activeQuestions.length - 1;
  const answeredCount = Object.keys(userAnswers).length;

  return (
    <div className="relative min-h-[calc(100vh-8rem)]">
      {/* Quiz Top Action Bar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white shadow-md shadow-orange-500/20">
            <HelpCircle className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Quiz / Question Practice
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Interactive knowledge checks generated directly from your uploaded PDFs
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              loadHistory();
              setHistoryOpen(true);
            }}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <History className="h-4 w-4 text-slate-500 dark:text-slate-400" />
            <span>Quiz History</span>
            {quizHistory.length > 0 && (
              <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {quizHistory.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Error banner */}
      {errorMessage && (
        <div className="mb-6 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
          <span className="flex-1 font-medium">{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage('')}
            className="text-red-600 hover:text-red-800 dark:text-red-400"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* View 1: Configuration Form */}
      {quizState === 'config' && (
        <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Configure Your Practice Quiz
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Choose your source PDF and adjust questions, difficulty, and question format.
          </p>

          <div className="mt-6 space-y-6">
            {/* Document Selection */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Target PDF Document
              </label>
              {loadingDocs ? (
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  <span>Loading your documents...</span>
                </div>
              ) : documents.length === 0 ? (
                <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/60 p-4 text-xs text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/20 dark:text-amber-200">
                  <p className="font-semibold">No PDFs available in your library</p>
                  <p className="mt-1">
                    Please upload a PDF first to generate personalized quizzes.
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate('/library')}
                    className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500"
                  >
                    Go to PDF Library
                  </button>
                </div>
              ) : (
                <select
                  value={selectedDocId}
                  onChange={(e) => setSelectedDocId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-800 focus:border-blue-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  {documents.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.title} ({doc.pages || 1} pages)
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Number of Questions */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Number of Questions
              </label>
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {[5, 10, 20].map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setQuestionCount(count)}
                    className={`flex items-center justify-center rounded-xl border py-2.5 text-xs font-semibold transition ${
                      questionCount === count
                        ? 'border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-950/50 dark:text-blue-300 shadow-sm'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                    }`}
                  >
                    {count} Questions
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Difficulty Level
              </label>
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {(['Easy', 'Medium', 'Hard'] as QuizDifficulty[]).map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setDifficulty(level)}
                    className={`flex items-center justify-center rounded-xl border py-2.5 text-xs font-semibold transition ${
                      difficulty === level
                        ? 'border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-950/50 dark:text-blue-300 shadow-sm'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            {/* Question Type */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Question Type
              </label>
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {[
                  { id: 'mcq', label: 'Multiple Choice' },
                  { id: 'true_false', label: 'True / False' },
                  { id: 'conceptual', label: 'Conceptual / Mixed' }
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setQuestionType(t.id)}
                    className={`flex items-center justify-center rounded-xl border py-2.5 text-xs font-semibold transition ${
                      questionType === t.id
                        ? 'border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-950/50 dark:text-blue-300 shadow-sm'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Optional Topic / Focus */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Specific Topic / Focus Area (Optional)
              </label>
              <input
                type="text"
                value={customTopic}
                onChange={(e) => setCustomTopic(e.target.value)}
                placeholder="e.g. Chapter 3, Definitions, Formulas, Architecture..."
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>

            {/* Start Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleStartQuiz}
                disabled={!selectedDocId || documents.length === 0}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white shadow-md shadow-blue-600/25 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Sparkles className="h-4 w-4" />
                <span>Generate & Start Quiz</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View 2: Generating State */}
      {quizState === 'generating' && (
        <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <LoaderCircle className="mx-auto h-8 w-8 animate-spin text-blue-600 dark:text-blue-400 mb-3" />
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Generating Quiz Questions...
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Synthesizing concepts from{' '}
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {selectedDoc?.title || 'the selected PDF'}
            </span>
            ...
          </p>
        </div>
      )}

      {/* View 3: Active Interactive Quiz */}
      {quizState === 'active' && currentQuestion && (
        <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
          {/* Progress & Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                Question {currentQuestionIndex + 1} of {activeQuestions.length}
              </span>
              <p className="truncate text-xs text-slate-400 mt-0.5">
                {selectedDoc?.title} • {difficulty}
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {answeredCount}/{activeQuestions.length} answered
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className="h-full bg-blue-600 transition-all duration-300"
              style={{
                width: `${((currentQuestionIndex + 1) / activeQuestions.length) * 100}%`
              }}
            />
          </div>

          {/* Question Text */}
          <div className="my-6">
            <h3 className="text-base font-semibold leading-relaxed text-slate-900 dark:text-white sm:text-lg">
              {currentQuestion.question}
            </h3>
          </div>

          {/* Options (MCQ / True-False) */}
          {currentQuestion.options && currentQuestion.options.length > 0 ? (
            <div className="space-y-3">
              {currentQuestion.options.map((option, optIdx) => {
                const isSelected = userAnswers[currentQuestion.id] === option;
                return (
                  <button
                    key={optIdx}
                    type="button"
                    onClick={() => handleSelectOption(currentQuestion.id, option)}
                    className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left text-sm font-medium transition ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/70 text-blue-900 ring-2 ring-blue-600/30 dark:border-blue-500 dark:bg-blue-950/40 dark:text-blue-100'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-850 dark:text-slate-200 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        isSelected
                          ? 'bg-blue-600 text-white'
                          : 'border border-slate-300 text-slate-500 dark:border-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {String.fromCharCode(65 + optIdx)}
                    </span>
                    <span className="flex-1 leading-normal">{option}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Your Answer / Explanation:
              </label>
              <textarea
                rows={4}
                value={userAnswers[currentQuestion.id] || ''}
                onChange={(e) => handleSelectOption(currentQuestion.id, e.target.value)}
                placeholder="Type your explanation or answer here..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-sm text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
          )}

          {/* Navigation Controls */}
          <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-5 dark:border-slate-800">
            <button
              type="button"
              disabled={currentQuestionIndex === 0}
              onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Previous</span>
            </button>

            {isLastQuestion ? (
              <button
                type="button"
                onClick={handleSubmitQuiz}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/25 transition hover:bg-emerald-500"
              >
                <span>Submit Quiz</span>
                <CheckCircle2 className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() =>
                  setCurrentQuestionIndex((prev) =>
                    Math.min(activeQuestions.length - 1, prev + 1)
                  )
                }
                className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-blue-600/20 transition hover:bg-blue-500"
              >
                <span>Next</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* View 4: Results & Detailed Review */}
      {quizState === 'results' && activeQuizRecord && (
        <div className="mx-auto max-w-3xl space-y-6">
          {/* Score Header Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
            <div className="flex flex-col items-center text-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25">
                <Trophy className="h-7 w-7 text-amber-300" />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                Quiz Completed!
              </h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {activeQuizRecord.documentName} • {activeQuizRecord.difficulty}
              </p>

              {/* Score Display */}
              <div className="my-5 flex items-baseline gap-2">
                <span className="text-4xl font-extrabold text-blue-600 dark:text-blue-400">
                  {activeQuizRecord.score}
                </span>
                <span className="text-2xl font-bold text-slate-400">/</span>
                <span className="text-2xl font-bold text-slate-700 dark:text-slate-300">
                  {activeQuizRecord.questionCount}
                </span>
                <span className="ml-3 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  {activeQuizRecord.percentage}% Accuracy
                </span>
              </div>

              {/* Guest Warning */}
              {isGuest && (
                <div className="mt-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-900 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-200 dark:border-amber-900/50">
                  <p className="font-semibold">Guest Session Note</p>
                  <p className="mt-0.5">
                    Your quiz score was calculated, but history is not saved in guest mode.{' '}
                    <button
                      type="button"
                      onClick={() => navigate('/login')}
                      className="font-bold underline hover:text-amber-950 dark:hover:text-white"
                    >
                      Sign in
                    </button>{' '}
                    to save and track your quiz progress.
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setCurrentQuestionIndex(0);
                    setUserAnswers({});
                    setQuizState('active');
                  }}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Retake Quiz</span>
                </button>
                <button
                  type="button"
                  onClick={() => setQuizState('config')}
                  className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-blue-600/20 transition hover:bg-blue-500"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>New Quiz</span>
                </button>
              </div>
            </div>
          </div>

          {/* Detailed Question Review */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">
              Detailed Question Breakdown & Explanations
            </h3>

            <div className="space-y-6">
              {activeQuizRecord.questions.map((q, idx) => {
                const userAns = activeQuizRecord.userAnswers[q.id];
                const isCorrect =
                  userAns?.trim().toLowerCase() === q.correctAnswer?.trim().toLowerCase();

                return (
                  <div
                    key={q.id}
                    className={`rounded-2xl border p-5 transition ${
                      isCorrect
                        ? 'border-emerald-200/80 bg-emerald-50/20 dark:border-emerald-900/40 dark:bg-emerald-950/10'
                        : 'border-rose-200/80 bg-rose-50/20 dark:border-rose-900/40 dark:bg-rose-950/10'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {idx + 1}
                        </span>
                        <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                          {q.question}
                        </h4>
                      </div>
                      <div>
                        {isCorrect ? (
                          <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Correct
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                            <XCircle className="h-3.5 w-3.5" />
                            Incorrect
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                      <div className="rounded-xl bg-white p-3 border border-slate-100 dark:bg-slate-800/60 dark:border-slate-800">
                        <span className="block font-semibold uppercase tracking-wider text-slate-400 mb-0.5">
                          Your Answer:
                        </span>
                        <span
                          className={`font-medium ${
                            isCorrect
                              ? 'text-emerald-700 dark:text-emerald-300'
                              : 'text-rose-700 dark:text-rose-300 line-through'
                          }`}
                        >
                          {userAns || '(No answer provided)'}
                        </span>
                      </div>

                      <div className="rounded-xl bg-white p-3 border border-slate-100 dark:bg-slate-800/60 dark:border-slate-800">
                        <span className="block font-semibold uppercase tracking-wider text-slate-400 mb-0.5">
                          Correct Answer:
                        </span>
                        <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                          {q.correctAnswer}
                        </span>
                      </div>
                    </div>

                    {/* AI Explanation rendered via AiResponseRenderer */}
                    {q.explanation && (
                      <div className="mt-3 rounded-xl bg-slate-50 p-3.5 dark:bg-slate-800/40">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                          Educational Explanation:
                        </p>
                        <AiResponseRenderer content={q.explanation} allowCopy={false} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* History Drawer: Slides LEFT → RIGHT */}
      {historyOpen && (
        <div
          className="fixed inset-0 z-50 flex bg-slate-900/40 backdrop-blur-sm transition-opacity"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative flex h-full w-full max-w-md flex-col bg-white shadow-2xl transition-transform animate-fade-in dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800">
            {/* Header */}
            <div className="flex h-16 items-center justify-between border-b border-slate-200 px-6 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Quiz History
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setHistoryOpen(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loadingHistory ? (
                <div className="py-12 text-center">
                  <LoaderCircle className="mx-auto h-6 w-6 animate-spin text-blue-600" />
                  <p className="mt-2 text-xs text-slate-500">Loading quiz history...</p>
                </div>
              ) : isGuest ? (
                <div className="rounded-xl bg-amber-50 p-4 text-xs text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                  <p className="font-semibold">History Not Available in Guest Mode</p>
                  <p className="mt-1">
                    Sign in to an authenticated account to save and review past quizzes.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setHistoryOpen(false);
                      navigate('/login');
                    }}
                    className="mt-3 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500"
                  >
                    Sign In
                  </button>
                </div>
              ) : quizHistory.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  No completed quizzes found. Complete a quiz to see it here!
                </div>
              ) : (
                quizHistory.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      setActiveQuizRecord(item);
                      setQuizState('results');
                      setHistoryOpen(false);
                    }}
                    className="group cursor-pointer rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition hover:border-blue-400 hover:shadow-md dark:border-slate-800 dark:bg-slate-850 dark:hover:border-blue-500"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h4 className="truncate text-xs font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
                          {item.documentName}
                        </h4>
                        <p className="mt-0.5 text-[11px] text-slate-400">
                          {new Date(item.createdAt).toLocaleDateString()} • {item.difficulty}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                        {item.score}/{item.questionCount} ({item.percentage}%)
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
