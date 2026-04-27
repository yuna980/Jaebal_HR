'use client';

import { useEffect, useState } from 'react';
import { KboMatch } from '@/lib/kboScraper';

interface UseTodayGameScheduleResult {
  schedule: KboMatch | null;
  loading: boolean;
  error: string | null;
}

type TodayScheduleCacheEntry = {
  schedule: KboMatch | null;
  savedAt: number;
};

const TODAY_SCHEDULE_CACHE_KEY = 'game-schedule-today-cache';
const TODAY_SCHEDULE_CACHE_TTL_MS = 5 * 60 * 1000;
const memoryCache = new Map<string, TodayScheduleCacheEntry>();
const inflightRequests = new Map<string, Promise<KboMatch | null>>();

function getKstToday() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function buildCacheKey(teamId: string, date?: string) {
  return `${teamId}:${date ?? getKstToday()}`;
}

function readStoredCache() {
  if (typeof window === 'undefined') return {};

  try {
    return JSON.parse(localStorage.getItem(TODAY_SCHEDULE_CACHE_KEY) ?? '{}') as Record<string, TodayScheduleCacheEntry>;
  } catch {
    return {};
  }
}

function readCachedSchedule(teamId: string, date?: string) {
  const cacheKey = buildCacheKey(teamId, date);
  const memoryEntry = memoryCache.get(cacheKey);
  const storedEntry = memoryEntry ?? readStoredCache()[cacheKey];

  if (!storedEntry || Date.now() - storedEntry.savedAt > TODAY_SCHEDULE_CACHE_TTL_MS) {
    return null;
  }

  memoryCache.set(cacheKey, storedEntry);
  return storedEntry.schedule;
}

function hasCachedSchedule(teamId: string, date?: string) {
  const cacheKey = buildCacheKey(teamId, date);
  const memoryEntry = memoryCache.get(cacheKey);
  const storedEntry = memoryEntry ?? readStoredCache()[cacheKey];

  return Boolean(storedEntry && Date.now() - storedEntry.savedAt <= TODAY_SCHEDULE_CACHE_TTL_MS);
}

function writeCachedSchedule(teamId: string, date: string | undefined, schedule: KboMatch | null) {
  if (typeof window === 'undefined') return;

  const cacheKey = buildCacheKey(teamId, date);
  const entry = { schedule, savedAt: Date.now() };
  const storedCache = readStoredCache();

  memoryCache.set(cacheKey, entry);
  localStorage.setItem(
    TODAY_SCHEDULE_CACHE_KEY,
    JSON.stringify({
      ...storedCache,
      [cacheKey]: entry,
    })
  );
}

async function fetchTodaySchedule(teamId: string, date?: string) {
  const cacheKey = buildCacheKey(teamId, date);
  const inflight = inflightRequests.get(cacheKey);

  if (inflight) {
    return inflight;
  }

  const request = (async () => {
    const params = new URLSearchParams({ teamId });
    if (date) params.set('date', date);

    const res = await fetch(`/api/game-schedules/today?${params.toString()}`);
    const data = await res.json();

    if (!data.success) {
      throw new Error(data.message || '오늘 경기 일정을 가져오지 못했어요.');
    }

    writeCachedSchedule(teamId, date, data.schedule);
    return data.schedule as KboMatch | null;
  })();

  inflightRequests.set(cacheKey, request);

  try {
    return await request;
  } finally {
    inflightRequests.delete(cacheKey);
  }
}

export function prefetchTodayGameSchedule(teamId: string | undefined, date?: string) {
  if (!teamId || hasCachedSchedule(teamId, date)) return;
  void fetchTodaySchedule(teamId, date).catch(() => {});
}

export function useTodayGameSchedule(teamId: string | undefined, date?: string): UseTodayGameScheduleResult {
  const [schedule, setSchedule] = useState<KboMatch | null>(() => (teamId ? readCachedSchedule(teamId, date) : null));
  const [loading, setLoading] = useState(() => (teamId ? !hasCachedSchedule(teamId, date) : false));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!teamId) {
      setSchedule(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const requestedTeamId = teamId;
    const cachedSchedule = readCachedSchedule(requestedTeamId, date);
    const hasCachedResult = hasCachedSchedule(requestedTeamId, date);

    async function fetchSchedule() {
      try {
        if (hasCachedResult) {
          setSchedule(cachedSchedule);
          setError(null);
          setLoading(false);
        } else {
          setLoading(true);
        }

        const nextSchedule = await fetchTodaySchedule(requestedTeamId, date);

        if (cancelled) return;

        setSchedule(nextSchedule);
        setError(null);
      } catch (fetchError) {
        if (!cancelled) {
          if (!hasCachedResult) {
            setSchedule(null);
          }
          setError(fetchError instanceof Error ? fetchError.message : '서버와 연결할 수 없어요.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchSchedule();

    return () => {
      cancelled = true;
    };
  }, [teamId, date]);

  return { schedule, loading, error };
}
