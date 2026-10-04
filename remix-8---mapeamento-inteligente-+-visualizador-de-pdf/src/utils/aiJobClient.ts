import { supabase } from './supabase';
import { uploadOriginalFile, downloadOriginalFile, ORIGINALS_BUCKET } from './sourceDocuments';
import { validateAIExtraction, type ExtractionMode } from './aiExtraction';
import type { SimuladoData } from '../types';
import type { AIReadingJob } from './aiJobs';

async function jobRequest(path = '', method = 'GET', body?: unknown, signal?: AbortSignal) {
  if (!supabase || window.location.protocol === 'file:') throw new Error('A leitura em segundo plano precisa da versão web e de uma conta conectada.');
  const session = (await supabase.auth.getSession()).data.session;
  if (!session) throw new Error('Entre com Google para usar a IA.');
  const response = await fetch(`/api/ai/jobs${path}`, { method, signal: AbortSignal.any([AbortSignal.timeout(60_000), ...(signal ? [signal] : [])]),
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }, ...(body ? { body: JSON.stringify(body) } : {}) });
  let data;
  try { data = await response.json(); } catch { throw new Error('O servidor não respondeu à consulta de leituras. Tente novamente.'); }
  if (!response.ok) throw Object.assign(new Error(typeof data.error === 'string' ? data.error : 'Não foi possível acessar a leitura.'), { status: response.status });
  return data;
}
export async function listAIJobs(signal: AbortSignal): Promise<AIReadingJob[]> {
  const { jobs } = await jobRequest('', 'GET', undefined, signal);
  return jobs;
}
export async function submitAIJob(file: File, mode: ExtractionMode, target: SimuladoData | null, hint: string): Promise<AIReadingJob> {
  const id = crypto.randomUUID();
  const proofId = target?.id || crypto.randomUUID();
  const source = await uploadOriginalFile(file, proofId, mode);
  const input = { id, proof_id: proofId, source, mode, target_snapshot: target, version_hint: hint.slice(0, 160) };
  // Retry the same id only for transport failures. A lost response must not cause
  // another upload/generation. Definitive errors free the staged original.
  for (let attempt = 0; ; attempt++) {
    try { return (await jobRequest('', 'POST', input)).job; }
    catch (error) {
      if (typeof error === 'object' && error && 'status' in error && [400,401,403,409,429].includes(Number(error.status))) {
        await supabase?.storage.from(ORIGINALS_BUCKET).remove([source.path]);
        throw error;
      }
      if (attempt >= 1) throw new Error('Não foi possível confirmar o envio. Confira o painel de leituras antes de enviar novamente: a leitura pode já ter iniciado.');
    }
  }
}
export const cancelAIJob = (id: string) => jobRequest(`/${encodeURIComponent(id)}`, 'DELETE');
export const completeAIJob = (id: string) => jobRequest(`/${encodeURIComponent(id)}/complete`, 'POST');
export async function reviewAIJobFile(job: AIReadingJob) {
  const { job: full } = await jobRequest(`/${encodeURIComponent(job.id)}`);
  const extraction = validateAIExtraction(full.extraction, full.mode);
  const blob = await downloadOriginalFile(full.source);
  return { job: { ...full, extraction } as AIReadingJob, file: new File([blob], full.source.name, { type: full.source.mime }) };
}
