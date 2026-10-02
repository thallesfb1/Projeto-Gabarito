import { describe, expect, it, vi } from 'vitest';
import { proofFromRow, reconcileCloud, CloudRecord, writeCloud } from './cloudSync';
import { createNewSimulado } from './provasManager';
import type { SupabaseClient } from '@supabase/supabase-js';

const row = (): CloudRecord => { const prova = { ...createNewSimulado('Minha prova', 2), id: 'proof', createdAt: '2026-01-01', updatedAt: '2026-01-01' }; return { id: prova.id, user_id: 'alice', title: prova.title, data: prova, updated_at: '2026-01-01T00:00:00Z' }; };
describe('sincronização de provas', () => {
  it('recupera todas as provas da conta em um dispositivo vazio', () => {
    const remote = row();
    expect(reconcileCloud({ version: 3, activeId: '', provas: [] }, {}, { proof: remote }).provas[0].id).toBe('proof');
  });
  it('carrega dados antigos sem gerar timestamps diferentes em cada leitura', () => {
    const remote = row(); remote.data = { ...remote.data, createdAt: undefined, updatedAt: undefined } as unknown as CloudRecord['data'];
    expect(proofFromRow(remote)).toEqual(proofFromRow(remote));
  });
  it('mantém uma cópia quando a prova foi editada em dois dispositivos', () => {
    const previous = row();
    const local = { ...previous.data, userAnswers: ['B' as const, null] };
    const remote = { ...previous, updated_at: '2026-02-01', data: { ...previous.data, userAnswers: ['C' as const, null] } };
    const result = reconcileCloud({ version: 3, activeId: 'proof', provas: [local] }, { proof: previous }, { proof: remote });
    expect(result.provas).toHaveLength(2);
    expect(result.provas.map(item => item.userAnswers[0])).toEqual(['C', 'B']);
  });
  it('preserva edições locais pendentes quando o remoto não mudou', () => {
    const previous = row(); const local = { ...previous.data, notes: 'Alteração local' };
    const result = reconcileCloud({ version: 3, activeId: 'proof', provas: [local] }, { proof: previous }, { proof: previous });
    expect(result.provas).toHaveLength(1); expect(result.provas[0].notes).toBe('Alteração local');
  });
  it('respeita exclusões pendentes e exclusões feitas em outro dispositivo', () => {
    const previous = row();
    expect(reconcileCloud({ version: 3, activeId: '', provas: [] }, { proof: previous }, { proof: previous }).provas).toHaveLength(0);
    expect(reconcileCloud({ version: 3, activeId: 'proof', provas: [previous.data] }, { proof: previous }, {}).provas).toHaveLength(0);
  });
  it('não grava provas inalteradas', async () => {
    const previous = row(); const client = { from: vi.fn() };
    await writeCloud(client as unknown as SupabaseClient, 'alice', { version: 3, activeId: 'proof', provas: [proofFromRow(previous)] }, { proof: previous }, vi.fn());
    expect(client.from).not.toHaveBeenCalled();
  });
  it('bloqueia atualizações quando a revisão remota mudou', async () => {
    const previous = row(); const filters: unknown[][] = [];
    const query = { eq: (...args: unknown[]) => { filters.push(args); return query; }, select: async () => ({ data: [], error: null }) };
    const client = { from: () => ({ update: () => query }) };
    await expect(writeCloud(client as unknown as SupabaseClient, 'alice', { version: 3, activeId: 'proof', provas: [{ ...previous.data, notes: 'nova' }] }, { proof: previous }, vi.fn())).rejects.toThrow('outro dispositivo');
    expect(filters).toContainEqual(['user_id', 'alice']); expect(filters).toContainEqual(['updated_at', previous.updated_at]);
  });
});
