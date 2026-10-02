import { AIExtraction, ExtractionMode, validateAIExtraction, validateAIFile } from './aiExtraction';
import { supabase } from './supabase';

async function headers() {
  const session = supabase ? (await supabase.auth.getSession()).data.session : null;
  return { 'Content-Type': 'application/json', ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}) };
}
async function request(path: string, signal: AbortSignal, body?: unknown) {
  if (window.location.protocol === 'file:') throw new Error('A IA precisa da versão web com servidor. Abra a aplicação pelo endereço do site.');
  const response = await fetch(`/api/ai/${path}`, { method: body ? 'POST' : 'GET', headers: await headers(), ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.any([signal, AbortSignal.timeout(135000)]) });
  let data;
  try { data = await response.json(); } catch { throw new Error('O servidor de IA não está disponível neste endereço. Use a versão web com a API configurada.'); }
  if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Falha na leitura do arquivo.');
  return data;
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
