import type { AnswerOption, ExamType, ExtractedQuestion } from '../types.ts';
import { normalizeAnswer } from './validation.ts';

export type ExtractionMode = 'exam' | 'key';
export interface AIExtraction {
  title: string;
  examType: ExamType;
  totalQuestions: number;
  questions: ExtractedQuestion[];
  answers: { number: number; answer: AnswerOption | null }[];
  warnings: string[];
}
export const MAX_AI_FILE_BYTES = 10 * 1024 * 1024;
export const AI_MIME_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];

export function validateAIFile(file: Pick<File, 'size' | 'type'>, mode: ExtractionMode) {
  if (!file.size || file.size > MAX_AI_FILE_BYTES) throw new Error('Escolha um arquivo de até 10 MB.');
  if (!AI_MIME_TYPES.includes(file.type) || (mode === 'exam' && file.type !== 'application/pdf')) {
    throw new Error(mode === 'exam' ? 'A prova deve ser um PDF.' : 'Use um PDF ou uma imagem PNG, JPEG ou WebP.');
  }
}

const text = (value: unknown, max: number) => typeof value === 'string' ? value.trim().slice(0, max) : '';
export function validateAIExtraction(value: unknown, mode: ExtractionMode): AIExtraction {
  if (!value || typeof value !== 'object') throw new Error('A IA não devolveu uma leitura válida.');
  const raw = value as Record<string, unknown>;
  if (raw.examType !== 'multiple_choice' && raw.examType !== 'true_false') throw new Error('O tipo da prova não foi reconhecido.');
  const examType = raw.examType;
  const total = raw.totalQuestions;
  if (typeof total !== 'number' || !Number.isInteger(total) || total < 1 || total > 200) throw new Error('A leitura deve conter entre 1 e 200 questões. Divida provas maiores em arquivos menores.');
  const warnings = Array.isArray(raw.warnings) ? raw.warnings.map(item => text(item, 1000)).filter(Boolean).slice(0, 30) : [];
  const seen = new Set<number>();
  const questions: ExtractedQuestion[] = [];
  if (mode === 'exam') {
    if (!Array.isArray(raw.questions) || !raw.questions.length || raw.questions.length > 200) throw new Error('Não foram encontrados enunciados de prova.');
    for (const item of raw.questions) {
      if (!item || !Number.isInteger(item.number) || item.number < 1 || item.number > total || seen.has(item.number)) throw new Error('Há números de questão repetidos ou fora da prova. Tente um PDF mais nítido.');
      seen.add(item.number);
      const statement = text(item.statement, 24000);
      if (!statement) throw new Error(`O enunciado da questão ${item.number} está vazio.`);
      const options: ExtractedQuestion['options'] = [];
      const labels = new Set<string>();
      if (Array.isArray(item.options)) for (const option of item.options) {
        const label = normalizeAnswer(option?.label, examType);
        if (!label || labels.has(label)) throw new Error(`Alternativas inválidas na questão ${item.number}.`);
        labels.add(label);
        options.push({ label, text: text(option.text, 8000) });
      }
      questions.push({ number: item.number, statement, options, subject: text(item.subject, 120), page: Number.isInteger(item.page) && item.page > 0 ? item.page : undefined });
    }
    if (questions.length !== total) warnings.push(`Foram lidas ${questions.length} de ${total} questões. Confira os números ausentes no PDF.`);
  }
  const answers: AIExtraction['answers'] = [];
  if (mode === 'key') {
    if (!Array.isArray(raw.answers) || !raw.answers.length || raw.answers.length > 200) throw new Error('Nenhum gabarito foi encontrado no arquivo.');
    for (const item of raw.answers) {
      if (!item || !Number.isInteger(item.number) || item.number < 1 || item.number > total || seen.has(item.number)) throw new Error('Há números de gabarito repetidos ou fora da prova. Confira a imagem.');
      seen.add(item.number);
      const answer = normalizeAnswer(item.answer, examType);
      if (item.answer !== null && !answer) throw new Error(`Alternativa inválida na questão ${item.number}.`);
      answers.push({ number: item.number, answer });
    }
    if (!answers.some(item => item.answer)) throw new Error('As respostas estão ilegíveis. Envie uma imagem mais nítida.');
    if (answers.filter(item => item.answer).length < total) warnings.push('O gabarito está incompleto. Respostas ausentes ou ilegíveis permanecerão em branco.');
  }
  return { title: text(raw.title, 180) || 'Prova importada do PDF', examType, totalQuestions: total, questions: questions.sort((a,b) => a.number-b.number), answers: answers.sort((a,b) => a.number-b.number), warnings };
}

export function answersFromExtraction(extraction: AIExtraction, total: number): (AnswerOption | null)[] {
  if (extraction.answers.some(item => item.number > total)) throw new Error('O gabarito tem questões além do cartão atual. Escolha a prova correspondente.');
  const answers: (AnswerOption | null)[] = Array(total).fill(null);
  for (const item of extraction.answers) answers[item.number - 1] = item.answer;
  return answers;
}
