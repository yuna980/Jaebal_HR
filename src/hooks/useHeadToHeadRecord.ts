'use client';

import { useEffect, useState } from 'react';
import type { HeadToHeadRecord } from '@/lib/gameRecords';
import { createTimedMemoryCache } from '@/lib/requestCache';

interface UseHeadToHeadRecordResult {
  record: HeadToHeadRecord | null;
  loading: boolean;
  error: string | null;
  source: 'db' | 'crawl' | null;
  loaded: boolean;
}

type HeadToHeadCacheValue = {
  record: HeadToHeadRecord | null;
  source: 'db' | 'crawl' | null;
};

const HEAD_TO_HEAD_CACHE_TTL_MS = 5 * 60 * 1000;
const recordCache = createTimedMemoryCache<HeadToHeadCacheValue>(HEAD_TO_HEAD_CACHE_TTL_MS);
const inflightRequests = new Map<string, Promise<HeadToHeadCacheValue>>();

export function useHeadToHeadRecord(
  teamId: string | undefined,
  opponentTeamId: string | undefined,
  seasonYear: number | undefined
): UseHeadToHeadRecordResult {
  const requestKey =
    teamId && opponentTeamId && seasonYear ? `${teamId}-${opponentTeamId}-${seasonYear}` : 'none';
  const cachedValue = requestKey !== 'none' ? recordCache.get(requestKey) : null;
  const [record, setRecord] = useState<HeadToHeadRecord | null>(cachedValue?.record ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<'db' | 'crawl' | null>(cachedValue?.source ?? null);
  const [loadedKey, setLoadedKey] = useState(cachedValue ? requestKey : '');

  useEffect(() => {
    if (!teamId || !opponentTeamId || !seasonYear) {
      setRecord(null);
      setSource(null);
      setError(null);
      setLoading(false);
      setLoadedKey('none');
      return;
    }

    let cancelled = false;
    const requestedTeamId = teamId;
    const requestedOpponentTeamId = opponentTeamId;
    const requestedSeasonYear = seasonYear;
    const requestedKey = requestKey;

    const cachedRecord = recordCache.get(requestedKey);
    if (recordCache.has(requestedKey)) {
      setRecord(cachedRecord?.record ?? null);
      setSource(cachedRecord?.source ?? null);
      setError(null);
      setLoading(false);
      setLoadedKey(requestedKey);
      return;
    }

    async function fetchRecord() {
      try {
        setLoading(true);
        const existingRequest = inflightRequests.get(requestedKey);
        const request =
          existingRequest ??
          (async () => {
            const params = new URLSearchParams({
              teamId: requestedTeamId,
              opponentTeamId: requestedOpponentTeamId,
              seasonYear: String(requestedSeasonYear),
            });

            const res = await fetch(`/api/game-histories/head-to-head?${params.toString()}`);
            const data = await res.json();

            if (!data.success) {
              throw new Error(data.message || '상대 전적을 불러오지 못했어요.');
            }

            const nextValue = {
              record: data.record as HeadToHeadRecord | null,
              source: (data.source ?? null) as 'db' | 'crawl' | null,
            };
            recordCache.set(requestedKey, nextValue);
            return nextValue;
          })();

        if (!existingRequest) {
          inflightRequests.set(
            requestedKey,
            request.finally(() => inflightRequests.delete(requestedKey))
          );
        }

        const nextValue = await request;

        if (cancelled) return;

        setRecord(nextValue.record);
        setSource(nextValue.source);
        setError(null);
      } catch (fetchError) {
        if (cancelled) return;
        setError(fetchError instanceof Error ? fetchError.message : '상대 전적을 불러오지 못했어요.');
        setRecord(null);
        setSource(null);
      } finally {
        if (!cancelled) {
          setLoading(false);
          setLoadedKey(requestedKey);
        }
      }
    }

    void fetchRecord();

    return () => {
      cancelled = true;
    };
  }, [opponentTeamId, requestKey, seasonYear, teamId]);

  return { record, loading, error, source, loaded: loadedKey === requestKey && !loading };
}
