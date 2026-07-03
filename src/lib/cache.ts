import localforage from 'localforage';

// ─── Configure localforage instance ──────────────────────────────────────────

const store = localforage.createInstance({
  name: 'annotation-console',
  storeName: 'task-cache',
  description: 'Cached task data for offline-first experience',
});

// ─── Generic typed cache wrapper ──────────────────────────────────────────────

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const entry = await store.getItem<CacheEntry<T>>(key);
    if (!entry) return null;
    // TTL check
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
      await store.removeItem(key);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

async function cacheSet<T>(key: string, data: T): Promise<void> {
  try {
    const entry: CacheEntry<T> = { data, timestamp: Date.now() };
    await store.setItem(key, entry);
  } catch {
    // IndexedDB unavailable — degrade gracefully
  }
}

async function cacheRemove(key: string): Promise<void> {
  try {
    await store.removeItem(key);
  } catch {
    // Ignore
  }
}

// ─── Summary Cache ─────────────────────────────────────────────────────────────

const summaryStore = localforage.createInstance({
  name: 'annotation-console',
  storeName: 'summary-cache',
  description: 'Cached AI summaries',
});

async function summaryGet(taskId: string): Promise<string | null> {
  try {
    return await summaryStore.getItem<string>(taskId);
  } catch {
    return null;
  }
}

async function summarySet(taskId: string, content: string): Promise<void> {
  try {
    await summaryStore.setItem(taskId, content);
  } catch {
    // Ignore
  }
}

export const taskCache = {
  get: <T>(key: string) => cacheGet<T>(key),
  set: <T>(key: string, data: T) => cacheSet(key, data),
  remove: (key: string) => cacheRemove(key),
};

export const summaryCache = {
  get: (taskId: string) => summaryGet(taskId),
  set: (taskId: string, content: string) => summarySet(taskId, content),
};
