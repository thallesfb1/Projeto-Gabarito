import type { SupabaseClient } from '@supabase/supabase-js';
import { setTimeout as delay } from 'node:timers/promises';
import { validateAIExtraction, type AIExtraction } from '../src/utils/aiExtraction.ts';
import type { AIReadingJob } from '../src/utils/aiJobs.ts';

export const RECOVERY_BUCKET = 'ai-reading-results';
interface Envelope { fingerprint: string; extraction: AIExtraction }
// Temporary fallback if Storage is unavailable. Never retains credentials.
const pending = new Map<string, Envelope>();
export function recoveryStore(client: SupabaseClient, job: AIReadingJob, signal: AbortSignal, log?: (event: string, fields: object) => void) {
  const prefix = `${job.user_id}/${job.id}`;
  const pathFor = (name: string) => `${prefix}/${name}.json`;
  const load = async (name: string, fingerprint: string) => {
    signal.throwIfAborted();
    const path = pathFor(name);
    let envelope: Envelope | undefined = pending.get(path);
    if (!envelope) {
      const { data, error } = await client.storage.from(RECOVERY_BUCKET).download(path, {}, { signal });
      signal.throwIfAborted();
      if (error || !data) {
        const code = Number((error as { statusCode?: string } | null)?.statusCode);
        if (!data && (!error || code === 404 || code === 400 && /not found|does not exist/i.test(error.message))) return null;
        throw Object.assign(new Error('Não foi possível consultar a leitura preservada. Tente novamente; o arquivo continua salvo.'), { status: 503, safe: true });
      }
      try { envelope = JSON.parse(await data.text()); } catch { throw new Error('Invalid recovery envelope'); }
    }
    if (!envelope || envelope.fingerprint !== fingerprint) return null;
    return validateAIExtraction(envelope.extraction, job.mode);
  };
  const save = async (name: string, fingerprint: string, extraction: AIExtraction) => {
    const path = pathFor(name), envelope = { fingerprint, extraction };
    pending.set(path, envelope);
    for (let attempt = 0; attempt < 5; attempt++) {
      signal.throwIfAborted();
      const started = Date.now();
      const { error } = await client.storage.from(RECOVERY_BUCKET).upload(path, new Blob([JSON.stringify(envelope)], { type: 'application/json' }), { contentType: 'application/json', upsert: true });
      log?.('preserve-attempt', {stage: 'saving', item: name, attempt: attempt + 1, durationMs: Date.now() - started, status: error ? Number((error as {statusCode?: string}).statusCode) || 0 : 200});
      signal.throwIfAborted();
      if (!error) { pending.delete(path); return; }
      if (attempt < 4) await delay(1000 * 2 ** attempt, undefined, { signal });
    }
    throw Object.assign(new Error('A leitura terminou, mas ainda não foi possível preservar o resultado na conta. Tente novamente para recuperar o resultado sem reler o arquivo enquanto o servidor estiver ativo.'), { status: 503, safe: true, persistence: true });
  };
  return { load, save };
}
export async function removeRecovery(client: SupabaseClient, job: AIReadingJob) {
  const prefix = `${job.user_id}/${job.id}`;
  for (const path of pending.keys()) if (path.startsWith(prefix + '/')) pending.delete(path);
  const { data, error } = await client.storage.from(RECOVERY_BUCKET).list(prefix, { limit: 100 });
  if (error) return;
  if (data?.length) await client.storage.from(RECOVERY_BUCKET).remove(data.map(item => `${prefix}/${item.name}`));
}
