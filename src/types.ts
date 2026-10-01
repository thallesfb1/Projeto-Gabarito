export type ExamType = 'multiple_choice' | 'true_false';

export type AppTheme = 'clean' | 'notebook';

export type AnswerOption = 'A' | 'B' | 'C' | 'D' | 'E' | 'V' | 'F';

export interface SimuladoQuestionAlternative {
  letter: AnswerOption;
  text: string;
}

export interface SimuladoQuestionItem {
  number: number;
  statement: string; // Enunciado da questão
  options?: SimuladoQuestionAlternative[]; // Alternativas A-E ou V/F
  officialAnswer?: AnswerOption | null; // Gabarito oficial se detectado
  explanation?: string | null; // Explicação breve da IA (1-2 frases sucintas)
  deepExplanation?: string | null; // Análise pedagógica aprofundada gerada sob demanda
  subject?: string | null; // Assunto ou disciplina (ex: Português, Direito)
  topic?: string | null; // Tópico específico da matéria (ex: Crase, Atos Administrativos)
  page?: number | null; // Página aproximada no PDF
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
  pdfFileName?: string;
  pdfImportedAt?: string;
  questions?: SimuladoQuestionItem[];
  flashcards?: Flashcard[];
  [key: string]: any;
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  topic: string;
  isFlipped?: boolean; // UI state
  sourceQuestionNumber?: number; // Para voltar à questão de origem
  reviewStatus?: 'pending' | 'learned'; // Lista de revisões
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

