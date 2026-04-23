'use client';

import { useEffect, useState } from 'react';
import { KboMatch } from '@/lib/kboScraper';

interface UseTodayGameScheduleResult {
  schedule: KboMatch | null;
  loading: boolean;
  error: string | null;
}

export function useTodayGameSchedule(teamId: string | undefined, date?: string): UseTodayGameScheduleResult {
  const [schedule, setSchedule] = useState<KboMatch | null>(null);
  const [loading, setLoading] = useState(Boolean(teamId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!teamId) {
      setSchedule(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const requestedTeamId = teamId;

    async function fetchSchedule() {
      try {
        setLoading(true);
        const params = new URLSearchParams({ teamId: requestedTeamId });
        if (date) params.set('date', date);

        const res = await fetch(`/api/game-schedules/today?${params.toString()}`);
        const data = await res.json();

        if (cancelled) return;

        if (data.success) {
          setSchedule(data.schedule);
          setError(null);
        } else {
          setSchedule(null);
          setError(data.message || '오늘 경기 일정을 가져오지 못했어요.');
        }
      } catch {
        if (!cancelled) {
          setSchedule(null);
          setError('서버와 연결할 수 없어요.');
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
