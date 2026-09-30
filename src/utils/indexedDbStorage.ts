import { MultiSimuladoStore, StorageSnapshot, StorageEstimateInfo } from '../types';

const DB_NAME = 'GabaritoPro_DB';
const DB_VERSION = 1;
const STORE_STATE = 'app_state';
const STORE_SNAPSHOTS = 'snapshots';
const STATE_KEY_MAIN = 'active_store';
const MAX_SNAPSHOTS = 15;

let dbInstance: IDBDatabase | null = null;
let dbInitPromise: Promise<IDBDatabase | null> | null = null;

/**
 * Checks if IndexedDB is supported in the current environment.
 */
export function isIndexedDBSupported(): boolean {
  try {
    return typeof window !== 'undefined' && 'indexedDB' in window && window.indexedDB !== null;
  } catch {
    return false;
  }
}

/**
 * Initializes and opens the IndexedDB database with proper stores.
 */
export function getIndexedDB(): Promise<IDBDatabase | null> {
  if (dbInstance) return Promise.resolve(dbInstance);
  if (dbInitPromise) return dbInitPromise;

  if (!isIndexedDBSupported()) {
    console.warn('IndexedDB não suportado neste navegador. Usando localStorage como fallback.');
    return Promise.resolve(null);
  }

  dbInitPromise = new Promise(resolve => {
    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = event => {
        const db = (event.target as IDBOpenDBRequest).result;
        // Key-value store for main state
        if (!db.objectStoreNames.contains(STORE_STATE)) {
          db.createObjectStore(STORE_STATE, { keyPath: 'key' });
        }
        // Snapshots store for safety restore points
        if (!db.objectStoreNames.contains(STORE_SNAPSHOTS)) {
          const snapshotStore = db.createObjectStore(STORE_SNAPSHOTS, { keyPath: 'id' });
          snapshotStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };

      request.onsuccess = event => {
        dbInstance = (event.target as IDBOpenDBRequest).result;
        dbInstance.onversionchange = () => {
          dbInstance?.close();
          dbInstance = null;
          dbInitPromise = null;
        };
        resolve(dbInstance);
      };

      request.onerror = err => {
        console.warn('Erro ao abrir IndexedDB:', err);
        resolve(null);
      };

      request.onblocked = () => {
        console.warn('Abertura do IndexedDB bloqueada por outra aba.');
        resolve(null);
      };
    } catch (err) {
      console.warn('Exceção ao inicializar IndexedDB:', err);
      resolve(null);
    }
  });

  return dbInitPromise;
}

/**
 * Saves the multi-exam store into IndexedDB.
 */
export async function saveStoreToIndexedDB(store: MultiSimuladoStore): Promise<boolean> {
  try {
    const db = await getIndexedDB();
    if (!db) return false;

    return new Promise(resolve => {
      const tx = db.transaction([STORE_STATE], 'readwrite');
      const os = tx.objectStore(STORE_STATE);
      const record = {
        key: STATE_KEY_MAIN,
        value: store,
        updatedAt: new Date().toISOString(),
      };
      const req = os.put(record);

      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
      tx.onerror = () => resolve(false);
    });
  } catch (err) {
    console.warn('Erro ao gravar no IndexedDB:', err);
    return false;
  }
}

/**
 * Loads the multi-exam store from IndexedDB.
 */
export async function loadStoreFromIndexedDB(): Promise<MultiSimuladoStore | null> {
  try {
    const db = await getIndexedDB();
    if (!db) return null;

    return new Promise(resolve => {
      const tx = db.transaction([STORE_STATE], 'readonly');
      const os = tx.objectStore(STORE_STATE);
      const req = os.get(STATE_KEY_MAIN);

      req.onsuccess = () => {
        const result = req.result;
        if (result && result.value && Array.isArray(result.value.provas)) {
          resolve(result.value as MultiSimuladoStore);
        } else {
          resolve(null);
        }
      };

      req.onerror = () => resolve(null);
      tx.onerror = () => resolve(null);
    });
  } catch (err) {
    console.warn('Erro ao ler do IndexedDB:', err);
    return null;
  }
}

/**
 * Creates and stores a safety snapshot in IndexedDB, automatically maintaining max limit.
 */
export async function saveSnapshotToIndexedDB(
  store: MultiSimuladoStore,
  reason: string = 'Automático'
): Promise<StorageSnapshot | null> {
  try {
    const db = await getIndexedDB();
    if (!db) return null;

    const snapshot: StorageSnapshot = {
      id: `snap_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      reason,
      examCount: store.provas.length,
      data: JSON.parse(JSON.stringify(store)),
    };

    return new Promise(resolve => {
      const tx = db.transaction([STORE_SNAPSHOTS], 'readwrite');
      const os = tx.objectStore(STORE_SNAPSHOTS);
      const req = os.add(snapshot);

      req.onsuccess = async () => {
        // Prune old snapshots if exceeded MAX_SNAPSHOTS
        try {
          const allReq = os.getAll();
          allReq.onsuccess = () => {
            const all: StorageSnapshot[] = allReq.result || [];
            if (all.length > MAX_SNAPSHOTS) {
              all.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
              const toDelete = all.slice(0, all.length - MAX_SNAPSHOTS);
              for (const item of toDelete) {
                os.delete(item.id);
              }
            }
          };
        } catch {
          // Non-critical pruning error
        }
        resolve(snapshot);
      };

      req.onerror = () => resolve(null);
      tx.onerror = () => resolve(null);
    });
  } catch (err) {
    console.warn('Erro ao salvar snapshot no IndexedDB:', err);
    return null;
  }
}

/**
 * Retrieves all stored snapshots sorted from newest to oldest.
 */
export async function getSnapshotsFromIndexedDB(): Promise<StorageSnapshot[]> {
  try {
    const db = await getIndexedDB();
    if (!db) return [];

    return new Promise(resolve => {
      const tx = db.transaction([STORE_SNAPSHOTS], 'readonly');
      const os = tx.objectStore(STORE_SNAPSHOTS);
      const req = os.getAll();

      req.onsuccess = () => {
        const list: StorageSnapshot[] = req.result || [];
        list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        resolve(list);
      };

      req.onerror = () => resolve([]);
      tx.onerror = () => resolve([]);
    });
  } catch (err) {
    console.warn('Erro ao obter snapshots do IndexedDB:', err);
    return [];
  }
}

/**
 * Deletes a specific snapshot by its ID.
 */
export async function deleteSnapshotFromIndexedDB(id: string): Promise<boolean> {
  try {
    const db = await getIndexedDB();
    if (!db) return false;

    return new Promise(resolve => {
      const tx = db.transaction([STORE_SNAPSHOTS], 'readwrite');
      const os = tx.objectStore(STORE_SNAPSHOTS);
      const req = os.delete(id);

      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
      tx.onerror = () => resolve(false);
    });
  } catch (err) {
    console.warn('Erro ao deletar snapshot:', err);
    return false;
  }
}

/**
 * Clears all saved snapshots.
 */
export async function clearAllSnapshots(): Promise<boolean> {
  try {
    const db = await getIndexedDB();
    if (!db) return false;

    return new Promise(resolve => {
      const tx = db.transaction([STORE_SNAPSHOTS], 'readwrite');
      const os = tx.objectStore(STORE_SNAPSHOTS);
      const req = os.clear();

      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
      tx.onerror = () => resolve(false);
    });
  } catch (err) {
    console.warn('Erro ao limpar snapshots:', err);
    return false;
  }
}

/**
 * Checks whether persistent storage has been granted by the browser.
 */
export async function checkPersistentStorage(): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persisted) {
      return await navigator.storage.persisted();
    }
  } catch (err) {
    console.warn('Erro ao verificar persistência:', err);
  }
  return false;
}

/**
 * Requests the browser to grant persistent storage protection.
 * When granted, browser cache cleanups and low-disk evictions won't delete the app's IndexedDB.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
      const isGranted = await navigator.storage.persist();
      return isGranted;
    }
  } catch (err) {
    console.warn('Erro ao solicitar persistência:', err);
  }
  return false;
}

/**
 * Formats byte values into readable strings (KB, MB, GB).
 */
export function formatBytes(bytes: number, decimals: number = 1): string {
  if (bytes <= 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Obtains complete storage estimate from the browser.
 */
export async function getStorageEstimateInfo(): Promise<StorageEstimateInfo> {
  const isAvailable = isIndexedDBSupported();
  let isPersisted = false;
  let usage = 0;
  let quota = 0;

  try {
    if (typeof navigator !== 'undefined' && navigator.storage) {
      if (navigator.storage.persisted) {
        isPersisted = await navigator.storage.persisted();
      }
      if (navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        usage = estimate.usage || 0;
        quota = estimate.quota || 0;
      }
    }
  } catch (err) {
    console.warn('Erro ao estimar armazenamento:', err);
  }

  const percentUsed = quota > 0 ? Number(((usage / quota) * 100).toFixed(2)) : 0;

  return {
    isIndexedDBAvailable: isAvailable,
    isPersisted,
    usageBytes: usage,
    quotaBytes: quota,
    usageFormatted: formatBytes(usage),
    quotaFormatted: formatBytes(quota),
    percentUsed,
  };
}
