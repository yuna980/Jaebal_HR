'use client';

import { useEffect, useState } from 'react';

export interface TeamStats {
  seasonYear: number;
  currentWinRate: string;
  previousWinRate: string;
  winRateDelta: number;
  winRateDeltaLabel: string;
  rank: number;
  previousRank: number | null;
  total: number;
  win: number;
  loss: number;
  draw: number;
  isPostseasonZone: boolean;
}

type TeamStatsCacheEntry = {
  stats: TeamStats;
  savedAt: number;
};

const TEAM_STATS_CACHE_KEY = 'team-stats-cache';
const TEAM_STATS_CACHE_TTL_MS = 5 * 60 * 1000;
const memoryCache = new Map<string, TeamStatsCacheEntry>();
const inflightRequests = new Map<string, Promise<TeamStats>>();

function buildCacheKey(teamId: string, seasonYear: number) {
  return `${teamId}:${seasonYear}`;
}

function readStoredCache() {
  if (typeof window === 'undefined') return {};

  try {
    return JSON.parse(localStorage.getItem(TEAM_STATS_CACHE_KEY) ?? '{}') as Record<string, TeamStatsCacheEntry>;
  } catch {
    return {};
  }
}

function readCachedStats(teamId: string, seasonYear: number) {
  const cacheKey = buildCacheKey(teamId, seasonYear);
  const memoryEntry = memoryCache.get(cacheKey);
  const storedEntry = memoryEntry ?? readStoredCache()[cacheKey];

  if (!storedEntry || Date.now() - storedEntry.savedAt > TEAM_STATS_CACHE_TTL_MS) {
    return null;
  }

  memoryCache.set(cacheKey, storedEntry);
  return storedEntry.stats;
}

function writeCachedStats(teamId: string, seasonYear: number, stats: TeamStats) {
  if (typeof window === 'undefined') return;

  const cacheKey = buildCacheKey(teamId, seasonYear);
  const entry = { stats, savedAt: Date.now() };
  const storedCache = readStoredCache();

  memoryCache.set(cacheKey, entry);
  localStorage.setItem(
    TEAM_STATS_CACHE_KEY,
    JSON.stringify({
      ...storedCache,
      [cacheKey]: entry,
    })
  );
}

async function fetchTeamStats(teamId: string, seasonYear: number) {
  const cacheKey = buildCacheKey(teamId, seasonYear);
  const inflight = inflightRequests.get(cacheKey);

  if (inflight) {
    return inflight;
  }

  const request = (async () => {
    const params = new URLSearchParams({
      teamId,
      seasonYear: String(seasonYear),
    });
    const res = await fetch(`/api/team-stats?${params.toString()}`);
    const data = await res.json();

    if (!data.success) {
      throw new Error(data.message || '팀 성적을 가져오지 못했어요.');
    }

    writeCachedStats(teamId, seasonYear, data.stats);
    return data.stats as TeamStats;
  })();

  inflightRequests.set(cacheKey, request);

  try {
    return await request;
  } finally {
    inflightRequests.delete(cacheKey);
  }
}

export function prefetchTeamStats(teamId: string | undefined, seasonYear: number) {
  if (!teamId || readCachedStats(teamId, seasonYear)) return;
  void fetchTeamStats(teamId, seasonYear).catch(() => {});
}

export function useTeamStats(teamId: string | undefined, seasonYear: number) {
  const [stats, setStats] = useState<TeamStats | null>(() => (teamId ? readCachedStats(teamId, seasonYear) : null));
  const [loading, setLoading] = useState(() => (teamId ? !readCachedStats(teamId, seasonYear) : false));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!teamId) {
      setStats(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    const requestedTeamId = teamId;
    const requestedSeasonYear = seasonYear;
    const cachedStats = readCachedStats(requestedTeamId, requestedSeasonYear);

    async function fetchStats() {
      try {
        if (cachedStats) {
          setStats(cachedStats);
          setError(null);
          setLoading(false);
        } else {
          setLoading(true);
        }

        const nextStats = await fetchTeamStats(requestedTeamId, requestedSeasonYear);

        if (cancelled) return;

        setStats(nextStats);
        setError(null);
      } catch (fetchError) {
        if (!cancelled) {
          if (!cachedStats) {
            setStats(null);
          }
          setError(fetchError instanceof Error ? fetchError.message : '팀 성적을 가져오지 못했어요.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchStats();

    return () => {
      cancelled = true;
    };
  }, [seasonYear, teamId]);

  return { stats, loading, error };
}
