import { sanitizeSourceDocuments } from './sourceDocumentMetadata';
import { sanitizeFlashcardDeck, sanitizeFlashcardHistory } from './flashcards';
import { SimuladoData, MultiSimuladoStore, FullBackupData, AnswerOption, ExamType } from '../types';
import { parseAnswers, downloadFile } from './parser';
import { MAX_IMPORT_BYTES, MAX_QUESTIONS, normalizeTotal, resizeAnswers, validIndexes, sanitizeExtractedQuestions } from './validation';
import {
  saveStoreToIndexedDB,
  loadStoreFromIndexedDB,
  saveSnapshotToIndexedDB,
  requestPersistentStorage,
} from './indexedDbStorage';

export const STORAGE_MULTI_KEY = 'gabarito-multi-v1';
export const STORAGE_LEGACY_V2 = 'gabarito-simulado-v2';
export const STORAGE_LEGACY_V1 = 'gabarito-state';

function readStoredJSON(key: string): any {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

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
  const validTotal = Math.min(200, normalizeTotal(totalQuestions));

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
    subjectRanges: [],
    reviewedQuestionIndexes: [],
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
    subjectRanges: source.subjectRanges?.map(range => ({ ...range })) || [],
    examMetadata: source.examMetadata ? { ...source.examMetadata } : undefined,
    reviewedQuestionIndexes: [...(source.reviewedQuestionIndexes || [])],
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
  const tot = normalizeTotal(item?.totalQuestions ?? item?.total);
  const examType: ExamType = item?.examType === 'true_false' ? 'true_false' : 'multiple_choice';
  const validOptions = examType === 'true_false' ? ['V', 'F', 'C', 'E'] : ['A', 'B', 'C', 'D', 'E'];
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

  const subjectRanges = Array.isArray(item?.subjectRanges)
    ? item.subjectRanges
        .filter((range: any) => range && typeof range.name === 'string')
        .map((range: any, index: number) => ({
          id: typeof range.id === 'string' && range.id ? range.id : `subject_${Date.now()}_${index}`,
          name: range.name.trim() || `Disciplina ${index + 1}`,
          start: Math.min(tot, normalizeTotal(Number(range.start), 1)),
          end: Math.min(tot, normalizeTotal(Number(range.end), tot)),
          color: ['slate', 'amber', 'emerald', 'blue', 'violet', 'rose', 'cyan'].includes(range.color)
            ? range.color
            : 'slate',
        }))
        .filter((range: any) => range.start <= range.end)
    : [];

  const reviewedQuestionIndexes = Array.isArray(item?.reviewedQuestionIndexes)
    ? item.reviewedQuestionIndexes.filter(
        (idx: any) => Number.isInteger(idx) && idx >= 0 && idx < tot
      )
    : [];

  const safeItem = typeof item === 'object' && item !== null ? item : {};

  return {
    ...safeItem, // Preserves unknown fields!
    id: typeof item?.id === 'string' && item.id ? item.id : generateSimuladoId(),
    title: typeof item?.title === 'string' && item.title.trim() ? item.title.trim() : (item?.nome || `Cartão-Resposta ${fallbackIndex}`),
    date: typeof item?.date === 'string' && item.date ? item.date : new Date().toLocaleDateString('pt-BR'),
    createdAt: typeof item?.createdAt === 'string' ? item.createdAt : (item?.criadaEm || now),
    updatedAt: typeof item?.updatedAt === 'string' ? item.updatedAt : (item?.atualizadaEm || now),
    totalQuestions: tot,
    userAnswers: resizeAnswers(userAnswers, tot, examType),
    keyAnswers: resizeAnswers(keyAnswers, tot, examType),
    flaggedQuestions: validIndexes(item?.flaggedQuestions, tot),
    isCorrected,
    isLocked,
    isResultOutdated,
    timeSpentSeconds: typeof item?.timeSpentSeconds === 'number' && Number.isFinite(item.timeSpentSeconds) ? Math.max(0, Math.floor(item.timeSpentSeconds)) : 0,
    ...('timerPrompted' in safeItem ? {timerPrompted:item.timerPrompted===true} : {}),
    ...('sortOrder' in safeItem ? {sortOrder:typeof item.sortOrder==='number' && Number.isFinite(item.sortOrder) && item.sortOrder>=0?item.sortOrder:undefined} : {}),
    notes: typeof item?.notes === 'string' ? item.notes : '',
    examType: item?.examType === 'true_false' ? 'true_false' : 'multiple_choice',
    subjectRanges,
    examMetadata:
      item?.examMetadata && typeof item.examMetadata === 'object'
        ? { ...item.examMetadata }
        : undefined,
    reviewedQuestionIndexes: validIndexes(reviewedQuestionIndexes, tot),
    ...(Array.isArray(item?.extractedQuestions) ? { extractedQuestions: sanitizeExtractedQuestions(item.extractedQuestions, tot, examType) } : {}),
    ...(item?.exampleData && typeof item.exampleData === 'object' ? { exampleData: { user: item.exampleData.user === true, key: item.exampleData.key === true } } : {}),
    ...('sourceDocuments' in safeItem ? { sourceDocuments: sanitizeSourceDocuments(item.sourceDocuments) } : {}),
    sourceFileName: typeof item?.sourceFileName === 'string' ? item.sourceFileName.slice(0, 240) : undefined,
    flashcardDeck: sanitizeFlashcardDeck(item?.flashcardDeck),
    ...('flashcardHistory' in safeItem ? {flashcardHistory:sanitizeFlashcardHistory(item?.flashcardHistory)} : {}),
  };
}

/**
 * Loads the multi-exam store from localStorage, handling automatic backwards-compatible migration.
 */
export function loadMultiSimuladoStore(scope = 'guest'): MultiSimuladoStore {
  try {
    // 1. Try reading modern multi-exam store
    const savedMulti = readStoredJSON(scope === 'guest' ? STORAGE_MULTI_KEY : `${STORAGE_MULTI_KEY}:${scope}`);
    if (savedMulti) {
      const parsed = savedMulti;
      if (parsed && Array.isArray(parsed.provas)) {
        const sanitizedProvas = parsed.provas.map((p: any, idx: number) => sanitizeSimulado(p, idx + 1));
        const activeExists = sanitizedProvas.some((p: SimuladoData) => p.id === parsed.activeId);
        const activeId = activeExists ? parsed.activeId : sanitizedProvas[0]?.id || '';
        return {
          version: 3,
          activeId,
          provas: sanitizedProvas,
        };
      }
    }

    if (scope !== 'guest') return { version: 3, activeId: '', provas: [] };

    // 2. Migration from v2 single-simulado store (STORAGE_LEGACY_V2)
    const legacyV2Raw = readStoredJSON(STORAGE_LEGACY_V2);
    if (legacyV2Raw) {
      const parsedV2 = legacyV2Raw;
      if (parsedV2 && Array.isArray(parsedV2.userAnswers)) {
        const migrated = sanitizeSimulado(parsedV2, 1);
        migrated.title = parsedV2.title || 'Simulado Principal';
        const newStore: MultiSimuladoStore = {
          version: 3,
          activeId: migrated.id,
          provas: [sanitizeSimulado(migrated)],
        };
        return newStore;
      }
    }

    // 3. Migration from v1 oldest legacy state (STORAGE_LEGACY_V1)
    const legacyV1Raw = readStoredJSON(STORAGE_LEGACY_V1);
    if (legacyV1Raw) {
      const legacyV1 = legacyV1Raw;
      if (legacyV1 && Array.isArray(legacyV1.userAnswers)) {
        const tot = normalizeTotal(legacyV1.total);
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
          provas: [sanitizeSimulado(migrated)],
        };
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
export async function saveMultiSimuladoStore(store: MultiSimuladoStore, snapshotReason?: string, scope = 'guest'): Promise<boolean> {
  let mirrorSaved = false;
  // 1. Mirror to localStorage
  try {
    localStorage.setItem(scope === 'guest' ? STORAGE_MULTI_KEY : `${STORAGE_MULTI_KEY}:${scope}`, JSON.stringify(store));
    mirrorSaved = true;
    const activeProva = store.provas.find(p => p.id === store.activeId) || store.provas[0];
    if (scope !== 'guest') {
      // Keep the legacy guest backup separate from signed-in workspaces.
    } else if (activeProva) {
      localStorage.setItem(STORAGE_LEGACY_V2, JSON.stringify(activeProva));
    } else {
      localStorage.removeItem(STORAGE_LEGACY_V2);
    }
  } catch (err) {
    console.warn('LocalStorage indisponível. Tentando salvar no IndexedDB:', err);
  }

  // 2. Primary asynchronous persistence to IndexedDB
  const databaseSaved = await saveStoreToIndexedDB(store, scope);

  // 3. Optional safety snapshot
  if (snapshotReason && store.provas.length > 0) {
    await saveSnapshotToIndexedDB(store, snapshotReason, scope);
  }
  return databaseSaved || mirrorSaved;
}

/**
 * Initializes and synchronizes store between localStorage and IndexedDB.
 * Protects against accidental cache wipes by restoring from IndexedDB if localStorage was cleared.
 */
export async function syncStoreWithIndexedDB(
  currentStore: MultiSimuladoStore,
  scope = 'guest'
): Promise<{ store: MultiSimuladoStore; updated: boolean; reason?: string }> {
  // Proactively request persistent storage from browser
  requestPersistentStorage().catch(() => {});

  try {
    const idbStore = await loadStoreFromIndexedDB(scope);

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
      if (currentStore.provas.length === 0 && !Array.isArray(readStoredJSON(scope === 'guest' ? STORAGE_MULTI_KEY : `${STORAGE_MULTI_KEY}:${scope}`)?.provas)) {
        return {
          store: validIdbStore,
          updated: true,
          reason: 'Recuperado com sucesso do IndexedDB (armazenamento seguro)',
        };
      }
      if (currentStore.provas.length === 0) return { store: currentStore, updated: false };

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
        return {
          store: validIdbStore,
          updated: true,
          reason: 'Sincronizado com versão mais recente do IndexedDB',
        };
      }

      // Otherwise local is current, guarantee IndexedDB is up to date
      return { store: currentStore, updated: false };
    }

    // Case 2: IndexedDB is empty, but local has data (first time upgrade)
    if (currentStore.provas.length > 0) {
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
    if (new Blob([rawText]).size > MAX_IMPORT_BYTES) {
      return { valid: false, error: 'O backup excede o limite de 10 MB.' };
    }
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

    if (rawList.length > 1000 || rawList.some(p => !p || typeof p !== 'object' || Array.isArray(p) || !Array.isArray(p.userAnswers))) {
      return { valid: false, error: 'O backup deve conter provas com listas de respostas válidas (máximo de 1.000 provas).' };
    }
    if (rawList.some(p => p.totalQuestions !== undefined && (!Number.isInteger(p.totalQuestions) || p.totalQuestions < 1 || p.totalQuestions > MAX_QUESTIONS))) {
      return { valid: false, error: `Quantidade de questões inválida. Use um inteiro entre 1 e ${MAX_QUESTIONS}.` };
    }
    const seen = new Set<string>();
    const sanitizedProvas = rawList.map((p, idx) => {
      const prova = sanitizeSimulado(p, idx + 1);
      if (seen.has(prova.id)) prova.id = generateSimuladoId();
      seen.add(prova.id);
      return prova;
    });
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
