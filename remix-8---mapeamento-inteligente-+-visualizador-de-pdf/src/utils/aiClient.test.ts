// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { waitFor } from '@testing-library/react';
vi.mock('./supabase', () => ({ supabase: null }));
import { extractWithAI } from './aiClient';
import { AI_EXTRACTION_TIMEOUT_MS, AI_RESPONSE_GRACE_MS, AI_READING_TIMEOUT_MESSAGE } from './aiTiming';

const extraction = { title: 'Prova', examType: 'multiple_choice', totalQuestions: 1, questions: [{ number: 1, statement: 'Enunciado', options: [] }], answers: [], warnings: [] };
let fetchMock: ReturnType<typeof vi.fn>;
function pdf() {
  return Object.assign(new File(['%PDF-1.7'], 'prova.pdf', { type: 'application/pdf' }), { arrayBuffer: async () => new TextEncoder().encode('%PDF-1.7').buffer });
}
beforeEach(() => {
  fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ extraction }) });
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('espera e recuperação da leitura no navegador', () => {
  it('dá ao servidor o prazo da leitura mais a margem de resposta', async () => {
    const timeout = vi.spyOn(AbortSignal, 'timeout');
    const result = await extractWithAI(pdf(), 'exam', new AbortController().signal);
    expect(result.title).toBe('Prova');
    expect(timeout).toHaveBeenCalledWith(AI_EXTRACTION_TIMEOUT_MS + AI_RESPONSE_GRACE_MS);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it('explica o timeout do navegador em vez de mostrar a mensagem técnica de abort', async () => {
    const deadline = new AbortController();
    vi.spyOn(AbortSignal, 'timeout').mockReturnValue(deadline.signal);
    fetchMock.mockImplementation((_url, init) => new Promise((_resolve, reject) => init.signal.addEventListener('abort', () => reject(init.signal.reason), { once: true })));
    const request = expect(extractWithAI(pdf(), 'exam', new AbortController().signal)).rejects.toThrow(AI_READING_TIMEOUT_MESSAGE);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    deadline.abort(new DOMException('The operation timed out', 'TimeoutError'));
    await request;
  });
  it('preserva o cancelamento solicitado pelo usuário', async () => {
    const cancel = new AbortController();
    fetchMock.mockImplementation((_url, init) => new Promise((_resolve, reject) => init.signal.addEventListener('abort', () => reject(init.signal.reason), { once: true })));
    const request = expect(extractWithAI(pdf(), 'exam', cancel.signal)).rejects.toMatchObject({ name: 'AbortError' });
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    cancel.abort();
    await request;
  });
  it('orienta uma nova tentativa se a conexão cair e não reenvia o arquivo automaticamente pelo navegador', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(extractWithAI(pdf(), 'exam', new AbortController().signal)).rejects.toThrow('Confira a conexão e tente novamente');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
