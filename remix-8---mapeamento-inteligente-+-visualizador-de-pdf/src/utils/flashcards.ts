import type { AnswerOption, FlashcardDeck, SimuladoData, StudyFlashcard } from '../types.ts';

export interface FlashcardSource {
  number: number;
  subject: string;
  statement: string;
  options: { label: AnswerOption; text: string }[];
  userAnswer: AnswerOption;
  correctAnswer: AnswerOption;
  result: 'wrong' | 'correct';
}

export const FEW_WRONG_QUESTIONS = 5;

export function flashcardSources(proof: SimuladoData): FlashcardSource[] {
  if (!proof.isCorrected || proof.isResultOutdated) return [];
  const wrong: FlashcardSource[] = []; const correct: FlashcardSource[] = [];
  for (let index = 0; index < proof.totalQuestions; index++) {
    const userAnswer = proof.userAnswers[index]; const correctAnswer = proof.keyAnswers[index];
    if (!userAnswer || !correctAnswer) continue;
    const question = proof.extractedQuestions?.find(item => item.number === index + 1);
    const range = proof.subjectRanges?.find(item => index + 1 >= item.start && index + 1 <= item.end);
    const subject = (range?.name || question?.subject || '').trim().slice(0, 120);
    const statement = (question?.statement || '').trim().slice(0, 5000);
    if (!subject && !statement) continue;
    const result = userAnswer === correctAnswer ? 'correct' : 'wrong';
    (result === 'wrong' ? wrong : correct).push({ number: index + 1, subject, statement, options: (question?.options || []).map(option => ({ label: option.label, text: option.text.slice(0, 2000) })), userAnswer, correctAnswer, result });
  }
  return wrong.length < FEW_WRONG_QUESTIONS ? [...wrong, ...correct] : wrong;
}

// Used for freshness only, never as an authentication or security token.
export function flashcardSourceKey(proof: SimuladoData): string {
  const text = JSON.stringify([proof.id, proof.examType, proof.totalQuestions, proof.userAnswers, proof.keyAnswers, flashcardSources(proof)]);
  return sourceFingerprint(text, 'v2');
}

// Keep saved reviews from the previous release when the proof is still identical.
export function compatibleFlashcardDeck(proof: SimuladoData): FlashcardDeck | undefined {
  const deck = proof.flashcardDeck;
  if (!deck || !proof.isCorrected || proof.isResultOutdated) return undefined;
  const key = flashcardSourceKey(proof);
  if (deck.sourceKey === key) return deck;
  const previousSources = flashcardSources(proof).filter(source=>source.result==='wrong').map(({result: _result, ...source})=>source);
  const previous = sourceFingerprint(JSON.stringify([proof.id, proof.examType, proof.totalQuestions, proof.userAnswers, proof.keyAnswers, previousSources]), 'v1');
  return deck.sourceKey === previous ? {...deck, sourceKey:key} : undefined;
}

function sourceFingerprint(text: string, version: string): string {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) { hash ^= text.charCodeAt(i); hash = Math.imul(hash, 16777619); }
  return `${version}-${text.length}-${(hash >>> 0).toString(16)}`;
}

// Spread the request over disciplines instead of selecting only the first errors.
export function selectFlashcardSources(sources: FlashcardSource[], limit = 30): FlashcardSource[] {
  const wrong = sources.filter(source => source.result === 'wrong');
  const selectedWrong = spreadBySubject(wrong, limit);
  if (wrong.length >= FEW_WRONG_QUESTIONS || selectedWrong.length >= limit) return selectedWrong;
  const correct = sources.filter(source => source.result === 'correct');
  return [...selectedWrong, ...spreadBySubject(correct, Math.min(limit - selectedWrong.length, 10 - selectedWrong.length))];
}

function spreadBySubject(sources: FlashcardSource[], limit: number): FlashcardSource[] {
  const groups = new Map<string, FlashcardSource[]>();
  for (const source of sources) { const group = groups.get(source.subject) || []; group.push(source); groups.set(source.subject, group); }
  const selected: FlashcardSource[] = [];
  while (selected.length < limit && [...groups.values()].some(group => group.length)) {
    for (const group of groups.values()) { if (selected.length >= limit) break; const source = group.shift(); if (source) selected.push(source); }
  }
  return selected;
}

export function validateFlashcardRequest(raw: unknown): FlashcardSource[] {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > 30) throw new Error('Envie de 1 a 30 questões corrigidas com enunciado ou disciplina.');
  const numbers = new Set<number>();
  const options = ['A', 'B', 'C', 'D', 'E', 'V', 'F'];
  const sources: FlashcardSource[] = raw.map(item => {
    if (!item || !Number.isInteger(item.number) || item.number < 1 || item.number > 200 || numbers.has(item.number)) throw new Error('Numeração de questões inválida.');
    numbers.add(item.number);
    if (!options.includes(item.userAnswer) || !options.includes(item.correctAnswer)) throw new Error('Os flashcards precisam de respostas marcadas e gabarito oficial.');
    const result = item.userAnswer === item.correctAnswer ? 'correct' : 'wrong';
    if (item.result !== undefined && item.result !== result) throw new Error('A classificação da resposta não corresponde ao gabarito.');
    const subject = typeof item.subject === 'string' ? item.subject.trim().slice(0, 120) : '';
    const statement = typeof item.statement === 'string' ? item.statement.trim().slice(0, 5000) : '';
    if (!subject && !statement) throw new Error('Falta o enunciado ou a disciplina da questão.');
    return { number: item.number, subject, statement, userAnswer: item.userAnswer, correctAnswer: item.correctAnswer, result, options: Array.isArray(item.options) ? item.options.filter((option: any) => options.includes(option?.label) && typeof option?.text === 'string').slice(0, 5).map((option: any) => ({ label: option.label, text: option.text.slice(0, 2000) })) : [] };
  });
  if (sources.filter(source => source.result === 'wrong').length >= FEW_WRONG_QUESTIONS && sources.some(source => source.result === 'correct')) throw new Error('Com cinco ou mais erros, priorize somente as questões erradas.');
  return sources;
}

export function validateFlashcards(raw: unknown, allowedNumbers?: number[], requireLearningFields = false): StudyFlashcard[] {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > 10) throw new Error('A IA não retornou um conjunto válido de flashcards.');
  const fields = { subject: 120, topic: 180, front: 1000, back: 3000 };
  const fronts = new Set<string>();
  return raw.map((item, index) => {
    if (!item || typeof item !== 'object') throw new Error('Flashcard inválido.');
    for (const [field, limit] of Object.entries(fields)) {
      if (typeof item[field] !== 'string' || !item[field].trim() || item[field].length > limit) throw new Error('O conteúdo de um flashcard está incompleto ou muito longo.');
    }
    const front = item.front.trim();
    const learning: Partial<Pick<StudyFlashcard, 'context' | 'explanation' | 'example' | 'pitfall'>> = {};
    for (const [field, limit] of Object.entries({ context: 600, explanation: 1600, example: 800, pitfall: 600 })) {
      const value = item[field];
      const required = requireLearningFields && ['context', 'explanation'].includes(field);
      if ((required && (typeof value !== 'string' || !value.trim())) || (value !== undefined && (typeof value !== 'string' || value.length > limit))) throw new Error('Falta contexto ou explicação válida em um flashcard.');
      if (typeof value === 'string' && value.trim()) learning[field as keyof typeof learning] = value.trim();
    }
    if (fronts.has(front.toLocaleLowerCase('pt-BR'))) throw new Error('A IA retornou cartões repetidos. Tente novamente.');
    fronts.add(front.toLocaleLowerCase('pt-BR'));
    if (!Array.isArray(item.questionNumbers) || !item.questionNumbers.length || item.questionNumbers.length > 30 || item.questionNumbers.some((n: unknown) => !Number.isInteger(n) || Number(n) < 1 || Number(n) > 200 || (allowedNumbers && !allowedNumbers.includes(Number(n))))) throw new Error('Um flashcard não corresponde às questões selecionadas desta prova.');
    return { id: `card-${index + 1}`, subject: item.subject.trim(), topic: item.topic.trim(), front, back: item.back.trim(), ...learning, questionNumbers: [...new Set<number>(item.questionNumbers)] };
  });
}

export function validateFlashcardPriority(cards: StudyFlashcard[], sources: FlashcardSource[]): void {
  const wrong = sources.filter(source => source.result === 'wrong');
  if (!wrong.length) return;
  const wrongNumbers = new Set(wrong.map(source => source.number));
  const errorCards = cards.filter(card => card.questionNumbers.some(number => wrongNumbers.has(number)));
  const minimum = sources.some(source => source.result === 'correct') ? Math.ceil(cards.length * 0.7) : cards.length;
  if (errorCards.length < minimum) throw new Error('A revisão não priorizou as questões erradas.');
}

export function sanitizeFlashcardDeck(raw: unknown): FlashcardDeck | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const deck = raw as FlashcardDeck;
  if (typeof deck.sourceKey !== 'string' || deck.sourceKey.length > 120 || typeof deck.createdAt !== 'string' || !Number.isFinite(Date.parse(deck.createdAt))) return undefined;
  try {
    const cards = validateFlashcards(deck.cards);
    return { sourceKey: deck.sourceKey, createdAt: deck.createdAt, cards, masteredCardIds: Array.isArray(deck.masteredCardIds) ? [...new Set(deck.masteredCardIds.filter(id => cards.some(card => card.id === id)))] : [] };
  } catch { return undefined; }
}
