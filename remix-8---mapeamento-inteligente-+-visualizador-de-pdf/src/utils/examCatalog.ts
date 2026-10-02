import {
  ExamMetadata,
  ExamType,
  SimuladoData,
  SubjectColor,
  SubjectRange,
} from '../types';

export interface ExamBlueprint {
  id: string;
  title: string;
  shortTitle: string;
  category: 'Concursos' | 'Vestibulares' | 'OAB' | 'Revisão';
  organizer: string;
  questions: number;
  examType: ExamType;
  durationMinutes: number;
  description: string;
  highlight: string;
  tags: string[];
  subjectRanges: Omit<SubjectRange, 'id'>[];
}

export interface SubjectPerformance {
  id: string;
  name: string;
  color: SubjectColor;
  total: number;
  answered: number;
  hits: number;
  misses: number;
  blanks: number;
  evaluated: number;
  percentage: number;
}

export interface AggregatedSubjectPerformance extends SubjectPerformance {
  examCount: number;
}

export interface ReviewQueueItem {
  id: string;
  simuladoId: string;
  simuladoTitle: string;
  questionIndex: number;
  questionNumber: number;
  subjectName: string;
  subjectColor: SubjectColor;
  userAnswer: string;
  keyAnswer: string;
  isFlagged: boolean;
  isWrong: boolean;
  isReviewed: boolean;
  updatedAt: string;
}

const palette: SubjectColor[] = ['blue', 'emerald', 'amber', 'violet', 'rose', 'cyan', 'slate'];

export const EXAM_BLUEPRINTS: ExamBlueprint[] = [
  {
    id: 'enem-dia-1',
    title: 'ENEM · 1º Dia',
    shortTitle: 'ENEM Dia 1',
    category: 'Vestibulares',
    organizer: 'INEP',
    questions: 90,
    examType: 'multiple_choice',
    durationMinutes: 330,
    description: 'Estrutura pronta para Linguagens e Ciências Humanas, com desempenho separado por área.',
    highlight: 'Mapa por área já configurado',
    tags: ['ENEM', '90 questões', '2 áreas'],
    subjectRanges: [
      { name: 'Linguagens e Códigos', start: 1, end: 45, color: 'violet' },
      { name: 'Ciências Humanas', start: 46, end: 90, color: 'amber' },
    ],
  },
  {
    id: 'enem-dia-2',
    title: 'ENEM · 2º Dia',
    shortTitle: 'ENEM Dia 2',
    category: 'Vestibulares',
    organizer: 'INEP',
    questions: 90,
    examType: 'multiple_choice',
    durationMinutes: 300,
    description: 'Estrutura de Ciências da Natureza e Matemática para medir evolução sem misturar as áreas.',
    highlight: 'Diagnóstico exatas x natureza',
    tags: ['ENEM', '90 questões', '2 áreas'],
    subjectRanges: [
      { name: 'Ciências da Natureza', start: 1, end: 45, color: 'emerald' },
      { name: 'Matemática', start: 46, end: 90, color: 'blue' },
    ],
  },
  {
    id: 'cebraspe-120',
    title: 'Cebraspe · Prova Completa',
    shortTitle: 'Cebraspe 120',
    category: 'Concursos',
    organizer: 'Cebraspe',
    questions: 120,
    examType: 'true_false',
    durationMinutes: 270,
    description: 'Modelo Certo/Errado com nota líquida e blocos editáveis de conhecimentos gerais e específicos.',
    highlight: 'Nota líquida + revisão de erros',
    tags: ['Certo/Errado', '120 itens', 'Nota líquida'],
    subjectRanges: [
      { name: 'Conhecimentos Gerais', start: 1, end: 50, color: 'cyan' },
      { name: 'Conhecimentos Específicos', start: 51, end: 120, color: 'amber' },
    ],
  },
  {
    id: 'fgv-80',
    title: 'FGV · Carreiras de Alto Desempenho',
    shortTitle: 'FGV 80',
    category: 'Concursos',
    organizer: 'FGV',
    questions: 80,
    examType: 'multiple_choice',
    durationMinutes: 300,
    description: 'Blueprint flexível para carreiras fiscais, controle e jurídicas, pronto para personalização.',
    highlight: 'Estrutura editável por blocos',
    tags: ['FGV', '80 questões', 'Múltipla escolha'],
    subjectRanges: [
      { name: 'Conhecimentos Gerais', start: 1, end: 30, color: 'blue' },
      { name: 'Conhecimentos Específicos', start: 31, end: 80, color: 'rose' },
    ],
  },
  {
    id: 'tribunais-60',
    title: 'Tribunais · FCC / Vunesp',
    shortTitle: 'Tribunais 60',
    category: 'Concursos',
    organizer: 'FCC / Vunesp',
    questions: 60,
    examType: 'multiple_choice',
    durationMinutes: 240,
    description: 'Base para provas de tribunais com separação inicial entre formação geral e conteúdo específico.',
    highlight: 'Compare os dois blocos',
    tags: ['Tribunais', '60 questões', '2 blocos'],
    subjectRanges: [
      { name: 'Formação Geral', start: 1, end: 20, color: 'emerald' },
      { name: 'Conhecimentos Específicos', start: 21, end: 60, color: 'violet' },
    ],
  },
  {
    id: 'revisao-30',
    title: 'Sprint de Revisão · 30 Questões',
    shortTitle: 'Sprint 30',
    category: 'Revisão',
    organizer: 'Personalizado',
    questions: 30,
    examType: 'multiple_choice',
    durationMinutes: 60,
    description: 'Bateria curta para transformar uma disciplina ou caderno de erros em treino recorrente.',
    highlight: 'Ideal para revisão semanal',
    tags: ['Revisão', '30 questões', '1 hora'],
    subjectRanges: [
      { name: 'Disciplina Principal', start: 1, end: 30, color: 'amber' },
    ],
  },
];

export function materializeSubjectRanges(
  ranges: Omit<SubjectRange, 'id'>[]
): SubjectRange[] {
  return ranges.map((range, index) => ({
    ...range,
    id: `subject_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 6)}`,
  }));
}

export function metadataFromBlueprint(blueprint: ExamBlueprint): ExamMetadata {
  return {
    templateId: blueprint.id,
    category: blueprint.category,
    organizer: blueprint.organizer,
    durationMinutes: blueprint.durationMinutes,
    sourceLabel: 'Biblioteca Gabarito Pro',
  };
}

export function getSubjectForQuestion(
  simulado: SimuladoData,
  questionIndex: number
): SubjectRange | null {
  const questionNumber = questionIndex + 1;
  return (
    simulado.subjectRanges?.find(
      range => questionNumber >= range.start && questionNumber <= range.end
    ) || null
  );
}

export function calculateSubjectPerformance(simulado: SimuladoData): SubjectPerformance[] {
  if (!simulado.subjectRanges?.length) return [];

  return simulado.subjectRanges.map(range => {
    let answered = 0;
    let hits = 0;
    let misses = 0;
    let blanks = 0;
    let evaluated = 0;

    for (let questionNumber = range.start; questionNumber <= range.end; questionNumber += 1) {
      const index = questionNumber - 1;
      const userAnswer = simulado.userAnswers[index] ?? null;
      const keyAnswer = simulado.keyAnswers[index] ?? null;
      if (userAnswer) answered += 1;
      else blanks += 1;
      if (keyAnswer) {
        evaluated += 1;
        if (userAnswer === keyAnswer) hits += 1;
        else if (userAnswer) misses += 1;
      }
    }

    return {
      id: range.id,
      name: range.name,
      color: range.color,
      total: Math.max(0, range.end - range.start + 1),
      answered,
      hits,
      misses,
      blanks,
      evaluated,
      percentage: evaluated > 0 ? Math.round((hits / evaluated) * 100) : 0,
    };
  });
}

export function aggregateSubjectPerformance(
  provas: SimuladoData[]
): AggregatedSubjectPerformance[] {
  const aggregate = new Map<string, AggregatedSubjectPerformance>();

  provas
    .filter(prova => prova.isCorrected && !prova.isResultOutdated && prova.subjectRanges?.length)
    .forEach(prova => {
      calculateSubjectPerformance(prova).forEach(subject => {
        const key = subject.name.trim().toLocaleLowerCase('pt-BR');
        const current = aggregate.get(key);
        if (!current) {
          aggregate.set(key, { ...subject, examCount: 1 });
          return;
        }
        current.total += subject.total;
        current.answered += subject.answered;
        current.hits += subject.hits;
        current.misses += subject.misses;
        current.blanks += subject.blanks;
        current.evaluated += subject.evaluated;
        current.examCount += 1;
        current.percentage = current.evaluated > 0
          ? Math.round((current.hits / current.evaluated) * 100)
          : 0;
      });
    });

  return [...aggregate.values()].sort((a, b) => a.percentage - b.percentage);
}

export function buildReviewQueue(provas: SimuladoData[]): ReviewQueueItem[] {
  const items: ReviewQueueItem[] = [];

  provas.forEach(simulado => {
    if (!simulado.isCorrected || simulado.isResultOutdated) return;
    const reviewed = new Set(simulado.reviewedQuestionIndexes || []);
    for (let index = 0; index < simulado.totalQuestions; index += 1) {
      const userAnswer = simulado.userAnswers[index] ?? null;
      const keyAnswer = simulado.keyAnswers[index] ?? null;
      const isWrong = Boolean(keyAnswer && userAnswer && userAnswer !== keyAnswer);
      const isFlagged = simulado.flaggedQuestions.includes(index);
      if (!isWrong && !isFlagged) continue;
      const subject = getSubjectForQuestion(simulado, index);
      items.push({
        id: `${simulado.id}_${index}`,
        simuladoId: simulado.id,
        simuladoTitle: simulado.title,
        questionIndex: index,
        questionNumber: index + 1,
        subjectName: subject?.name || 'Sem disciplina mapeada',
        subjectColor: subject?.color || palette[index % palette.length],
        userAnswer: userAnswer || '—',
        keyAnswer: keyAnswer || '—',
        isFlagged,
        isWrong,
        isReviewed: reviewed.has(index),
        updatedAt: simulado.updatedAt,
      });
    }
  });

  return items.sort((a, b) => {
    if (a.isReviewed !== b.isReviewed) return Number(a.isReviewed) - Number(b.isReviewed);
    if (a.isWrong !== b.isWrong) return Number(b.isWrong) - Number(a.isWrong);
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}
