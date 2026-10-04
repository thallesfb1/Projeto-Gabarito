import { PDFDocument } from 'pdf-lib';
import { validateAIExtraction, type AIExtraction, type ExtractionMode } from '../src/utils/aiExtraction.ts';

export interface PDFPart { data: string; pages: number[]; mainStart: number; mainEnd: number }
export async function splitPDF(data: string, signal: AbortSignal): Promise<PDFPart[]> {
  signal.throwIfAborted();
  let pdf;
  try { pdf = await PDFDocument.load(Buffer.from(data, 'base64')); }
  catch { throw Object.assign(new Error('Este PDF está protegido por senha ou não pode ser aberto. Envie uma cópia válida sem senha.'), { status: 400, safe: true }); }
  const count = pdf.getPageCount();
  if (!count || count > 150) throw Object.assign(new Error('Envie um PDF de até 150 páginas e 200 questões.'), { status: 400, safe: true });
  if (count <= 6) return [{ data, pages: Array.from({ length: count }, (_, i) => i + 1), mainStart: 1, mainEnd: count }];
  const parts: PDFPart[] = [];
  for (let start = 0; start < count; start += 4) {
    signal.throwIfAborted();
    // Retain the cover, previous page and following page for shared text and
    // questions crossing a boundary. Original page numbers are mapped explicitly.
    const indices = [...new Set([0, ...Array.from({ length: Math.min(count, start + 5) - Math.max(0, start - 1) }, (_, i) => Math.max(0, start - 1) + i)])].sort((a, b) => a - b);
    const part = await PDFDocument.create();
    for (const page of await part.copyPages(pdf, indices)) part.addPage(page);
    parts.push({ data: Buffer.from(await part.save()).toString('base64'), pages: indices.map(i => i + 1), mainStart: start + 1, mainEnd: Math.min(count, start + 4) });
  }
  return parts;
}

export function mergeReadings(readings: AIExtraction[], mode: ExtractionMode): AIExtraction {
  if (!readings.length) throw new Error('Não foram encontradas questões no documento.');
  const examType = readings[0].examType;
  if (readings.some(item => item.examType !== examType)) throw Object.assign(new Error('As partes da prova têm tipos de questão diferentes. Confira o arquivo.'), { status: 422, safe: true });
  const questions = new Map<number, AIExtraction['questions'][number]>();
  const answers = new Map<number, AIExtraction['answers'][number]>();
  const warnings = new Set<string>();
  const conflicts = new Set<string>();
  for (const reading of readings) {
    for (const warning of reading.warnings) if (!/^Foram lidas \d+ de \d+ questões\./.test(warning) && !warning.startsWith('O gabarito está incompleto.')) warnings.add(warning);
    for (const question of reading.questions) {
      const previous = questions.get(question.number);
      if (previous && JSON.stringify(previous.options) !== JSON.stringify(question.options)) conflicts.add(`Confira a questão ${question.number}: houve diferenças nas alternativas entre as páginas sobrepostas.`);
      const length = (q: typeof question) => q.statement.length + q.options.reduce((n, option) => n + option.text.length, 0);
      if (!previous || length(question) > length(previous)) questions.set(question.number, question);
    }
    for (const answer of reading.answers) {
      const previous = answers.get(answer.number);
      if (previous && previous.answer !== answer.answer && previous.answer && answer.answer) {
        answers.set(answer.number, { number: answer.number, answer: null });
        conflicts.add(`Confira o gabarito da questão ${answer.number}: foram encontradas respostas diferentes entre as partes.`);
      } else if (!previous || (!previous.answer && !conflicts.has(`Confira o gabarito da questão ${answer.number}: foram encontradas respostas diferentes entre as partes.`))) answers.set(answer.number, answer);
    }
  }
  const totalQuestions = Math.max(...readings.map(item => item.totalQuestions));
  const mergedWarnings = [...warnings].filter(warning => !(mode === 'exam' && questions.size === totalQuestions && /^(?:As? |Os? )?(?:questões|questão|itens|item)\s+[\d ,aàe–-]+\s+não (?:foram|foi) encontrad/i.test(warning)));
  return validateAIExtraction({ ...readings[0], totalQuestions, questions: [...questions.values()], answers: [...answers.values()], warnings: [...conflicts,...mergedWarnings] }, mode);
}
