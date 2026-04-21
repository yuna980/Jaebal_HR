'use client';

import { useState, useEffect } from 'react';
import { KboMatch } from '@/lib/kboScraper';

interface UseKboScheduleResult {
  schedules: KboMatch[];
  loading: boolean;
  error: string | null;
}

/**
 * KBO 일정 데이터를 가져오는 클라이언트 훅
 */
export function useKboSchedule(): UseKboScheduleResult {
  const [schedules, setSchedules] = useState<KboMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      try {
        setLoading(true);
        const res = await fetch('/api/schedule');
        const data = await res.json();

        if (!cancelled) {
          if (data.success) {
            setSchedules(data.schedules);
          } else {
            setError(data.message || '데이터를 가져오지 못했어요.');
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError('서버와 연결할 수 없어요 😢');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, []);

  return { schedules, loading, error };
}

/**
 * 오늘 날짜를 "MM.DD" 형식으로 반환합니다.
 */
export function getTodayDateString(): string {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${month}.${day}`;
}

/**
 * 오늘 날짜를 포함한 이번 주(월~일) 날짜 배열을 반환합니다.
 */
export function getThisWeekDates(): { date: string; dayOfWeek: string; dateNum: number; isToday: boolean }[] {
  const today = new Date();
  const currentDay = today.getDay(); // 0(일) ~ 6(토)
  // 월요일 기준으로 이번 주 시작일 계산
  const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
  
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const week: { date: string; dayOfWeek: string; dateNum: number; isToday: boolean }[] = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + mondayOffset + i);
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const dateNum = d.getDate();
    const dateStr = `${month}.${String(dateNum).padStart(2, '0')}`;
    week.push({
      date: dateStr,
      dayOfWeek: days[d.getDay()],
      dateNum,
      isToday: dateStr === getTodayDateString(),
    });
  }

  return week;
}
