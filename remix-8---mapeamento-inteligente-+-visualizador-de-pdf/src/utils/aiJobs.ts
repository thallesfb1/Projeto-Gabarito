import type { SimuladoData, SourceDocument } from '../types';
import type { AIExtraction, ExtractionMode } from './aiExtraction';
import { sanitizeSourceDocuments } from './sourceDocumentMetadata';

export type AIJobStatus = 'queued' | 'running' | 'ready' | 'failed' | 'cancelled' | 'completed';
export interface AIReadingJob {
  id: string;
  user_id: string;
  proof_id: string;
  mode: ExtractionMode;
  source: SourceDocument;
  target_snapshot: SimuladoData | null;
  version_hint: string;
  status: AIJobStatus;
  extraction?: AIExtraction | null;
  error: string | null;
  question_count?: number;
  created_at: string;
  lease_token?: string | null;
  lease_expires_at?: string | null;
}
export const isReadingJob = (job: AIReadingJob) => job.status === 'queued' || job.status === 'running';
export const locksProof = (job: AIReadingJob, proofId: string) => job.proof_id === proofId && Boolean(job.target_snapshot) && (isReadingJob(job) || job.status === 'ready');

export function validateJobInput(value: unknown, owner: string) {
  const item = value as Partial<AIReadingJob> | null;
  if (!item || typeof item.id !== 'string' || !/^[a-f\d-]{36}$/i.test(item.id)
    || typeof item.proof_id !== 'string' || !/^[\w-]{1,160}$/.test(item.proof_id)
    || !['exam', 'key'].includes(item.mode || '')) throw new Error('Identificação da leitura inválida.');
  const source = sanitizeSourceDocuments([item.source])[0];
  if (!source || source.ownerId !== owner || source.path.split('/')[1] !== item.proof_id || source.kind !== item.mode
    || (item.mode === 'exam' && source.mime !== 'application/pdf')) throw new Error('Arquivo ou destino da leitura inválido.');
  const snapshot = item.target_snapshot ?? null;
  if (snapshot && (snapshot.id !== item.proof_id || typeof snapshot.title !== 'string' || JSON.stringify(snapshot).length > 2_000_000)) throw new Error('A prova de destino é inválida.');
  return { id: item.id, proof_id: item.proof_id, mode: item.mode as ExtractionMode, source, target_snapshot: snapshot,
    version_hint: typeof item.version_hint === 'string' ? item.version_hint.slice(0, 160) : '' };
}
