// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StrictMode } from 'react';
import { useWorkspace } from './useWorkspace';
import { createNewSimulado, STORAGE_MULTI_KEY } from '../utils/provasManager';
import type { Session } from '@supabase/supabase-js';

const mocks = vi.hoisted(() => ({
  records: new Map(), snapshots: vi.fn(),
  authCallback: null as null | ((event: string, session: unknown) => void),
  read: vi.fn(), write: vi.fn(),
}));
vi.mock('../utils/indexedDbStorage', () => ({
  loadStoreFromIndexedDB: async (scope = 'guest') => mocks.records.get(scope) || null,
  saveStoreToIndexedDB: async (store: unknown, scope = 'guest') => { mocks.records.set(scope, structuredClone(store)); return true; },
  saveSnapshotToIndexedDB: (...args: unknown[]) => mocks.snapshots(...args) || Promise.resolve({ id: 'snapshot' }),
  requestPersistentStorage: async () => false,
}));
vi.mock('../utils/supabase', () => ({ supabase: {
  auth: {
    onAuthStateChange: (callback: typeof mocks.authCallback) => { mocks.authCallback = callback; queueMicrotask(() => callback?.('INITIAL_SESSION', null)); return { data: { subscription: { unsubscribe: vi.fn() } } }; },
    getSession: async () => ({ data: { session: null }, error: null }),
    signInWithOAuth: async () => ({ error: null }), signOut: async () => ({ error: null }),
  },
} }));
vi.mock('../utils/cloudSync', async () => ({ ...(await vi.importActual('../utils/cloudSync')), readCloud: (...args: unknown[]) => mocks.read(...args), writeCloud: (...args: unknown[]) => mocks.write(...args) }));

beforeEach(() => { localStorage.clear(); mocks.records.clear(); vi.clearAllMocks(); mocks.snapshots.mockReset(); mocks.read.mockResolvedValue({}); mocks.write.mockResolvedValue(undefined); });
afterEach(() => { cleanup(); vi.useRealTimers(); });
const asStore = (title: string) => { const prova = createNewSimulado(title, 2); return { version: 3, activeId: prova.id, provas: [prova] }; };

describe('inicialização e contas', () => {
  it('recupera o IndexedDB antes de salvar, inclusive no StrictMode', async () => {
    mocks.records.set('guest', asStore('Prova antiga'));
    const { result } = renderHook(() => useWorkspace(), { wrapper: StrictMode });
    expect(result.current.isStorageReady).toBe(false);
    await waitFor(() => expect(result.current.isStorageReady).toBe(true));
    expect(result.current.store.provas[0].title).toBe('Prova antiga');
    expect(mocks.records.get('guest').provas[0].title).toBe('Prova antiga');
  });
  it('preserva os dados do visitante ao entrar em uma conta e recupera provas da conta', async () => {
    localStorage.setItem(STORAGE_MULTI_KEY, JSON.stringify(asStore('Visitante')));
    const cloud = asStore('Salva na conta').provas[0];
    mocks.read.mockResolvedValue({ [cloud.id]: { id: cloud.id, title: cloud.title, data: cloud, user_id: 'alice', updated_at: cloud.updatedAt } });
    const { result } = renderHook(() => useWorkspace());
    await waitFor(() => expect(result.current.isStorageReady).toBe(true));
    act(() => mocks.authCallback?.('SIGNED_IN', { user: { id: 'alice', user_metadata: {} } } as Session));
    await waitFor(() => expect(result.current.store.provas[0]?.title).toBe('Salva na conta'));
    expect(JSON.parse(localStorage.getItem(STORAGE_MULTI_KEY)!).provas[0].title).toBe('Visitante');
    expect(result.current.scope).toBe('alice');
    act(() => mocks.authCallback?.('SIGNED_OUT', null));
    await waitFor(() => expect(result.current.store.provas[0]?.title).toBe('Visitante'));
  });
  it('não envia dados enquanto a recuperação da conta falhou', async () => {
    mocks.read.mockRejectedValue(new Error('offline'));
    const { result } = renderHook(() => useWorkspace());
    await waitFor(() => expect(result.current.isStorageReady).toBe(true));
    act(() => mocks.authCallback?.('SIGNED_IN', { user: { id: 'alice', user_metadata: {} } } as Session));
    await waitFor(() => expect(result.current.cloudStatus).toBe('error'));
    expect(result.current.error).toContain('preservados');
    act(() => result.current.setStore(asStore('Prova offline')));
    expect(mocks.write).not.toHaveBeenCalled();
  });
  it('não importa provas do visitante em outra conta após uma troca durante o snapshot', async () => {
    localStorage.setItem(STORAGE_MULTI_KEY, JSON.stringify(asStore('Visitante')));
    const { result } = renderHook(() => useWorkspace());
    await waitFor(() => expect(result.current.isStorageReady).toBe(true));
    act(() => mocks.authCallback?.('SIGNED_IN', { user: { id: 'alice', user_metadata: {} } } as Session));
    await waitFor(() => expect(result.current.scope === 'alice' && result.current.isStorageReady).toBe(true));
    let release: (value: unknown) => void = () => {};
    mocks.snapshots.mockImplementationOnce(() => new Promise(resolve => { release = resolve; }));
    const pending = result.current.importGuest().catch(cause => cause.message);
    await waitFor(() => expect(mocks.snapshots).toHaveBeenCalled());
    act(() => mocks.authCallback?.('SIGNED_IN', { user: { id: 'bob', user_metadata: {} } } as Session));
    await waitFor(() => expect(result.current.scope === 'bob' && result.current.isStorageReady).toBe(true));
    await act(async () => { release({ id: 'snapshot' }); });
    expect(await pending).toContain('conta mudou');
    expect(result.current.store.provas).toHaveLength(0);
  });
  it('cria snapshots após dez minutos mesmo com alterações contínuas', async () => {
    vi.useFakeTimers();
    localStorage.setItem(STORAGE_MULTI_KEY, JSON.stringify(asStore('Treino')));
    const { result } = renderHook(() => useWorkspace());
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(result.current.isStorageReady).toBe(true);
    for (let index = 0; index < 10; index++) {
      act(() => result.current.setStore(current => ({ ...current, provas: current.provas.map(prova => ({ ...prova, timeSpentSeconds: index * 60 })) })));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(60000);
      });
    }
    expect(mocks.snapshots).toHaveBeenCalledWith(expect.objectContaining({ provas: expect.arrayContaining([expect.objectContaining({ timeSpentSeconds: 540 })]) }), 'Ponto Automático', 'guest');
  });
});
