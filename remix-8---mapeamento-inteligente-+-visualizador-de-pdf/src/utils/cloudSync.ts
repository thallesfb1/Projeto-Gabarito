import { MultiSimuladoStore, SimuladoData } from '../types';
import { sanitizeSimulado } from './provasManager';
import { SupabaseClient } from '@supabase/supabase-js';
import {orderedProofs} from './proofOrder';

export interface CloudRecord { id: string; user_id: string; title: string; data: SimuladoData; updated_at: string }
export type CloudBaseline = Record<string, CloudRecord>;

export function proofFromRow(row: CloudRecord): SimuladoData {
  if (!row.data || typeof row.data !== 'object' || !Array.isArray(row.data.userAnswers)) {
    throw new Error('Uma prova da conta tem formato incompatível. Os dados locais foram preservados.');
  }
  return sanitizeSimulado({
    ...row.data, id: row.id, title: row.title,
    createdAt: row.data.createdAt || row.updated_at,
    date: row.data.date || new Date(row.updated_at).toLocaleDateString('pt-BR'),
    updatedAt: row.data.updatedAt || row.updated_at,
    subjectRanges: row.data.subjectRanges?.map((range, index) => ({ ...range, id: range.id || `${row.id}_subject_${index}` })),
  });
}

const fingerprint = (prova: SimuladoData) => JSON.stringify(prova);

// Three-way merge: cloud wins only when the local copy has no pending edits.
// Conflicting edits are retained as a separate card rather than overwritten.
export function reconcileCloud(local: MultiSimuladoStore, previous: CloudBaseline, remote: CloudBaseline): MultiSimuladoStore {
  const result: SimuladoData[] = [];
  const localById = new Map(local.provas.map(prova => [prova.id, prova]));
  for (const [id, row] of Object.entries(remote)) {
    const current = localById.get(id);
    const baseline = previous[id] ? proofFromRow(previous[id]) : null;
    const cloud = proofFromRow(row);
    if (!current && baseline) continue; // Pending local deletion.
    if (!current) { result.push(cloud); continue; }
    localById.delete(id);
    const localChanged = !baseline || fingerprint(current) !== fingerprint(baseline);
    const remoteChanged = !baseline || row.updated_at !== previous[id].updated_at;
    if (localChanged && remoteChanged && fingerprint(current) !== fingerprint(cloud)) {
      result.push(cloud, { ...current, id: `${current.id}_conflict_${crypto.randomUUID()}`, title: `${current.title} (cópia local)`, updatedAt: new Date().toISOString() });
    } else {
      result.push(localChanged ? current : cloud);
    }
  }
  for (const [id, prova] of localById) {
    const before = previous[id];
    if (!before || fingerprint(prova) !== fingerprint(proofFromRow(before))) result.push(prova);
  }
  return { version: 3, activeId: result.some(prova => prova.id === local.activeId) ? local.activeId : result[0]?.id || '', provas: orderedProofs(result) };
}

export async function readCloud(client: SupabaseClient, userId: string): Promise<CloudBaseline> {
  const records: CloudBaseline = {};
  for (let page = 0; ; page += 1) {
    const { data, error } = await client.from('provas').select('id,user_id,title,data,updated_at').eq('user_id', userId).order('id').range(page * 500, page * 500 + 499);
    if (error) throw error;
    for (const row of (data || []) as CloudRecord[]) {
      proofFromRow(row); // Validate before replacing anything locally.
      records[row.id] = row;
    }
    if (!data || data.length < 500) return records;
  }
}

export async function writeCloud(client: SupabaseClient, userId: string, store: MultiSimuladoStore, baseline: CloudBaseline, checkpoint: (records: CloudBaseline) => void): Promise<void> {
  const localIds = new Set(store.provas.map(prova => prova.id));
  for (const prova of store.provas) {
    const before = baseline[prova.id];
    if (before && fingerprint(prova) === fingerprint(proofFromRow(before))) continue;
    const row = { id: prova.id, user_id: userId, title: prova.title, data: prova, updated_at: new Date().toISOString() };
    const query = before
      ? client.from('provas').update(row).eq('id', prova.id).eq('user_id', userId).eq('updated_at', before.updated_at)
      : client.from('provas').insert(row);
    const { data, error } = await query.select('id,user_id,title,data,updated_at');
    if (error) throw error;
    if (!data?.length) throw new Error('Esta prova foi alterada em outro dispositivo. Sincronize novamente para preservar as duas versões.');
    baseline[prova.id] = data[0] as CloudRecord;
    checkpoint(baseline);
  }
  for (const [id, before] of Object.entries(baseline)) {
    if (localIds.has(id)) continue;
    const { data, error } = await client.from('provas').delete().eq('id', id).eq('user_id', userId).eq('updated_at', before.updated_at).select('id');
    if (error) throw error;
    if (!data?.length) throw new Error('A prova foi alterada em outro dispositivo. Sincronize antes de excluí-la.');
    delete baseline[id];
    checkpoint(baseline);
  }
}
