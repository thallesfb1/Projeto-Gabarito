export type ExamType = 'multiple_choice' | 'true_false';

export type AppTheme = 'clean' | 'notebook' | 'dark';

export type AnswerOption = 'A' | 'B' | 'C' | 'D' | 'E' | 'V' | 'F';

export type SubjectColor = 'slate' | 'amber' | 'emerald' | 'blue' | 'violet' | 'rose' | 'cyan';

export interface ExtractedQuestion {
  number: number;
  statement: string;
  options: { label: AnswerOption; text: string }[];
  subject?: string;
  page?: number;
}

export interface SubjectRange {
  id: string;
  name: string;
  start: number; // questão inicial, base 1
  end: number; // questão final, base 1
  color: SubjectColor;
}

export interface ExamMetadata {
  templateId?: string;
  category?: string;
  organizer?: string;
  institution?: string;
  role?: string;
  year?: number;
  durationMinutes?: number;
  sourceLabel?: string;
}

export interface SourceDocument {
  path: string;
  ownerId: string;
  name: string;
  mime: string;
  size: number;
  kind: 'exam' | 'key';
  createdAt: string;
}

export interface StudyFlashcard {
  id: string;
  subject: string;
  topic: string;
  front: string;
  back: string;
  context?: string;
  explanation?: string;
  example?: string;
  pitfall?: string;
  questionNumbers: number[];
}

export interface FlashcardDeck {
  sourceKey: string;
  createdAt: string;
  cards: StudyFlashcard[];
  masteredCardIds: string[];
}

export interface SimuladoData {
  id: string;
  title: string;
  date: string;
  createdAt: string;
  updatedAt: string;
  totalQuestions: number;
  userAnswers: (AnswerOption | null)[];
  keyAnswers: (AnswerOption | null)[];
  flaggedQuestions: number[]; // índices marcados como dúvida/revisão
  isCorrected: boolean;
  timeSpentSeconds: number;
  notes?: string;
  isLocked?: boolean;
  isResultOutdated?: boolean;
  examType?: ExamType; // 'multiple_choice' (A-E) ou 'true_false' (V/F)
  subjectRanges?: SubjectRange[];
  examMetadata?: ExamMetadata;
  reviewedQuestionIndexes?: number[];
  extractedQuestions?: ExtractedQuestion[];
  sourceFileName?: string;
  sourceDocuments?: SourceDocument[];
  flashcardDeck?: FlashcardDeck;
  exampleData?: { user?: boolean; key?: boolean };
  [key: string]: any;
}

export interface MultiSimuladoStore {
  version: number;
  activeId: string;
  provas: SimuladoData[];
}

export interface FullBackupData {
  app: string;
  version: number;
  exportedAt: string;
  activeId: string;
  provas: SimuladoData[];
}

export interface StorageSnapshot {
  scope?: string;
  id: string;
  timestamp: string;
  reason: string;
  examCount: number;
  data: MultiSimuladoStore;
}

export interface StorageEstimateInfo {
  isIndexedDBAvailable: boolean;
  isPersisted: boolean;
  usageBytes: number;
  quotaBytes: number;
  usageFormatted: string;
  quotaFormatted: string;
  percentUsed: number;
}

export type FilterMode = 'all' | 'errors' | 'correct' | 'blank' | 'flagged';

export interface SimuladoStats {
  total: number;
  keyCount: number;
  withoutKeyCount: number;
  hits: number;
  misses: number;
  blanks: number;
  noKeyAnswered: number;
  noKeyBlank: number;
  userFilledCount: number;
  flaggedCount: number;
  percentage: number;
  percentageFormatted: string;
  isPartialKey: boolean;
  netScore?: number; // Para V/F (Padrão Cebraspe: Acertos - Erros)
}

export interface ParseResult {
  error?: string;
  results: (AnswerOption | null)[];
  count: number;
  mode: 'sequence' | 'numbered' | 'json';
  impliedTotal: number;
  rawMatched?: string[];
}

export interface SessionRecord {
  id: string;
  simuladoId: string;
  title: string;
  date: string;
  timestamp: string;
  totalQuestions: number;
  hits: number;
  misses: number;
  blanks: number;
  hitRatio: number;
  missRatio: number;
  ratio: number;
  examType?: ExamType;
  netScore?: number;
}

