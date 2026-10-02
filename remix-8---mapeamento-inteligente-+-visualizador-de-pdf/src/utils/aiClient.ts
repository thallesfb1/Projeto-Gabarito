import { AIExtraction, ExtractionMode, validateAIExtraction, validateAIFile } from './aiExtraction';
import { supabase } from './supabase';

async function headers(key: string) {
  const session = supabase ? (await supabase.auth.getSession()).data.session : null;
  return { 'Content-Type': 'application/json', ...(key.trim() ? { 'x-gemini-api-key': key.trim() } : {}), ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}) };
}
async function request(path: string, key: string, signal: AbortSignal, body?: unknown) {
  if (window.location.protocol === 'file:') throw new Error('A IA precisa da versão web com servidor. Abra a aplicação pelo endereço do site.');
  const response = await fetch(`/api/ai/${path}`, { method: body ? 'POST' : 'GET', headers: await headers(key), ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.any([signal, AbortSignal.timeout(135000)]) });
  let data;
  try { data = await response.json(); } catch { throw new Error('O servidor de IA não está disponível neste endereço. Use a versão web com a API configurada.'); }
  if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Falha na leitura do arquivo.');
  return data;
}
export async function listAIModels(key: string, signal: AbortSignal): Promise<{ name: string; label: string }[]> {
  const data = await request('models', key, signal);
  if (!Array.isArray(data.models) || !data.models.length) throw new Error('Nenhum modelo de leitura está disponível para esta chave.');
  return data.models;
}
export async function extractWithAI(file: File, mode: ExtractionMode, key: string, model: string, signal: AbortSignal, versionHint = ''): Promise<AIExtraction> {
  validateAIFile(file, mode);
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (signal.aborted) throw new DOMException('Cancelado', 'AbortError');
  let binary = '';
  for (let i=0; i<bytes.length; i+=16384) binary += String.fromCharCode(...bytes.subarray(i, i+16384));
  const data = await request('extract', key, signal, { mode, model, mime: file.type, data: btoa(binary), versionHint: versionHint.slice(0, 160) });
  return validateAIExtraction(data.extraction, mode);
}
