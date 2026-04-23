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

export function useTeamStats(teamId: string | undefined, seasonYear: number) {
  const [stats, setStats] = useState<TeamStats | null>(null);
  const [loading, setLoading] = useState(Boolean(teamId));
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

    async function fetchStats() {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          teamId: requestedTeamId,
          seasonYear: String(requestedSeasonYear),
        });
        const res = await fetch(`/api/team-stats?${params.toString()}`);
        const data = await res.json();

        if (cancelled) return;

        if (data.success) {
          setStats(data.stats);
          setError(null);
        } else {
          setStats(null);
          setError(data.message || '팀 성적을 가져오지 못했어요.');
        }
      } catch {
        if (!cancelled) {
          setStats(null);
          setError('팀 성적을 가져오지 못했어요.');
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
