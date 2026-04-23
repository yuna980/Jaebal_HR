'use client';

import { useEffect, useState } from 'react';
import { KboMatch } from '@/lib/kboScraper';

interface UseGameScheduleMonthResult {
  schedules: KboMatch[];
  loading: boolean;
  error: string | null;
}

export function useGameScheduleMonth(year: number, month: number): UseGameScheduleMonthResult {
  const [schedules, setSchedules] = useState<KboMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchSchedules() {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          year: String(year),
          month: String(month),
        });
        const res = await fetch(`/api/game-schedules/month?${params.toString()}`);
        const data = await res.json();

        if (cancelled) return;

        if (data.success) {
          setSchedules(data.schedules);
          setError(null);
        } else {
          setSchedules([]);
          setError(data.message || '월간 대진표를 가져오지 못했어요.');
        }
      } catch {
        if (!cancelled) {
          setSchedules([]);
          setError('서버와 연결할 수 없어요.');
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
