export type TimedMemoryCache<T> = {
  get: (key: string) => T | null;
  has: (key: string) => boolean;
  set: (key: string, value: T, savedAt?: number) => void;
  delete: (key: string) => void;
};

type CacheEntry<T> = {
  value: T;
  savedAt: number;
};

export function createTimedMemoryCache<T>(
  ttlMs: number,
  getNow: () => number = () => Date.now()
): TimedMemoryCache<T> {
  const entries = new Map<string, CacheEntry<T>>();

  function readFreshEntry(key: string) {
    const entry = entries.get(key);
    if (!entry) return null;

    if (getNow() - entry.savedAt > ttlMs) {
      entries.delete(key);
      return null;
    }

    return entry;
  }

  return {
    get(key) {
      return readFreshEntry(key)?.value ?? null;
    },
    has(key) {
      return Boolean(readFreshEntry(key));
    },
    set(key, value, savedAt = getNow()) {
      entries.set(key, { value, savedAt });
    },
    delete(key) {
      entries.delete(key);
    },
  };
}

export async function runWithConcurrencyLimit<T>(
  tasks: Array<() => Promise<T>>,
  concurrency: number
) {
  const results: T[] = [];
  let nextIndex = 0;
  const workerCount = Math.max(1, Math.min(concurrency, tasks.length));

  async function worker() {
    while (nextIndex < tasks.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await tasks[currentIndex]();
    }
  }

  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}
