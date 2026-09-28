import { SimuladoData, MultiSimuladoStore, FullBackupData, AnswerOption, ExamType } from '../types';
import { parseAnswers, downloadFile } from './parser';
import {
  saveStoreToIndexedDB,
  loadStoreFromIndexedDB,
  saveSnapshotToIndexedDB,
  requestPersistentStorage,
} from './indexedDbStorage';

export const STORAGE_MULTI_KEY = 'gabarito-multi-v1';
export const STORAGE_LEGACY_V2 = 'gabarito-simulado-v2';
export const STORAGE_LEGACY_V1 = 'gabarito-state';

// 70 questions sample official key for initial default exam
const INITIAL_70_KEY =
  'DABECEADBCAECABDBCCB' +
  'EBDBADEDCAEAAEEABDEC' +
  'DCBEDACACACBEDDCCBCA' +
  'DBEEABEDDB';

export function generateSimuladoId(): string {
  return `prova_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

export function createNewSimulado(
  title?: string,
  totalQuestions: number = 70,
  existingCount: number = 0,
  examType: ExamType = 'multiple_choice'
): SimuladoData {
  const finalTitle = title?.trim() || `Cartão-Resposta ${existingCount + 1}`;
  const now = new Date().toISOString();
  const validTotal = Math.max(1, Math.min(200, totalQuestions));

  return {
    id: generateSimuladoId(),
    title: finalTitle,
    date: new Date().toLocaleDateString('pt-BR'),
    createdAt: now,
    updatedAt: now,
    totalQuestions: validTotal,
    userAnswers: new Array(validTotal).fill(null),
    keyAnswers: new Array(validTotal).fill(null),
    flaggedQuestions: [],
    isCorrected: false,
    isLocked: false,
    isResultOutdated: false,
    timeSpentSeconds: 0,
    notes: '',
    examType: examType === 'true_false' ? 'true_false' : 'multiple_choice',
  };
}

export function duplicateSimulado(source: SimuladoData): SimuladoData {
  const now = new Date().toISOString();
  return {
    ...source,
    id: generateSimuladoId(),
    title: `${source.title} (Cópia)`,
    createdAt: now,
    updatedAt: now,
    userAnswers: [...source.userAnswers],
    keyAnswers: [...source.keyAnswers],
    flaggedQuestions: [...source.flaggedQuestions],
    isCorrected: source.isCorrected,
    isLocked: source.isLocked ?? source.isCorrected,
    isResultOutdated: source.isResultOutdated ?? false,
    examType: source.examType === 'true_false' ? 'true_false' : 'multiple_choice',
  };
}

/**
 * Ensures a SimuladoData object conforms to the strict interface, filling missing fields gracefully
 * and preserving any unknown custom attributes for full backwards compatibility.
 */
export function sanitizeSimulado(item: any, fallbackIndex: number = 1): SimuladoData {
  const tot = typeof item?.totalQuestions === 'number' && item.totalQuestions > 0 ? item.totalQuestions : 70;
  const validOptions = ['A', 'B', 'C', 'D', 'E', 'V', 'F'];
  const userAnswers: (AnswerOption | null)[] = Array.isArray(item?.userAnswers)
    ? item.userAnswers.map((ans: any) => (typeof ans === 'string' && validOptions.includes(ans.toUpperCase()) ? (ans.toUpperCase() as AnswerOption) : null))
    : new Array(tot).fill(null);
  
  const keyAnswers: (AnswerOption | null)[] = Array.isArray(item?.keyAnswers)
    ? item.keyAnswers.map((ans: any) => (typeof ans === 'string' && validOptions.includes(ans.toUpperCase()) ? (ans.toUpperCase() as AnswerOption) : null))
    : new Array(tot).fill(null);

  // Resize arrays to match totalQuestions if necessary
  while (userAnswers.length < tot) userAnswers.push(null);
  while (keyAnswers.length < tot) keyAnswers.push(null);

  const now = new Date().toISOString();
  const isCorrected = !!(item?.isCorrected ?? item?.corrigida);
  // Default isLocked: if explicit, respect it. If undefined, corrected exams open locked by default!
  const isLocked = item?.isLocked !== undefined ? Boolean(item.isLocked) : isCorrected;
  const isResultOutdated = Boolean(item?.isResultOutdated || false);

  const safeItem = typeof item === 'object' && item !== null ? item : {};

  return {
    ...safeItem, // Preserves unknown fields!
    id: typeof item?.id === 'string' && item.id ? item.id : generateSimuladoId(),
    title: typeof item?.title === 'string' && item.title.trim() ? item.title.trim() : (item?.nome || `Cartão-Resposta ${fallbackIndex}`),
    date: typeof item?.date === 'string' && item.date ? item.date : new Date().toLocaleDateString('pt-BR'),
    createdAt: typeof item?.createdAt === 'string' ? item.createdAt : (item?.criadaEm || now),
    updatedAt: typeof item?.updatedAt === 'string' ? item.updatedAt : (item?.atualizadaEm || now),
    totalQuestions: tot,
    userAnswers: userAnswers.slice(0, tot),
    keyAnswers: keyAnswers.slice(0, tot),
    flaggedQuestions: Array.isArray(item?.flaggedQuestions) ? item.flaggedQuestions.filter((idx: any) => typeof idx === 'number') : [],
    isCorrected,
    isLocked,
    isResultOutdated,
    timeSpentSeconds: typeof item?.timeSpentSeconds === 'number' ? item.timeSpentSeconds : 0,
    notes: typeof item?.notes === 'string' ? item.notes : '',
    examType: item?.examType === 'true_false' ? 'true_false' : 'multiple_choice',
  };
}

/**
 * Loads the multi-exam store from localStorage, handling automatic backwards-compatible migration.
 */
export function loadMultiSimuladoStore(): MultiSimuladoStore {
  try {
    // 1. Try reading modern multi-exam store
    const savedMulti = localStorage.getItem(STORAGE_MULTI_KEY);
    if (savedMulti) {
      const parsed = JSON.parse(savedMulti);
      if (parsed && Array.isArray(parsed.provas) && parsed.provas.length > 0) {
        const sanitizedProvas = parsed.provas.map((p: any, idx: number) => sanitizeSimulado(p, idx + 1));
        const activeExists = sanitizedProvas.some((p: SimuladoData) => p.id === parsed.activeId);
        const activeId = activeExists ? parsed.activeId : sanitizedProvas[0].id;
        return {
          version: 3,
          activeId,
          provas: sanitizedProvas,
        };
      }
    }

    // 2. Migration from v2 single-simulado store (STORAGE_LEGACY_V2)
    const legacyV2Raw = localStorage.getItem(STORAGE_LEGACY_V2);
    if (legacyV2Raw) {
      const parsedV2 = JSON.parse(legacyV2Raw);
      if (parsedV2 && Array.isArray(parsedV2.userAnswers)) {
        const migrated = sanitizeSimulado(parsedV2, 1);
        migrated.title = parsedV2.title || 'Simulado Principal';
        const newStore: MultiSimuladoStore = {
          version: 3,
          activeId: migrated.id,
          provas: [migrated],
        };
        saveMultiSimuladoStore(newStore);
        return newStore;
      }
    }

    // 3. Migration from v1 oldest legacy state (STORAGE_LEGACY_V1)
    const legacyV1Raw = localStorage.getItem(STORAGE_LEGACY_V1);
    if (legacyV1Raw) {
      const legacyV1 = JSON.parse(legacyV1Raw);
      if (legacyV1 && Array.isArray(legacyV1.userAnswers)) {
        const tot = legacyV1.total || 70;
        const migrated: SimuladoData = {
          id: generateSimuladoId(),
          title: 'Simulado Concurso (Restaurado)',
          date: new Date().toLocaleDateString('pt-BR'),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          totalQuestions: tot,
          userAnswers: legacyV1.userAnswers,
          keyAnswers: legacyV1.keyAnswers || new Array(tot).fill(null),
          flaggedQuestions: [],
          isCorrected: !!legacyV1.corrected,
          timeSpentSeconds: 0,
        };
        const newStore: MultiSimuladoStore = {
          version: 3,
          activeId: migrated.id,
          provas: [migrated],
        };
        saveMultiSimuladoStore(newStore);
        return newStore;
      }
    }
  } catch (err) {
    console.error('Erro ao carregar simulados do localStorage:', err);
  }

  // 4. First access for new visitors: start with clean empty store (no automatic prefilled exam)
  return {
    version: 3,
    activeId: '',
    provas: [],
  };
}

/**
 * Creates an optional demonstration exam with sample questions and answer key,
 * clearly labeled as an example for users who wish to explore the tool.
 */
export function createDemoSimulado(): SimuladoData {
  const defaultTotal = 70;
  const parsedKey = parseAnswers(INITIAL_70_KEY).results;
  const initialKey = new Array(defaultTotal).fill(null);
  for (let i = 0; i < Math.min(parsedKey.length, defaultTotal); i++) {
    initialKey[i] = parsedKey[i];
  }

  // Preenche uma amostra realista das primeiras 20 questões para o usuário poder testar o fluxo de correção e conferência
  const sampleUserAnswers: (AnswerOption | null)[] = new Array(defaultTotal).fill(null);
  for (let i = 0; i < 20; i++) {
    sampleUserAnswers[i] = i % 5 === 0 ? 'A' : (initialKey[i] ?? 'B');
  }

  return {
    id: generateSimuladoId(),
    title: 'Exemplo de Demonstração (70 questões)',
    date: new Date().toLocaleDateString('pt-BR'),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    totalQuestions: defaultTotal,
    userAnswers: sampleUserAnswers,
    keyAnswers: initialKey,
    flaggedQuestions: [5, 12, 28],
    isCorrected: false,
    isLocked: false,
    isResultOutdated: false,
    timeSpentSeconds: 320,
    notes: 'Esta é uma prova de demonstração para você testar e conhecer as funcionalidades de marcação, conferência e correção do Gabarito Online.',
  };
}

/**
 * Persists the store safely with dual-storage redundancy:
 * 1. Primary IndexedDB (high capacity, async, protected)
 * 2. Mirror LocalStorage (instant sync fallback)
 * 3. Optional automatic safety snapshot in IndexedDB
 */
export function saveMultiSimuladoStore(store: MultiSimuladoStore, snapshotReason?: string): void {
  // 1. Mirror to localStorage
  try {
    localStorage.setItem(STORAGE_MULTI_KEY, JSON.stringify(store));
    const activeProva = store.provas.find(p => p.id === store.activeId) || store.provas[0];
    if (activeProva) {
      localStorage.setItem(STORAGE_LEGACY_V2, JSON.stringify(activeProva));
    } else {
      localStorage.removeItem(STORAGE_LEGACY_V2);
    }
  } catch (err) {
    console.warn('LocalStorage cheio ou indisponível; o IndexedDB garantirá a persistência:', err);
  }

  // 2. Primary asynchronous persistence to IndexedDB
  saveStoreToIndexedDB(store).catch(err => {
    console.warn('Aviso ao sincronizar com IndexedDB:', err);
  });

  // 3. Optional safety snapshot
  if (snapshotReason && store.provas.length > 0) {
    saveSnapshotToIndexedDB(store, snapshotReason).catch(() => {});
  }
}

/**
 * Initializes and synchronizes store between localStorage and IndexedDB.
 * Protects against accidental cache wipes by restoring from IndexedDB if localStorage was cleared.
 */
export async function syncStoreWithIndexedDB(
  currentStore: MultiSimuladoStore
): Promise<{ store: MultiSimuladoStore; updated: boolean; reason?: string }> {
  // Proactively request persistent storage from browser
  requestPersistentStorage().catch(() => {});

  try {
    const idbStore = await loadStoreFromIndexedDB();

    // Case 1: IndexedDB has data
    if (idbStore && Array.isArray(idbStore.provas) && idbStore.provas.length > 0) {
      const sanitizedIdbProvas = idbStore.provas.map((p, idx) => sanitizeSimulado(p, idx + 1));
      const validIdbStore: MultiSimuladoStore = {
        version: 3,
        activeId: sanitizedIdbProvas.some(p => p.id === idbStore.activeId)
          ? idbStore.activeId
          : sanitizedIdbProvas[0].id,
        provas: sanitizedIdbProvas,
      };

      // If localStore was completely empty (e.g. user cleaned browser cache or private window closed),
      // rescue from IndexedDB!
      if (currentStore.provas.length === 0) {
        saveMultiSimuladoStore(validIdbStore);
        return {
          store: validIdbStore,
          updated: true,
          reason: 'Recuperado com sucesso do IndexedDB (armazenamento seguro)',
        };
      }

      // If localStore has fewer exams than IndexedDB, or if IndexedDB has newer timestamps
      const latestLocalTime = Math.max(
        ...currentStore.provas.map(p => new Date(p.updatedAt || p.createdAt || 0).getTime()),
        0
      );
      const latestIdbTime = Math.max(
        ...validIdbStore.provas.map(p => new Date(p.updatedAt || p.createdAt || 0).getTime()),
        0
      );

      if (latestIdbTime > latestLocalTime && validIdbStore.provas.length >= currentStore.provas.length) {
        saveMultiSimuladoStore(validIdbStore);
        return {
          store: validIdbStore,
          updated: true,
          reason: 'Sincronizado com versão mais recente do IndexedDB',
        };
      }

      // Otherwise local is current, guarantee IndexedDB is up to date
      await saveStoreToIndexedDB(currentStore);
      return { store: currentStore, updated: false };
    }

    // Case 2: IndexedDB is empty, but local has data (first time upgrade)
    if (currentStore.provas.length > 0) {
      await saveStoreToIndexedDB(currentStore);
      await saveSnapshotToIndexedDB(currentStore, 'Migração Inicial');
      return { store: currentStore, updated: false };
    }
  } catch (err) {
    console.warn('Erro durante sincronização com IndexedDB:', err);
  }

  return { store: currentStore, updated: false };
}

/**
 * Triggers download of the full backup JSON containing all saved exams and answers.
 */
export function exportFullBackupFile(store: MultiSimuladoStore): void {
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `gabarito-backup-${dateStr}.json`;

  const backupData: FullBackupData = {
    app: 'gabarito-online',
    version: 3,
    exportedAt: new Date().toISOString(),
    activeId: store.activeId,
    provas: store.provas,
  };

  downloadFile(filename, JSON.stringify(backupData, null, 2), 'application/json;charset=utf-8');
}

/**
 * Validates any imported backup JSON and standardizes it into a FullBackupData object.
 */
export function validateAndParseBackup(rawText: string): {
  valid: boolean;
  error?: string;
  data?: FullBackupData;
  examCount?: number;
} {
  try {
    const trimmed = rawText.trim();
    if (!trimmed) {
      return { valid: false, error: 'O arquivo está vazio.' };
    }

    const parsed = JSON.parse(trimmed);

    let rawList: any[] = [];
    let activeId = '';

    if (Array.isArray(parsed)) {
      rawList = parsed;
    } else if (parsed && typeof parsed === 'object') {
      if (Array.isArray(parsed.provas)) {
        rawList = parsed.provas;
        activeId = parsed.activeId || '';
      } else if (Array.isArray(parsed.simulados)) {
        rawList = parsed.simulados;
        activeId = parsed.activeId || '';
      } else if (Array.isArray(parsed.userAnswers)) {
        // Single exam exported as JSON!
        rawList = [parsed];
      }
    }

    if (rawList.length === 0) {
      return {
        valid: false,
        error: 'Nenhum simulado ou prova válida foi encontrada no arquivo JSON.',
      };
    }

    const sanitizedProvas = rawList.map((p, idx) => sanitizeSimulado(p, idx + 1));
    const finalActiveId = sanitizedProvas.some(p => p.id === activeId) ? activeId : sanitizedProvas[0].id;

    return {
      valid: true,
      data: {
        app: 'gabarito-online',
        version: 3,
        exportedAt: new Date().toISOString(),
        activeId: finalActiveId,
        provas: sanitizedProvas,
      },
      examCount: sanitizedProvas.length,
    };
  } catch (err: any) {
    return {
      valid: false,
      error: `Formato JSON inválido: ${err?.message || 'erro de sintaxe'}`,
    };
  }
}
