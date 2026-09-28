import { describe, expect, it } from 'vitest';
import { SimuladoData } from '../types';
import {
  aggregateSubjectPerformance,
  buildReviewQueue,
  calculateSubjectPerformance,
  getSubjectForQuestion,
  materializeSubjectRanges,
} from './examCatalog';

function makeExam(overrides: Partial<SimuladoData> = {}): SimuladoData {
  return {
    id: 'exam-1',
    title: 'Simulado de teste',
    date: '28/09/2026',
    createdAt: '2026-09-28T10:00:00.000Z',
    updatedAt: '2026-09-28T11:00:00.000Z',
    totalQuestions: 4,
    userAnswers: ['A', 'B', null, 'D'],
    keyAnswers: ['A', 'C', 'C', 'D'],
    flaggedQuestions: [2],
    isCorrected: true,
    timeSpentSeconds: 600,
    subjectRanges: [
      { id: 'portugues', name: 'Português', start: 1, end: 2, color: 'blue' },
      { id: 'direito', name: 'Direito', start: 3, end: 4, color: 'amber' },
    ],
    reviewedQuestionIndexes: [],
    ...overrides,
  };
}

describe('examCatalog', () => {
  it('materializa faixas sem alterar a estrutura pedagógica', () => {
    const ranges = materializeSubjectRanges([
      { name: 'Matemática', start: 1, end: 10, color: 'emerald' },
    ]);

    expect(ranges).toHaveLength(1);
    expect(ranges[0]).toMatchObject({ name: 'Matemática', start: 1, end: 10, color: 'emerald' });
    expect(ranges[0].id).toMatch(/^subject_/);
  });

  it('localiza a disciplina e calcula acertos, erros e brancos', () => {
    const exam = makeExam();

    expect(getSubjectForQuestion(exam, 2)?.name).toBe('Direito');
    expect(calculateSubjectPerformance(exam)).toEqual([
      expect.objectContaining({ name: 'Português', hits: 1, misses: 1, blanks: 0, evaluated: 2, percentage: 50 }),
      expect.objectContaining({ name: 'Direito', hits: 1, misses: 0, blanks: 1, evaluated: 2, percentage: 50 }),
    ]);
  });

  it('agrega a mesma disciplina sem ignorar respostas em branco', () => {
    const second = makeExam({
      id: 'exam-2',
      userAnswers: ['A', 'C', 'C', 'D'],
      subjectRanges: [
        { id: 'portugues-2', name: 'português', start: 1, end: 2, color: 'rose' },
      ],
    });

    const portugues = aggregateSubjectPerformance([makeExam(), second])
      .find(subject => subject.name.toLocaleLowerCase('pt-BR') === 'português');

    expect(portugues).toMatchObject({ examCount: 2, hits: 3, evaluated: 4, percentage: 75 });
  });

  it('prioriza erros pendentes e mantém questões sinalizadas na fila', () => {
    const queue = buildReviewQueue([
      makeExam({ reviewedQuestionIndexes: [2] }),
    ]);

    expect(queue.map(item => item.questionNumber)).toEqual([2, 3]);
    expect(queue[0]).toMatchObject({ isWrong: true, isReviewed: false, subjectName: 'Português' });
    expect(queue[1]).toMatchObject({ isFlagged: true, isReviewed: true, subjectName: 'Direito' });
  });
});
