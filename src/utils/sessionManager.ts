import { SimuladoData, SimuladoStats, ExamType } from '../types';
import { computeSimuladoStats } from './parser';

export const STORAGE_SESSIONS_KEY = 'gabarito_sessions_history_v1';

export interface SessionRecord {
  id: string;
  simuladoId: string;
  title: string;
  date: string;
  timestamp: string; // ISO
  totalQuestions: number;
  hits: number;
  misses: number;
  blanks: number;
  hitRatio: number; // 0 to 100 (%)
  missRatio: number; // 0 to 100 (%)
  ratio: number; // hits / (misses || 1)
  examType?: ExamType;
  netScore?: number;
}

export interface ChartSessionPoint {
  id: string;
  name: string; // "Sessão 1", etc.
  shortName: string; // "S1"
  title: string;
  date: string;
  hitRatio: number;
  missRatio: number;
  ratio: number;
  hits: number;
  misses: number;
  blanks: number;
  total: number;
  isCurrent?: boolean;
}

/**
 * Loads stored sessions from localStorage.
 * If empty or missing, synthesizes sessions from any already corrected exams in `provas`.
 */
export function loadSessionHistory(provas: SimuladoData[] = []): SessionRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_SESSIONS_KEY);
    let list: SessionRecord[] = [];
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        list = parsed.filter(item => typeof item === 'object' && item !== null && typeof item.hits === 'number');
      }
    }

    // If list is empty, synthesize sessions from existing corrected exams
    if (list.length === 0 && provas.length > 0) {
      const correctedProvas = provas.filter(p => p.isCorrected);
      for (const p of correctedProvas) {
        const stats = computeSimuladoStats(p);
        const evaluatedTotal = stats.keyCount > 0 ? stats.keyCount : stats.total;
        const hitRatio = evaluatedTotal > 0 ? Number(((stats.hits / evaluatedTotal) * 100).toFixed(1)) : 0;
        const missRatio = evaluatedTotal > 0 ? Number(((stats.misses / evaluatedTotal) * 100).toFixed(1)) : 0;
        const ratio = stats.misses > 0 ? Number((stats.hits / stats.misses).toFixed(2)) : stats.hits;

        list.push({
          id: `sess_${p.id}_${Date.parse(p.updatedAt || p.createdAt) || Date.now()}`,
          simuladoId: p.id,
          title: p.title,
          date: p.date,
          timestamp: p.updatedAt || p.createdAt || new Date().toISOString(),
          totalQuestions: p.totalQuestions,
          hits: stats.hits,
          misses: stats.misses,
          blanks: stats.blanks,
          hitRatio,
          missRatio,
          ratio,
          examType: p.examType,
          netScore: stats.netScore,
        });
      }
      if (list.length > 0) {
        saveSessionHistory(list);
      }
    }

    // Sort chronologically ascending (oldest first, so newest is on the right)
    return list.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  } catch (err) {
    console.error('Erro ao carregar histórico de sessões:', err);
    return [];
  }
}

/**
 * Persists session history to localStorage (caps at last 30 sessions).
 */
export function saveSessionHistory(sessions: SessionRecord[]): void {
  try {
    const capped = sessions.slice(-30);
    localStorage.setItem(STORAGE_SESSIONS_KEY, JSON.stringify(capped));
  } catch (err) {
    console.warn('Não foi possível salvar histórico de sessões:', err);
  }
}

/**
 * Records or updates a session upon exam correction.
 */
export function recordCorrectionSession(
  simulado: SimuladoData,
  stats: SimuladoStats,
  currentHistory: SessionRecord[] = []
): SessionRecord[] {
  const evaluatedTotal = stats.keyCount > 0 ? stats.keyCount : stats.total;
  const hitRatio = evaluatedTotal > 0 ? Number(((stats.hits / evaluatedTotal) * 100).toFixed(1)) : 0;
  const missRatio = evaluatedTotal > 0 ? Number(((stats.misses / evaluatedTotal) * 100).toFixed(1)) : 0;
  const ratio = stats.misses > 0 ? Number((stats.hits / stats.misses).toFixed(2)) : stats.hits;
  const nowIso = new Date().toISOString();

  // Create new session record
  const newRecord: SessionRecord = {
    id: `sess_${simulado.id}_${Date.now()}`,
    simuladoId: simulado.id,
    title: simulado.title,
    date: simulado.date,
    timestamp: nowIso,
    totalQuestions: simulado.totalQuestions,
    hits: stats.hits,
    misses: stats.misses,
    blanks: stats.blanks,
    hitRatio,
    missRatio,
    ratio,
    examType: simulado.examType,
    netScore: stats.netScore,
  };

  // Check if there is an existing session for this exact simulado within the last 5 minutes
  // (to prevent spamming multiple dots if the user recalculates or locks/unlocks)
  const existingIdx = currentHistory.findIndex(
    s => s.simuladoId === simulado.id && Math.abs(new Date(s.timestamp).getTime() - Date.now()) < 5 * 60 * 1000
  );

  let updatedList: SessionRecord[];
  if (existingIdx !== -1) {
    updatedList = [...currentHistory];
    updatedList[existingIdx] = {
      ...newRecord,
      id: updatedList[existingIdx].id,
      timestamp: updatedList[existingIdx].timestamp, // keep original time
    };
  } else {
    updatedList = [...currentHistory, newRecord];
  }

  // Sort chronologically
  updatedList.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  saveSessionHistory(updatedList);
  return updatedList;
}

/**
 * Returns formatted data for Recharts, representing up to the last 5 sessions.
 * Guarantees that the currently active exam's current result is included as the latest session.
 */
export function getLast5SessionsForChart(
  history: SessionRecord[],
  activeSimulado?: SimuladoData | null,
  activeStats?: SimuladoStats | null
): ChartSessionPoint[] {
  let list = [...history];

  // If active simulado is corrected and stats are provided, ensure it is the latest entry
  if (activeSimulado && activeSimulado.isCorrected && activeStats) {
    const evaluatedTotal = activeStats.keyCount > 0 ? activeStats.keyCount : activeStats.total;
    const hitRatio = evaluatedTotal > 0 ? Number(((activeStats.hits / evaluatedTotal) * 100).toFixed(1)) : 0;
    const missRatio = evaluatedTotal > 0 ? Number(((activeStats.misses / evaluatedTotal) * 100).toFixed(1)) : 0;
    const ratio = activeStats.misses > 0 ? Number((activeStats.hits / activeStats.misses).toFixed(2)) : activeStats.hits;

    const hasMatch = list.some(
      s => s.simuladoId === activeSimulado.id && Math.abs(new Date(s.timestamp).getTime() - Date.now()) < 10 * 60 * 1000
    );

    if (!hasMatch) {
      list.push({
        id: `current_${activeSimulado.id}`,
        simuladoId: activeSimulado.id,
        title: activeSimulado.title,
        date: activeSimulado.date,
        timestamp: new Date().toISOString(),
        totalQuestions: activeSimulado.totalQuestions,
        hits: activeStats.hits,
        misses: activeStats.misses,
        blanks: activeStats.blanks,
        hitRatio,
        missRatio,
        ratio,
        examType: activeSimulado.examType,
        netScore: activeStats.netScore,
      });
    }
  }

  // Take the last 5 sessions
  const last5 = list.slice(-5);

  return last5.map((s, idx) => {
    const sessionNum = idx + 1;
    const isCurrent = activeSimulado ? s.simuladoId === activeSimulado.id : idx === last5.length - 1;
    return {
      id: s.id,
      name: `Sessão ${sessionNum}`,
      shortName: `S${sessionNum}`,
      title: s.title,
      date: s.date,
      hitRatio: s.hitRatio,
      missRatio: s.missRatio,
      ratio: s.ratio,
      hits: s.hits,
      misses: s.misses,
      blanks: s.blanks,
      total: s.totalQuestions,
      isCurrent,
    };
  });
}
