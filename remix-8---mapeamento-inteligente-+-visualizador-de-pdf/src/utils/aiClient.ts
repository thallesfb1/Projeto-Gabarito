import { AIExtraction, ExtractionMode, validateAIExtraction, validateAIFile } from './aiExtraction';
import { supabase } from './supabase';
import { flashcardSources, selectFlashcardSources, validateFlashcards, validateFlashcardPriority } from './flashcards';
import type { SimuladoData, StudyFlashcard } from '../types';
import { AI_EXTRACTION_TIMEOUT_MS, AI_FLASHCARDS_TIMEOUT_MS, AI_RESPONSE_GRACE_MS, AI_READING_TIMEOUT_MESSAGE } from './aiTiming';

async function headers() {
  const session = supabase ? (await supabase.auth.getSession()).data.session : null;
  return { 'Content-Type': 'application/json', ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}) };
}
async function request(path: string, signal: AbortSignal, body?: unknown) {
  if (window.location.protocol === 'file:') throw new Error('A IA precisa da versão web com servidor. Abra a aplicação pelo endereço do site.');
  const requestSignal = AbortSignal.any([signal, AbortSignal.timeout((path === 'extract' ? AI_EXTRACTION_TIMEOUT_MS : AI_FLASHCARDS_TIMEOUT_MS) + AI_RESPONSE_GRACE_MS)]);
  try {
    const response = await fetch(`/api/ai/${path}`, { method: body ? 'POST' : 'GET', headers: await headers(), ...(body ? { body: JSON.stringify(body) } : {}), signal: requestSignal });
    let data;
    try { data = await response.json(); } catch { requestSignal.throwIfAborted(); throw new Error('O servidor de IA não está disponível neste endereço. Use a versão web com a API configurada.'); }
    if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Falha na leitura do arquivo.');
    return data;
  } catch (cause) {
    signal.throwIfAborted();
    if (requestSignal.aborted) throw new Error(path === 'extract' ? AI_READING_TIMEOUT_MESSAGE : 'A geração excedeu o tempo de espera. Isso pode acontecer quando a IA demora a responder. Tente novamente.');
    if (cause instanceof TypeError) throw new Error('A conexão com o serviço de IA foi interrompida. Confira a conexão e tente novamente.');
    throw cause;
  }
}
export async function extractWithAI(file: File, mode: ExtractionMode, signal: AbortSignal, versionHint = ''): Promise<AIExtraction> {
  validateAIFile(file, mode);
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (signal.aborted) throw new DOMException('Cancelado', 'AbortError');
  let binary = '';
  for (let i=0; i<bytes.length; i+=16384) binary += String.fromCharCode(...bytes.subarray(i, i+16384));
  const data = await request('extract', signal, { mode, mime: file.type, data: btoa(binary), versionHint: versionHint.slice(0, 160) });
  return validateAIExtraction(data.extraction, mode);
}

export async function generateFlashcardsWithAI(proof: SimuladoData, signal: AbortSignal): Promise<StudyFlashcard[]> {
  const sources = selectFlashcardSources(flashcardSources(proof));
  if (!sources.length) throw new Error('Corrija a prova e importe os enunciados ou mapeie as disciplinas das questões.');
  const data = await request('flashcards', signal, { questions: sources });
  const cards = validateFlashcards(data.cards, sources.map(source => source.number), true);
  validateFlashcardPriority(cards, sources); return cards;
}
