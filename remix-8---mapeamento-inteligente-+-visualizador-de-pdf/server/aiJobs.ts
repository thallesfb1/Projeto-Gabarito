import express, { type Request, type Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { randomUUID, createHash } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import type { AIReadingContext } from './aiReadingContext.ts';
import { recoveryStore, removeRecovery } from './aiRecovery.ts';
import type { Config } from './ai.ts';
import type { AIExtraction } from '../src/utils/aiExtraction.ts';
import { AI_EXTRACTION_TIMEOUT_MS } from '../src/utils/aiTiming.ts';
import { validateJobInput, type AIReadingJob, type AIJobProgress } from '../src/utils/aiJobs.ts';

type Credential = { key: string; identity: string; token: string };
type FilePayload = { mime: string; data: string; mode: 'exam' | 'key' };
type Authenticate = (req: Request, res: Response, countRequest?: boolean) => Promise<Credential | null>;
type ReadFile = (config: Config, key: string, file: FilePayload, hint: string, signal: AbortSignal, context?: AIReadingContext) => Promise<AIExtraction>;
const table = 'ai_reading_jobs';
const unavailable = 'Não foi possível acessar as leituras da conta. Confira a conexão. Se persistir, o responsável deve conferir a configuração de leituras no Supabase.';

export function createAIJobsRouter(config: Config, authenticate: Authenticate, read: ReadFile,
  publicError: (error: unknown) => { status: number; error: string },
  validateFile: (mime: unknown, data: unknown, mode: unknown) => FilePayload,
  inFlight: Set<string>, reserveGeneration: (identity: string) => boolean = () => true) {
  const router = express.Router();
  const running = new Map<string, AbortController>();
  let activeWorkers = 0;
  const clientFor = (token: string) => createClient(config.VITE_SUPABASE_URL!, config.VITE_SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${token}` }, fetch: (input, init) => fetch(input, { ...init,
      signal: AbortSignal.any([AbortSignal.timeout(30_000), ...(init?.signal ? [init.signal] : [])]) }) }, auth: { persistSession: false, autoRefreshToken: false },
  });

  // Claim in Postgres before calling Gemini. A conditional update prevents duplicate
  // workers across tabs/instances; the lease bounds recovery after a server restart.
  const start = async (job: AIReadingJob, credential: Credential) => {
    const recovering = job.status === 'saving';
    if ((!recovering && job.status !== 'queued') || activeWorkers >= 4 || inFlight.has(credential.identity)) return;
    if (recovering && job.lease_expires_at && new Date(job.lease_expires_at).getTime() > Date.now()) return;
    const client = clientFor(credential.token);
    const lease = randomUUID();
    inFlight.add(credential.identity);
    activeWorkers++;
    const controller = new AbortController();
    const started = Date.now();
    let stage = recovering ? 'saving' : 'downloading';
    const log = (event: string, fields: object = {}) => console.info('[AI reading]', { jobId: job.id, model: 'gemini-3.1-flash-lite', event, stage, durationMs: Date.now() - started, ...fields });
    const update = (values: object) => client.from(table).update(values).eq('id', job.id).eq('user_id', credential.identity).in('status', ['running','saving']).eq('lease_token', lease);
    try {
      const { data, error } = await client.from(table).update({ status: 'running', started_at: job.started_at || new Date().toISOString(), progress: { stage }, lease_token: lease,
        lease_expires_at: new Date(Date.now() + AI_EXTRACTION_TIMEOUT_MS + 60_000).toISOString() })
        .eq('id', job.id).eq('user_id', credential.identity).eq('status', job.status).select('id');
      if (error || !data?.length) return;
      running.set(job.id, controller);
      const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(AI_EXTRACTION_TIMEOUT_MS)]);
      const store = recoveryStore(client, job, signal, log);
      const fingerprint = createHash('sha256').update(JSON.stringify({ v: 1, source: job.source, mode: job.mode, hint: job.version_hint, model: config.GEMINI_MODEL || 'gemini-3.1-flash-lite' })).digest('hex');
      log(recovering ? 'recovering-result' : 'started');
      try {
        const input = validateJobInput(job, credential.identity);
        let extraction = await store.load('result', fingerprint);
        if (!extraction && recovering) throw Object.assign(new Error('Não foi possível recuperar a leitura concluída. Use Tentar novamente para retomar o arquivo salvo.'), { status: 503, safe: true });
        if (!extraction) {
        if (!reserveGeneration(credential.identity)) throw Object.assign(new Error('Limite de 20 solicitações por 10 minutos. Aguarde antes de tentar uma nova leitura.'), { status: 429, safe: true });
        const { data: blob, error: downloadError } = await client.storage.from('prova-originais').download(input.source.path, {}, { signal });
        signal.throwIfAborted();
        if (downloadError || !blob) throw Object.assign(new Error('Não foi possível recuperar o arquivo original. Confira sua conexão e envie novamente.'), { status: 400, safe: true });
        if (blob.size !== input.source.size) throw Object.assign(new Error('O arquivo original não corresponde ao enviado.'), { status: 400, safe: true });
        const file = validateFile(input.source.mime, Buffer.from(await blob.arrayBuffer()).toString('base64'), input.mode);
        let lastProgress: AIJobProgress;
        const context: AIReadingContext = {
          report: async progress => { lastProgress = progress; stage = progress.stage; await update({ progress }); log('progress', progress); },
          loadPart: (part, hash) => store.load(`part-${part}`, hash),
          savePart: async (part, hash, reading) => { stage = 'preserving'; await update({progress: {...lastProgress,stage,part:part+1}}); await store.save(`part-${part}`, hash, reading); log('part-preserved', { part: part + 1 }); },
          log: event => log('upstream-attempt', event),
        };
        extraction = await read(config, credential.key, file, input.version_hint, signal, context);
        signal.throwIfAborted();
        stage = 'saving';
        await update({ status: 'saving', progress: { stage }, lease_expires_at: new Date(Date.now() + 120_000).toISOString() });
        await store.save('result', fingerprint, extraction);
        } else { stage = 'saving'; log('reused-result'); }
        for (let attempt = 0; attempt < 5; attempt++) {
          signal.throwIfAborted();
          const saveStarted = Date.now();
          const { error: saveError } = await update({ status: 'ready', extraction, error: null, progress: { stage: 'saving' }, lease_expires_at: null });
          if (!saveError) { log('ready'); return; }
          log('save-retry', { attempt: attempt + 1, durationMs: Date.now() - saveStarted });
          if (attempt < 4) await delay(1000 * 2 ** attempt, undefined, { signal });
        }
        await update({ status: 'saving', progress: { stage: 'saving' }, error: 'Leitura concluída. Estamos tentando salvar; não é necessário reenviar o arquivo.', lease_expires_at: new Date(Date.now() + 30_000).toISOString() });
        log('save-pending');
      } catch (error) {
        if (!controller.signal.aborted) {
          const result = publicError(error);
          const message = result.status === 504 ? 'A leitura demorou além do prazo. Tente novamente com o mesmo arquivo; as partes preservadas serão reaproveitadas.' : result.error;
          await update({ status: 'failed', error: message, lease_expires_at: null });
          log('failed', { status: result.status, upstreamStatus: typeof error === 'object' && error && 'status' in error ? Number(error.status) : null });
        }
      }
    } finally { if (controller.signal.aborted) await removeRecovery(client, job).catch(() => {}); running.delete(job.id); inFlight.delete(credential.identity); activeWorkers--; }
  };
  const dispatch = (job: AIReadingJob, credential: Credential) => {
    void start(job, credential).catch(() => console.warn('[AI job dispatch failed]'));
  };

  router.get('/', async (req, res) => {
    try {
      const credential = await authenticate(req, res, false); if (!credential) return;
      const client = clientFor(credential.token);
      // No automatic replay of an interrupted billable request.
      await client.from(table).update({ status: 'failed', error: 'A leitura foi interrompida no servidor. Tente novamente para reutilizar o original e as partes preservadas.', lease_expires_at: null })
        .eq('user_id', credential.identity).eq('status', 'running').lt('lease_expires_at', new Date().toISOString());
      const { data, error } = await client.from(table).select('id,user_id,proof_id,mode,source,target_snapshot,version_hint,status,error,created_at,started_at,progress,lease_expires_at,question_count:extraction->>totalQuestions').eq('user_id', credential.identity)
        .in('status', ['queued', 'running', 'saving', 'ready', 'failed']).order('created_at', { ascending: false }).limit(1000);
      if (error) { res.status(503).json({ error: unavailable }); return; }
      for (const job of data || []) dispatch({ ...job, question_count: Number(job.question_count) }, credential);
      res.json({ jobs: (data || []).map(job => ({ ...job, extraction: null,
        question_count: Number(job.question_count || (job as unknown as AIReadingJob).extraction?.totalQuestions || 0),
        target_snapshot: job.target_snapshot ? { id: job.proof_id, title: job.target_snapshot.title } : null })) });
    } catch { res.status(503).json({ error: unavailable }); }
  });
  router.get('/:id', async (req, res) => {
    try {
      const credential = await authenticate(req, res, false); if (!credential) return;
      const { data: job, error } = await clientFor(credential.token).from(table).select('*').eq('user_id', credential.identity).eq('id', req.params.id).maybeSingle();
      if (error) { res.status(503).json({ error: unavailable }); return; }
      if (!job || ['completed','cancelled'].includes(job.status)) { res.status(404).json({ error: 'Esta leitura não está disponível. Atualize o painel.' }); return; }
      res.json({ job });
    } catch { res.status(503).json({ error: unavailable }); }
  });
  router.post('/', async (req, res) => {
    try {
      const credential = await authenticate(req, res, false); if (!credential) return;
      let input;
      try { input = validateJobInput(req.body, credential.identity); }
      catch (error) { res.status(400).json({ error: (error as Error).message }); return; }
      const client = clientFor(credential.token);
      const { data: previous, error: lookupError } = await client.from(table).select('*').eq('user_id', credential.identity).eq('id', input.id).maybeSingle();
      if (lookupError) { res.status(503).json({ error: unavailable }); return; }
      if (previous) {
        if (previous.source.path !== input.source.path || previous.proof_id !== input.proof_id || previous.mode !== input.mode) { res.status(409).json({ error: 'Esta leitura já está vinculada a outro arquivo.' }); return; }
        dispatch(previous, credential); res.status(202).json({ job: previous }); return;
      }
      // Only a claimed worker consumes the generation budget, including jobs
      // inserted directly through the authenticated database API.
      const { data: job, error } = await client.from(table).insert({ ...input, user_id: credential.identity, status: 'queued' }).select('*').single();
      if (error) { res.status(error.code === '23505' ? 409 : 503).json({ error: error.code === '23505' ? 'Já existe uma leitura em andamento ou aguardando conferência nesta prova. Confira o painel de leituras.' : unavailable }); return; }
      dispatch(job, credential);
      res.status(202).json({ job });
    } catch { res.status(503).json({ error: unavailable }); }
  });
  router.post('/:id/retry', async (req, res) => {
    try {
      const credential = await authenticate(req, res, false); if (!credential) return;
      const client = clientFor(credential.token);
      const { data: previous, error: lookup } = await client.from(table).select('*').eq('id', req.params.id).eq('user_id', credential.identity).maybeSingle();
      if (lookup) { res.status(503).json({ error: unavailable }); return; }
      if (!previous || ['completed','cancelled'].includes(previous.status)) { res.status(404).json({ error: 'Leitura não encontrada.' }); return; }
      if (previous.status !== 'failed') { dispatch(previous, credential); res.status(202).json({ job: previous }); return; }
      const { data: job, error } = await client.from(table).update({ status: 'queued', error: null, progress: null, started_at: new Date().toISOString(), lease_token: null, lease_expires_at: null })
        .eq('id', previous.id).eq('user_id', credential.identity).eq('status', 'failed').select('*').maybeSingle();
      if (error) { res.status(error.code === '23505' ? 409 : 503).json({ error: error.code === '23505' ? 'Aguarde a outra leitura em andamento.' : unavailable }); return; }
      if (!job) { res.status(409).json({ error: 'A leitura já mudou. Atualize o painel.' }); return; }
      dispatch(job, credential); res.status(202).json({ job });
    } catch { res.status(503).json({ error: unavailable }); }
  });
  router.post('/:id/complete', async (req, res) => {
    try {
      const credential = await authenticate(req, res, false); if (!credential) return;
      const client = clientFor(credential.token);
      const { data: job, error } = await client.from(table).update({ status: 'completed', target_snapshot: null, extraction: null })
        .eq('id', req.params.id).eq('user_id', credential.identity).eq('status', 'ready').select('*').maybeSingle();
      if (error) { res.status(503).json({ error: unavailable }); return; }
      if (job) await removeRecovery(client, job);
      res.json({ ok: true });
    } catch { res.status(503).json({ error: unavailable }); }
  });
  router.delete('/:id', async (req, res) => {
    try {
      const credential = await authenticate(req, res, false); if (!credential) return;
      const client = clientFor(credential.token);
      const { data: job, error } = await client.from(table).update({ status: 'cancelled', extraction: null, target_snapshot: null })
        .eq('id', req.params.id).eq('user_id', credential.identity).in('status', ['queued','running','saving','ready','failed','cancelled']).select('*').maybeSingle();
      if (error) { res.status(503).json({ error: unavailable }); return; }
      if (!job) { res.status(404).json({ error: 'Leitura não encontrada.' }); return; }
      running.get(job.id)?.abort();
      const safe = validateJobInput(job, credential.identity);
      const { error: removeError } = await client.storage.from('prova-originais').remove([safe.source.path]);
      await removeRecovery(client, job);
      if (removeError) { res.status(503).json({ error: 'Leitura cancelada. Não foi possível remover o original; tente dispensar o aviso novamente.' }); return; }
      res.json({ ok: true });
    } catch { res.status(503).json({ error: unavailable }); }
  });
  return router;
}
