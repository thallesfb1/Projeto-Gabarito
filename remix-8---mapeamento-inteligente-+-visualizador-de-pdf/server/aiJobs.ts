import express, { type Request, type Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import type { Config } from './ai.ts';
import type { AIExtraction } from '../src/utils/aiExtraction.ts';
import { AI_EXTRACTION_TIMEOUT_MS } from '../src/utils/aiTiming.ts';
import { validateJobInput, type AIReadingJob } from '../src/utils/aiJobs.ts';

type Credential = { key: string; identity: string; token: string };
type FilePayload = { mime: string; data: string; mode: 'exam' | 'key' };
type Authenticate = (req: Request, res: Response, countRequest?: boolean) => Promise<Credential | null>;
type ReadFile = (config: Config, key: string, file: FilePayload, hint: string, signal: AbortSignal) => Promise<AIExtraction>;
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
    if (job.status !== 'queued' || activeWorkers >= 4 || inFlight.has(credential.identity)) return;
    const client = clientFor(credential.token);
    const lease = randomUUID();
    inFlight.add(credential.identity);
    activeWorkers++;
    const controller = new AbortController();
    try {
      const { data, error } = await client.from(table).update({ status: 'running', lease_token: lease,
        lease_expires_at: new Date(Date.now() + AI_EXTRACTION_TIMEOUT_MS + 60_000).toISOString() })
        .eq('id', job.id).eq('user_id', credential.identity).eq('status', 'queued').select('id');
      if (error || !data?.length) return;
      running.set(job.id, controller);
      const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(AI_EXTRACTION_TIMEOUT_MS)]);
      try {
        if (!reserveGeneration(credential.identity)) throw Object.assign(new Error('Limite de 20 solicitações por 10 minutos. Aguarde antes de tentar uma nova leitura.'), { status: 429, safe: true });
        const input = validateJobInput(job, credential.identity);
        const { data: blob, error: downloadError } = await client.storage.from('prova-originais').download(input.source.path, {}, { signal });
        signal.throwIfAborted();
        if (downloadError || !blob) throw Object.assign(new Error('Não foi possível recuperar o arquivo original. Confira sua conexão e envie novamente.'), { status: 400, safe: true });
        if (blob.size !== input.source.size) throw Object.assign(new Error('O arquivo original não corresponde ao enviado.'), { status: 400, safe: true });
        const file = validateFile(input.source.mime, Buffer.from(await blob.arrayBuffer()).toString('base64'), input.mode);
        const extraction = await read(config, credential.key, file, input.version_hint, signal);
        signal.throwIfAborted();
        const { error: saveError } = await client.from(table).update({ status: 'ready', extraction, error: null, lease_expires_at: null })
          .eq('id', job.id).eq('user_id', credential.identity).eq('status', 'running').eq('lease_token', lease);
        if (saveError) throw new Error('Result persistence failed');
      } catch (error) {
        if (!controller.signal.aborted) {
          const result = publicError(error);
          const message = result.status === 504 ? 'A IA excedeu o tempo de leitura. Nenhuma resposta foi alterada. Dispense esta leitura e tente novamente com um arquivo menor.' : result.error;
          await client.from(table).update({ status: 'failed', error: message, lease_expires_at: null })
            .eq('id', job.id).eq('user_id', credential.identity).eq('status', 'running').eq('lease_token', lease);
          console.warn('[AI job failed]', { status: publicError(error).status });
        }
      }
    } finally { running.delete(job.id); inFlight.delete(credential.identity); activeWorkers--; }
  };
  const dispatch = (job: AIReadingJob, credential: Credential) => {
    void start(job, credential).catch(() => console.warn('[AI job dispatch failed]'));
  };

  router.get('/', async (req, res) => {
    try {
      const credential = await authenticate(req, res, false); if (!credential) return;
      const client = clientFor(credential.token);
      // No automatic replay of an interrupted billable request.
      await client.from(table).update({ status: 'failed', error: 'A leitura foi interrompida no servidor. Envie o arquivo novamente para tentar outra leitura.', lease_expires_at: null })
        .eq('user_id', credential.identity).eq('status', 'running').lt('lease_expires_at', new Date().toISOString());
      const { data, error } = await client.from(table).select('id,user_id,proof_id,mode,source,target_snapshot,version_hint,status,error,created_at,lease_expires_at,question_count:extraction->>totalQuestions').eq('user_id', credential.identity)
        .in('status', ['queued', 'running', 'ready', 'failed']).order('created_at', { ascending: false }).limit(1000);
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
      if (!job || job.status !== 'ready') { res.status(404).json({ error: 'Esta leitura não está disponível para conferência. Atualize o painel.' }); return; }
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
  router.post('/:id/complete', async (req, res) => {
    try {
      const credential = await authenticate(req, res, false); if (!credential) return;
      const { error } = await clientFor(credential.token).from(table).update({ status: 'completed', target_snapshot: null, extraction: null })
        .eq('id', req.params.id).eq('user_id', credential.identity).eq('status', 'ready');
      if (error) { res.status(503).json({ error: unavailable }); return; }
      res.json({ ok: true });
    } catch { res.status(503).json({ error: unavailable }); }
  });
  router.delete('/:id', async (req, res) => {
    try {
      const credential = await authenticate(req, res, false); if (!credential) return;
      const client = clientFor(credential.token);
      const { data: job, error } = await client.from(table).update({ status: 'cancelled', extraction: null, target_snapshot: null })
        .eq('id', req.params.id).eq('user_id', credential.identity).in('status', ['queued','running','ready','failed','cancelled']).select('*').maybeSingle();
      if (error) { res.status(503).json({ error: unavailable }); return; }
      if (!job) { res.status(404).json({ error: 'Leitura não encontrada.' }); return; }
      running.get(job.id)?.abort();
      const safe = validateJobInput(job, credential.identity);
      const { error: removeError } = await client.storage.from('prova-originais').remove([safe.source.path]);
      if (removeError) { res.status(503).json({ error: 'Leitura cancelada. Não foi possível remover o original; tente dispensar o aviso novamente.' }); return; }
      res.json({ ok: true });
    } catch { res.status(503).json({ error: unavailable }); }
  });
  return router;
}
