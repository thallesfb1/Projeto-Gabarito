// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
const mocks = vi.hoisted(() => ({ list: vi.fn(), submit: vi.fn(), cancel: vi.fn(), complete: vi.fn(), notify: vi.fn(), retry: vi.fn() }));
vi.mock('../utils/aiJobClient', () => ({ listAIJobs: mocks.list, submitAIJob: mocks.submit, cancelAIJob: mocks.cancel, completeAIJob: mocks.complete, retryAIJob: mocks.retry }));
vi.mock('../components/AICompletionNotice', () => ({ notifyCompletedReading: mocks.notify }));
import { useAIReadingJobs } from './useAIReadingJobs';
import type { AIReadingJob } from '../utils/aiJobs';
const job = { id: 'job1', user_id: 'account1', proof_id: 'proof1', mode: 'exam', status: 'running', source: { name: 'prova.pdf' }, target_snapshot: null } as AIReadingJob;
beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); mocks.list.mockResolvedValue([]); mocks.submit.mockResolvedValue(job); mocks.cancel.mockResolvedValue({ ok: true }); mocks.complete.mockResolvedValue({ ok: true }); });
afterEach(cleanup);
describe('acompanhamento de leituras sem bloquear a navegação', () => {
  it('uma leitura que falhou pode concluir após repetir e recebe um novo aviso', async () => {
    const failed={...job,status:'failed' as const,started_at:'2026-10-04T02:00:00Z'};
    mocks.list.mockResolvedValue([failed]);
    const {result}=renderHook(()=>useAIReadingJobs('account1',true));
    await waitFor(()=>expect(result.current.notice?.status).toBe('failed'));
    const retried={...job,started_at:'2026-10-04T02:05:00Z'};
    mocks.retry.mockResolvedValue(retried);mocks.list.mockResolvedValue([retried]);
    await act(async()=>{await result.current.retry(failed);});
    mocks.list.mockResolvedValue([{...retried,status:'ready'}]);act(()=>result.current.refresh());
    await waitFor(()=>expect(result.current.notice?.status).toBe('ready'));
    expect(mocks.notify).toHaveBeenCalledTimes(1);expect(mocks.submit).not.toHaveBeenCalled();
  });
  it('uma consulta antiga não esconde uma leitura recém-enviada', async () => {
    let finish!: (value: AIReadingJob[]) => void;
    mocks.list.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
    const { result } = renderHook(() => useAIReadingJobs('account1', true));
    await act(async () => { await result.current.start(new File(['pdf'], 'prova.pdf'), 'exam', null, ''); });
    expect(result.current.jobs[0].id).toBe(job.id);
    await act(async () => { finish([]); });
    expect(result.current.jobs[0].id).toBe(job.id);
  });
  it('troca de conta ignora um resultado atrasado e não emite aviso para outra conta', async () => {
    let finish!: (value: AIReadingJob[]) => void;
    mocks.list.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
    const { result, rerender } = renderHook(({ scope }) => useAIReadingJobs(scope, true), { initialProps: { scope: 'account1' } });
    rerender({ scope: 'account2' });
    await act(async () => { finish([{ ...job, status: 'ready' }]); });
    expect(result.current.jobs).toEqual([]); expect(result.current.notice).toBeNull(); expect(mocks.notify).not.toHaveBeenCalled();
  });
  it('uma consulta atrasada não ressuscita leitura cancelada nem dispara notificação', async () => {
    mocks.list.mockResolvedValueOnce([job]);
    const { result } = renderHook(() => useAIReadingJobs('account1', true));
    await waitFor(() => expect(result.current.jobs).toHaveLength(1));
    let finish!: (value: AIReadingJob[]) => void;
    mocks.list.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
    act(() => result.current.refresh());
    await act(async () => { await result.current.remove(job); finish([{ ...job, status: 'ready' }]); });
    expect(result.current.jobs).toEqual([]); expect(result.current.notice).toBeNull(); expect(mocks.notify).not.toHaveBeenCalled();
  });
});
