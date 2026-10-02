import type { AnswerOption, ExamType, SimuladoData } from '../types';
import { normalizeTotal, resizeAnswers } from './validation';

/** One reproducible pair for every explicit demonstration, in either import order. */
export function generateExamplePair(count: number, examType: ExamType = 'multiple_choice') {
  const total = count > 0 ? normalizeTotal(count) : 0;
  const options: AnswerOption[] = examType === 'true_false' ? ['V', 'F'] : ['A', 'B', 'C', 'D', 'E'];
  const hits = Math.round(total * .7);
  const keyAnswers = Array.from({ length: total }, (_, i) => options[(i * 3 + Math.floor(i / 7)) % options.length]);
  const userAnswers = keyAnswers.map((answer, i) => {
    const correct = Math.floor((i + 1) * hits / total) > Math.floor(i * hits / total);
    return correct ? answer : options[(options.indexOf(answer) + 1) % options.length];
  });
  return { keyAnswers, userAnswers, hits };
}

export function applyAnswerImport(proof: SimuladoData, target: 'user' | 'key', answers: (AnswerOption | null)[], newTotal?: number, isExample = false): SimuladoData {
  const totalQuestions = normalizeTotal(newTotal, proof.totalQuestions);
  const exampleData = { user: proof.exampleData?.user === true, key: proof.exampleData?.key === true, [target]: isExample };
  let userAnswers = resizeAnswers(target === 'user' ? answers : proof.userAnswers, totalQuestions, proof.examType);
  let keyAnswers = resizeAnswers(target === 'key' ? answers : proof.keyAnswers, totalQuestions, proof.examType);
  if (exampleData.user && exampleData.key) ({ userAnswers, keyAnswers } = generateExamplePair(totalQuestions, proof.examType));
  return { ...proof, totalQuestions, userAnswers, keyAnswers, exampleData, reviewedQuestionIndexes: [], isCorrected: false, isLocked: false, isResultOutdated: false };
}
