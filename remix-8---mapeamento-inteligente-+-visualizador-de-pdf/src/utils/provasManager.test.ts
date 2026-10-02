import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';

beforeEach(() => {
  vi.resetModules();
  const values = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key), clear: () => values.clear() });
  vi.stubGlobal('window', { indexedDB: new IDBFactory() });
});

describe('provas e recuperação', () => {
  it('resgata provas do IndexedDB sem sobrescrever com estado vazio', async () => {
    const manager = await import('./provasManager');
    const db = await import('./indexedDbStorage');
    const prova = manager.createNewSimulado('Minha prova', 4);
    const saved = { version: 3, activeId: prova.id, provas: [prova] };
    await db.saveStoreToIndexedDB(saved);
    const result = await manager.syncStoreWithIndexedDB(manager.loadMultiSimuladoStore());
    expect(result.updated).toBe(true);
    expect(result.store.provas[0].title).toBe('Minha prova');
    expect((await db.loadStoreFromIndexedDB())?.provas).toHaveLength(1);
  });
  it('respeita um catálogo intencionalmente vazio', async () => {
    const manager = await import('./provasManager');
    const db = await import('./indexedDbStorage');
    const prova = manager.createNewSimulado();
    await db.saveStoreToIndexedDB({ version: 3, activeId: prova.id, provas: [prova] });
    localStorage.setItem(manager.STORAGE_MULTI_KEY, JSON.stringify({ version: 3, activeId: '', provas: [] }));
    const result = await manager.syncStoreWithIndexedDB(manager.loadMultiSimuladoStore());
    expect(result.updated).toBe(false);
    expect(result.store.provas).toHaveLength(0);
  });
  it('migra a versão antiga mesmo com o armazenamento moderno corrompido', async () => {
    const manager = await import('./provasManager');
    localStorage.setItem(manager.STORAGE_MULTI_KEY, '{broken');
    localStorage.setItem(manager.STORAGE_LEGACY_V2, JSON.stringify({ title: 'Antiga', totalQuestions: 3, userAnswers: ['A', null, 'B'] }));
    expect(manager.loadMultiSimuladoStore().provas[0]).toMatchObject({ title: 'Antiga', userAnswers: ['A', null, 'B'] });
    expect(localStorage.getItem(manager.STORAGE_MULTI_KEY)).toBe('{broken'); // Loading never writes.
  });
  it('isola dados e snapshots de visitante e de duas contas', async () => {
    const manager = await import('./provasManager');
    const db = await import('./indexedDbStorage');
    for (const scope of ['guest', 'alice', 'bob']) {
      const prova = manager.createNewSimulado(scope);
      const store = { version: 3, activeId: prova.id, provas: [prova] };
      await manager.saveMultiSimuladoStore(store, undefined, scope);
      await db.saveSnapshotToIndexedDB(store, 'Teste', scope);
    }
    for (const scope of ['guest', 'alice', 'bob']) {
      expect(manager.loadMultiSimuladoStore(scope).provas[0].title).toBe(scope);
      expect((await db.loadStoreFromIndexedDB(scope))?.provas[0].title).toBe(scope);
      expect((await db.getSnapshotsFromIndexedDB(scope))[0].data.provas[0].title).toBe(scope);
    }
    await db.clearAllSnapshots('alice');
    expect(await db.getSnapshotsFromIndexedDB('alice')).toHaveLength(0);
    expect(await db.getSnapshotsFromIndexedDB('bob')).toHaveLength(1);
  });
  it('limita snapshots por conta sem remover os de outra conta', async () => {
    const manager = await import('./provasManager'); const db = await import('./indexedDbStorage');
    const prova = manager.createNewSimulado(); const store = { version: 3, activeId: prova.id, provas: [prova] };
    await db.saveSnapshotToIndexedDB(store, 'Outro usuário', 'bob');
    for (let index = 0; index < 18; index++) await db.saveSnapshotToIndexedDB(store, `Snapshot ${index}`, 'alice');
    expect(await db.getSnapshotsFromIndexedDB('alice')).toHaveLength(15);
    expect(await db.getSnapshotsFromIndexedDB('bob')).toHaveLength(1);
  });
  it('normaliza alternativas, índices e tamanhos sem alocações ilimitadas', async () => {
    const { sanitizeSimulado } = await import('./provasManager');
    const prova = sanitizeSimulado({ totalQuestions: 3.8, examType: 'true_false', userAnswers: ['C', 'E', 'A'], flaggedQuestions: [-1, 0, 0, 100, 1.5], timeSpentSeconds: Infinity });
    expect(prova).toMatchObject({ totalQuestions: 3, userAnswers: ['V', 'F', null], flaggedQuestions: [0], timeSpentSeconds: 0 });
    expect(sanitizeSimulado({ totalQuestions: Infinity }).totalQuestions).toBe(70);
  });
  it('valida backups antigos e rejeita estruturas inválidas', async () => {
    const { validateAndParseBackup } = await import('./provasManager');
    expect(validateAndParseBackup(JSON.stringify({ simulados: [{ title: 'Antiga', totalQuestions: 2, userAnswers: ['A', null] }] })).valid).toBe(true);
    for (const value of [[null], [{}], [{ totalQuestions: 1e10, userAnswers: [] }], [{ totalQuestions: 1.5, userAnswers: [] }]]) expect(validateAndParseBackup(JSON.stringify(value)).valid).toBe(false);
  });
  it('mantém IDs únicos ao importar duplicatas', async () => {
    const { validateAndParseBackup } = await import('./provasManager');
    const prova = { id: 'same', userAnswers: ['A'] };
    const result = validateAndParseBackup(JSON.stringify([prova, prova]));
    expect(new Set(result.data?.provas.map(item => item.id)).size).toBe(2);
  });
});
