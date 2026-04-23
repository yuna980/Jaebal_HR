'use client';

import { useEffect, useState } from 'react';
import type { HeadToHeadRecord } from '@/lib/gameRecords';

interface UseHeadToHeadRecordResult {
  record: HeadToHeadRecord | null;
  loading: boolean;
  error: string | null;
  source: 'db' | 'crawl' | null;
  loaded: boolean;
}

export function useHeadToHeadRecord(
  teamId: string | undefined,
  opponentTeamId: string | undefined,
  seasonYear: number | undefined
): UseHeadToHeadRecordResult {
  const [record, setRecord] = useState<HeadToHeadRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<'db' | 'crawl' | null>(null);
  const [loadedKey, setLoadedKey] = useState('');
  const requestKey =
    teamId && opponentTeamId && seasonYear ? `${teamId}-${opponentTeamId}-${seasonYear}` : 'none';

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

    async function fetchRecord() {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          teamId: requestedTeamId,
          opponentTeamId: requestedOpponentTeamId,
          seasonYear: String(requestedSeasonYear),
        });

        const res = await fetch(`/api/game-histories/head-to-head?${params.toString()}`);
        const data = await res.json();

        if (cancelled) return;

        if (!data.success) {
          setError(data.message || '상대 전적을 불러오지 못했어요.');
          setRecord(null);
          setSource(null);
          return;
        }

        setRecord(data.record);
        setSource(data.source ?? null);
        setError(null);
      } catch {
        if (cancelled) return;
        setError('상대 전적을 불러오지 못했어요.');
        setRecord(null);
        setSource(null);
      } finally {
        if (!cancelled) {
          setLoading(false);
          setLoadedKey(`${requestedTeamId}-${requestedOpponentTeamId}-${requestedSeasonYear}`);
        }
      }
    }

    void fetchRecord();

    return () => {
      cancelled = true;
    };
  }, [opponentTeamId, seasonYear, teamId]);

  return { record, loading, error, source, loaded: loadedKey === requestKey && !loading };
}
