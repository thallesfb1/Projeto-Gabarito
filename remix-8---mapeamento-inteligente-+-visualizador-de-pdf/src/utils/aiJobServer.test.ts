import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
const mocks = vi.hoisted(() => ({ client: vi.fn() }));
vi.mock('@supabase/supabase-js', () => ({ createClient: mocks.client }));
import { createAIJobsRouter } from '../../server/aiJobs';
import { validateFilePayload } from '../../server/ai';
const owner = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const blob = new Blob(['%PDF-1.7']);
const input = { id, proof_id: 'proof1', mode: 'exam', target_snapshot: null, version_hint: '',
  source: { ownerId: owner, path: `${owner}/proof1/cccccccc-cccc-cccc-cccc-cccccccccccc.pdf`, name: 'prova.pdf', mime: 'application/pdf', size: blob.size, kind: 'exam' } };
const extraction = { title: 'Prova', examType: 'multiple_choice', totalQuestions: 1, questions: [{ number: 1, statement: 'Enunciado', options: [] }], answers: [], warnings: [] };
let rows: any[], server: Server, url: string;
const read = vi.fn(), authenticate = vi.fn(), remove = vi.fn(), download = vi.fn();
const recoveryFiles = new Map<string, Blob>();
const recoveryUpload = vi.fn(), recoveryDownload = vi.fn();
let resultSaveFailures = 0;
vi.mock('node:timers/promises', () => ({ setTimeout: async (_ms: number, _value: unknown, options?: {signal?: AbortSignal}) => { options?.signal?.throwIfAborted(); } }));
function query() {
  let operation = 'select', values: any, predicates: ((row: any) => boolean)[] = [];
  const builder: any = {
    select: () => builder, update: (data: any) => { operation = 'update'; values = data; return builder; },
    insert: (data: any) => { operation = 'insert'; values = data; return builder; },
    eq: (key: string, value: any) => { predicates.push(row => row[key] === value); return builder; },
    in: (key: string, value: any[]) => { predicates.push(row => value.includes(row[key])); return builder; },
    lt: (key: string, value: string) => { predicates.push(row => Boolean(row[key]) && row[key] < value); return builder; },
    order: () => builder, limit: () => builder,
    execute: () => {
      if (operation === 'update' && values.status === 'ready' && resultSaveFailures > 0) { resultSaveFailures--; return { data: null, error: {code: 'TEST_OUTAGE'} }; }
      if (operation === 'insert') {
        if (rows.some(row => row.id === values.id || (row.user_id === values.user_id && ['queued','running'].includes(row.status)))) return { data: null, error: { code: '23505' } };
        rows.push({ ...values, created_at: new Date().toISOString() });
        return { data: structuredClone(rows[rows.length - 1]), error: null };
      }
      const selected = rows.filter(row => predicates.every(predicate => predicate(row)));
      if (operation === 'update') selected.forEach(row => Object.assign(row, values));
      return { data: structuredClone(selected), error: null };
    },
    maybeSingle: async () => { const result = builder.execute(); return { ...result, data: Array.isArray(result.data) ? result.data[0] || null : result.data }; },
    single: async () => builder.execute(),
    then: (resolve: any, reject: any) => Promise.resolve(builder.execute()).then(resolve, reject),
  }; return builder;
}
async function request(method = 'GET', path = '', body?: unknown, token = 'owner') {
  return fetch(url + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: token } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
}
beforeEach(async () => {
  vi.clearAllMocks(); rows = []; recoveryFiles.clear(); resultSaveFailures = 0;
  recoveryUpload.mockImplementation(async (path, data) => { recoveryFiles.set(path, data); return { error: null }; });
  recoveryDownload.mockImplementation(async path => ({data: recoveryFiles.get(path) || null, error: recoveryFiles.has(path) ? null : {statusCode:'404',message:'Not found'}}));
  mocks.client.mockImplementation(() => ({ from: query, storage: { from: (bucket: string) => bucket === 'ai-reading-results' ? { download: recoveryDownload, upload: recoveryUpload, list: async () => ({data:[],error:null}), remove: async () => ({error:null}) } : { download, remove } } }));
  download.mockResolvedValue({ data: blob, error: null }); remove.mockResolvedValue({ error: null });
  authenticate.mockImplementation(async (req, res) => {
    if (!req.get('authorization')) { res.status(401).json({ error: 'Login necessário' }); return null; }
    return { key: 'test-key', identity: req.get('authorization') === 'owner' ? owner : 'dddddddd-dddd-dddd-dddd-dddddddddddd', token: req.get('authorization') };
  });
  read.mockResolvedValue(extraction);
  const app = express(); app.use(express.json());
  app.use('/jobs', createAIJobsRouter({ VITE_SUPABASE_URL: 'https://example.supabase.co', VITE_SUPABASE_ANON_KEY: 'anon' }, authenticate, read,
    () => ({ status: 503, error: 'Falha temporária' }), validateFilePayload, new Set()));
  server = app.listen(0, '127.0.0.1'); await new Promise<void>(resolve => server.once('listening', resolve));
  url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/jobs`;
});
afterEach(async () => { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); });
describe('requisições assíncronas persistidas', () => {
  it('retorna 202 antes do Gemini e salva o resultado após a requisição terminar', async () => {
    let finish!: (value: any) => void; read.mockReturnValue(new Promise(resolve => { finish = resolve; }));
    expect((await request('POST', '', input)).status).toBe(202);
    await vi.waitFor(() => expect(read).toHaveBeenCalledOnce());
    expect(rows[0].status).toBe('running');
    finish(extraction); await vi.waitFor(() => expect(rows[0].status).toBe('ready'));
    expect((await (await request()).json()).jobs[0].extraction).toBeNull();expect((await (await request('GET', '/'+id)).json()).job.extraction).toEqual(extraction);
  });
  it('reenvio idempotente e consultas não criam novas chamadas da IA', async () => {
    await request('POST', '', input); await vi.waitFor(() => expect(rows[0].status).toBe('ready'));
    await request('POST', '', input); await request(); await request();
    expect(rows).toHaveLength(1); expect(read).toHaveBeenCalledOnce();
    expect(authenticate.mock.calls.every(call => call[2] === false)).toBe(true);
  });
  it('isola contas e recusa arquivo de outra conta antes de gastar IA', async () => {
    expect((await request('POST', '', input, '')).status).toBe(401);
    expect((await request('POST', '', input, 'other')).status).toBe(400);
    await request('POST', '', input); await vi.waitFor(() => expect(rows[0].status).toBe('ready'));
    expect((await (await request('GET', '', undefined, 'other')).json()).jobs).toEqual([]);
    expect((await request('DELETE', `/${id}`, undefined, 'other')).status).toBe(404);
  });
  it('cancelamento impede um resultado atrasado de reaparecer e remove o original', async () => {
    let finish!: (value: any) => void; read.mockReturnValue(new Promise(resolve => { finish = resolve; }));
    await request('POST', '', input); await vi.waitFor(() => expect(read).toHaveBeenCalledOnce());
    expect((await request('DELETE', `/${id}`)).status).toBe(200); finish(extraction);
    await new Promise(resolve => setTimeout(resolve, 20));
    expect(rows[0].status).toBe('cancelled'); expect(rows[0].extraction).toBeNull(); expect(remove).toHaveBeenCalledWith([input.source.path]);
  });
  it('não repete automaticamente uma leitura interrompida por reinício do servidor', async () => {
    rows.push({ ...input, user_id: owner, status: 'running', lease_expires_at: '2020-01-01T00:00:00Z' });
    await request(); expect(rows[0].status).toBe('failed'); expect(read).not.toHaveBeenCalled();
  });
  it('recupera uma leitura ainda na fila ao reabrir o site', async () => {
    rows.push({ ...input, user_id: owner, status: 'queued' }); await request();
    await vi.waitFor(() => expect(rows[0].status).toBe('ready')); expect(read).toHaveBeenCalledOnce();
  });
  it('não remove o original de uma leitura já importada', async () => {
    await request('POST', '', input); await vi.waitFor(() => expect(rows[0].status).toBe('ready'));
    expect((await request('POST', `/${id}/complete`)).status).toBe(200);
    expect((await request('DELETE', `/${id}`)).status).toBe(404);
    expect(rows[0].status).toBe('completed'); expect(remove).not.toHaveBeenCalled();
  });
  it('retoma uma falha com o mesmo original e rejeita repetição por outra conta', async () => {
    read.mockRejectedValueOnce({status:503});
    await request('POST', '', input); await vi.waitFor(() => expect(rows[0].status).toBe('failed'));
    expect((await request('POST', `/${id}/retry`, undefined, 'other')).status).toBe(404);
    expect((await request('POST', `/${id}/retry`)).status).toBe(202);
    await vi.waitFor(() => expect(rows[0].status).toBe('ready'));
    expect(rows).toHaveLength(1); expect(download).toHaveBeenCalledTimes(2); expect(read).toHaveBeenCalledTimes(2);
    expect(remove).not.toHaveBeenCalled();
  });
  it('repete só o salvamento quando o banco falha após a IA concluir', async () => {
    resultSaveFailures = 2;
    await request('POST', '', input); await vi.waitFor(() => expect(rows[0].status).toBe('ready'));
    expect(read).toHaveBeenCalledOnce(); expect(recoveryFiles.has(`${owner}/${id}/result.json`)).toBe(true);
  });
  it('recupera resultado durável após todas as tentativas de salvar no banco falharem', async () => {
    resultSaveFailures = 5;
    await request('POST', '', input); await vi.waitFor(() => expect(rows[0].status).toBe('saving'));
    await vi.waitFor(() => expect(rows[0].error).toContain('Leitura concluída'));
    rows[0].lease_expires_at = '2020-01-01T00:00:00Z';
    await request(); await vi.waitFor(() => expect(rows[0].status).toBe('ready'));
    expect(read).toHaveBeenCalledOnce(); expect(download).toHaveBeenCalledOnce();
  });
  it('não chama a IA se não puder consultar um resultado já preservado', async () => {
    recoveryDownload.mockResolvedValue({data:null,error:{statusCode:'500',message:'Unavailable'}});
    await request('POST', '', input); await vi.waitFor(() => expect(rows[0].status).toBe('failed'));
    expect(read).not.toHaveBeenCalled(); expect(download).not.toHaveBeenCalled();
  });
  it('reaproveita uma parte concluída quando a parte seguinte falha', async () => {
    let generatedParts = 0;
    read.mockImplementation(async (_config, _key, _file, _hint, _signal, context) => {
      const cached = await context.loadPart(0, 'part-hash');
      if (!cached) { generatedParts++; await context.savePart(0, 'part-hash', extraction); throw {status:503}; }
      return cached;
    });
    await request('POST', '', input); await vi.waitFor(() => expect(rows[0].status).toBe('failed'));
    await request('POST', `/${id}/retry`); await vi.waitFor(() => expect(rows[0].status).toBe('ready'));
    expect(generatedParts).toBe(1);
  });
});
