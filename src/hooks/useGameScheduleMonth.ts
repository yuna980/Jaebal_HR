'use client';

import { useEffect, useState } from 'react';
import { KboMatch } from '@/lib/kboScraper';

interface UseGameScheduleMonthResult {
  schedules: KboMatch[];
  loading: boolean;
  error: string | null;
}

type MonthScheduleCacheEntry = {
  schedules: KboMatch[];
  savedAt: number;
};

const MONTH_SCHEDULE_CACHE_KEY = 'game-schedule-month-cache';
const MONTH_SCHEDULE_CACHE_TTL_MS = 5 * 60 * 1000;
const memoryCache = new Map<string, MonthScheduleCacheEntry>();
const inflightRequests = new Map<string, Promise<KboMatch[]>>();

function buildCacheKey(year: number, month: number) {
  return `${year}:${month}`;
}

function readStoredCache() {
  if (typeof window === 'undefined') return {};

  try {
    return JSON.parse(localStorage.getItem(MONTH_SCHEDULE_CACHE_KEY) ?? '{}') as Record<string, MonthScheduleCacheEntry>;
  } catch {
    return {};
  }
}

function readCachedSchedules(year: number, month: number) {
  const cacheKey = buildCacheKey(year, month);
  const memoryEntry = memoryCache.get(cacheKey);
  const storedEntry = memoryEntry ?? readStoredCache()[cacheKey];

  if (!storedEntry || Date.now() - storedEntry.savedAt > MONTH_SCHEDULE_CACHE_TTL_MS) {
    return null;
  }

  memoryCache.set(cacheKey, storedEntry);
  return storedEntry.schedules;
}

function writeCachedSchedules(year: number, month: number, schedules: KboMatch[]) {
  if (typeof window === 'undefined') return;

  const cacheKey = buildCacheKey(year, month);
  const entry = { schedules, savedAt: Date.now() };
  const storedCache = readStoredCache();

  memoryCache.set(cacheKey, entry);
  localStorage.setItem(
    MONTH_SCHEDULE_CACHE_KEY,
    JSON.stringify({
      ...storedCache,
      [cacheKey]: entry,
    })
  );
}

async function fetchMonthSchedules(year: number, month: number) {
  const cacheKey = buildCacheKey(year, month);
  const inflight = inflightRequests.get(cacheKey);

  if (inflight) {
    return inflight;
  }

  const request = (async () => {
    const params = new URLSearchParams({
      year: String(year),
      month: String(month),
    });
    const res = await fetch(`/api/game-schedules/month?${params.toString()}`);
    const data = await res.json();

    if (!data.success) {
      throw new Error(data.message || '월간 대진표를 가져오지 못했어요.');
    }

    writeCachedSchedules(year, month, data.schedules);
    return data.schedules as KboMatch[];
  })();

  inflightRequests.set(cacheKey, request);

  try {
    return await request;
  } finally {
    inflightRequests.delete(cacheKey);
  }
}

export function prefetchGameScheduleMonth(year: number, month: number) {
  if (readCachedSchedules(year, month)) return;
  void fetchMonthSchedules(year, month).catch(() => {});
}

export function useGameScheduleMonth(year: number, month: number): UseGameScheduleMonthResult {
  const [schedules, setSchedules] = useState<KboMatch[]>(() => readCachedSchedules(year, month) ?? []);
  const [loading, setLoading] = useState(() => !readCachedSchedules(year, month));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const cachedSchedules = readCachedSchedules(year, month);

    async function fetchSchedules() {
      try {
        if (cachedSchedules) {
          setSchedules(cachedSchedules);
          setError(null);
          setLoading(false);
        } else {
          setLoading(true);
        }

        const nextSchedules = await fetchMonthSchedules(year, month);

        if (cancelled) return;

        setSchedules(nextSchedules);
        setError(null);
      } catch (fetchError) {
        if (!cancelled) {
          if (!cachedSchedules) {
            setSchedules([]);
          }
          setError(fetchError instanceof Error ? fetchError.message : '서버와 연결할 수 없어요.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchSchedules();

    return () => {
      cancelled = true;
    };
  }, [month, year]);

  return { schedules, loading, error };
}
