import type { AnswerOption, ExamType, ExtractedQuestion } from '../types.ts';

// New cards use at most 200 questions; older backups can contain larger exams.
export const MAX_QUESTIONS = 1000;
export const MAX_IMPORT_BYTES = 10 * 1024 * 1024;

export function normalizeTotal(value: unknown, fallback = 70): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? Math.min(MAX_QUESTIONS, Math.max(1, Math.floor(value)))
    : fallback;
}

export function normalizeAnswer(value: unknown, examType: ExamType): AnswerOption | null {
  if (typeof value !== 'string') return null;
  const answer = value.trim().toUpperCase();
  if (examType === 'true_false') {
    if (answer === 'V' || answer === 'C') return 'V';
    if (answer === 'F' || answer === 'E') return 'F';
    return null;
  }
  return /^[A-E]$/.test(answer) ? answer as AnswerOption : null;
}

export function resizeAnswers(answers: unknown[], total: number, examType: ExamType = 'multiple_choice'): (AnswerOption | null)[] {
  return Array.from({ length: total }, (_, index) => normalizeAnswer(answers[index], examType));
}

export function validIndexes(value: unknown, total: number): number[] {
  return Array.isArray(value)
    ? [...new Set(value.filter(index => Number.isInteger(index) && index >= 0 && index < total))]
    : [];
}

export function sanitizeExtractedQuestions(value: unknown, total: number, examType: ExamType): ExtractedQuestion[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<number>();
  return value.slice(0, 200).flatMap(item => {
    if (!item || !Number.isInteger(item.number) || item.number < 1 || item.number > total || seen.has(item.number) || typeof item.statement !== 'string') return [];
    seen.add(item.number);
    const labels = new Set<string>();
    const options: ExtractedQuestion['options'] = Array.isArray(item.options) ? item.options.slice(0, 5).flatMap((option: any) => {
      const label = normalizeAnswer(option?.label, examType);
      if (!label || labels.has(label) || typeof option?.text !== 'string') return [];
      labels.add(label); return [{ label, text: option.text.slice(0, 8000) }];
    }) : [];
    return [{ number: item.number, statement: item.statement.slice(0, 24000), options, subject: typeof item.subject === 'string' ? item.subject.slice(0,120) : '', page: Number.isInteger(item.page) && item.page > 0 ? item.page : undefined }];
  });
}
