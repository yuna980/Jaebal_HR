'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { KboMatch, TEAM_NAME_TO_ID } from '@/lib/kboScraper';
import { ensureAnonymousSession } from '@/lib/supabase/auth';
import { getSupabaseBrowserClient, isSupabaseConfigured } from '@/lib/supabase/client';

export interface FanDiaryRecord {
  teamId: string;
  date: string;
  venue: string;
  result: 'W' | 'L' | 'D' | '-';
  review: string;
  rating: number;
}

interface FanDiaryRecordRow {
  team_id: string;
  game_date: string;
  venue: string;
  result: FanDiaryRecord['result'];
  review: string;
  rating: number;
}

const FAN_DIARY_STORAGE_KEY = 'fan-diary-records';
const FAN_DIARY_EVENT = 'fan-diary-change';
const MAX_DIARY_RECORDS = 500;
const MAX_REVIEW_LENGTH = 1000;
const DEFAULT_RECORDS: FanDiaryRecord[] = [];

let cachedRawValue: string | null = null;
let cachedRecords: FanDiaryRecord[] = DEFAULT_RECORDS;
let fanDiarySyncPromise: Promise<void> | null = null;

function subscribeToFanDiary(callback: () => void) {
  const handleChange = () => callback();
  window.addEventListener('storage', handleChange);
  window.addEventListener(FAN_DIARY_EVENT, handleChange);

  return () => {
    window.removeEventListener('storage', handleChange);
    window.removeEventListener(FAN_DIARY_EVENT, handleChange);
  };
}

function emitChange() {
  window.dispatchEvent(new Event(FAN_DIARY_EVENT));
}

function buildDiaryKey(record: Pick<FanDiaryRecord, 'teamId' | 'date'>) {
  return `${record.teamId}:${record.date}`;
}

function normalizeDiaryItem(item: {
  teamId: string;
  date: string;
  venue: string;
  result: 'W' | 'L' | 'D' | '-';
  review: string;
  rating: number;
}) {
  return {
    ...item,
    review: item.review.slice(0, MAX_REVIEW_LENGTH),
    rating: Math.min(5, Math.max(0, Math.round(item.rating))),
  };
}

function isSavedDiaryRecord(item: unknown): item is FanDiaryRecord {
  if (!item || typeof item !== 'object') return false;

  const candidate = item as Partial<FanDiaryRecord> & { isAttending?: boolean };
  if (
    typeof candidate.teamId !== 'string' ||
    typeof candidate.date !== 'string' ||
    typeof candidate.venue !== 'string' ||
    !['W', 'L', 'D', '-'].includes(candidate.result ?? '') ||
    typeof candidate.review !== 'string' ||
    typeof candidate.rating !== 'number'
  ) {
    return false;
  }

  return candidate.review.trim().length > 0;
}

function safeParseRecords(value: string | null) {
  if (!value) return DEFAULT_RECORDS;

  try {
    const parsed = JSON.parse(value) as unknown[];
    if (!Array.isArray(parsed)) {
      return DEFAULT_RECORDS;
    }

    return parsed
      .filter(isSavedDiaryRecord)
      .slice(0, MAX_DIARY_RECORDS)
      .map(normalizeDiaryItem);
  } catch {
    return DEFAULT_RECORDS;
  }
}

export function readFanDiaryRecords() {
  if (typeof window === 'undefined') return DEFAULT_RECORDS;
  try {
    const rawValue = localStorage.getItem(FAN_DIARY_STORAGE_KEY);

    if (rawValue === cachedRawValue) {
      return cachedRecords;
    }

    cachedRawValue = rawValue;
    cachedRecords = safeParseRecords(rawValue);
    return cachedRecords;
  } catch {
    return DEFAULT_RECORDS;
  }
}

function writeFanDiaryRecords(records: FanDiaryRecord[]) {
  try {
    const normalizedRecords = records
      .slice(0, MAX_DIARY_RECORDS)
      .map(normalizeDiaryItem)
      .filter((record) => record.review.trim().length > 0);

    localStorage.setItem(FAN_DIARY_STORAGE_KEY, JSON.stringify(normalizedRecords));
    emitChange();
  } catch {
    emitChange();
  }
}

export function useFanDiaryRecords() {
  const records = useSyncExternalStore(subscribeToFanDiary, readFanDiaryRecords, () => DEFAULT_RECORDS);

  useEffect(() => {
    void syncFanDiaryRecordsFromSupabase();
  }, []);

  return records;
}

export function formatDiaryDate(year: number, dateText: string) {
  return `${year}.${dateText}`;
}

export function getRecordForDate(teamId: string, fullDate: string) {
  return readFanDiaryRecords().find((record) => record.teamId === teamId && record.date === fullDate) ?? null;
}

export function findRecordForDate(records: FanDiaryRecord[], teamId: string, fullDate: string) {
  return records.find((record) => record.teamId === teamId && record.date === fullDate) ?? null;
}

export function saveDiaryRecord(record: FanDiaryRecord) {
  const normalizedRecord = normalizeDiaryItem(record);
  const records = readFanDiaryRecords();
  const existingIndex = records.findIndex(
    (item) => item.teamId === normalizedRecord.teamId && item.date === normalizedRecord.date
  );

  if (existingIndex >= 0) {
    const nextRecords = [...records];
    nextRecords[existingIndex] = {
      ...nextRecords[existingIndex],
      ...normalizedRecord,
    };
    writeFanDiaryRecords(nextRecords);
    void upsertFanDiaryRecordToSupabase(nextRecords[existingIndex]);
    return;
  }

  const nextRecords = [...records, normalizedRecord];
  writeFanDiaryRecords(nextRecords);
  void upsertFanDiaryRecordToSupabase(normalizedRecord);
}

export function deleteDiaryRecord(teamId: string, fullDate: string) {
  const records = readFanDiaryRecords();
  const nextRecords = records.filter(
    (record) => !(record.teamId === teamId && record.date === fullDate)
  );

  writeFanDiaryRecords(nextRecords);
  void deleteFanDiaryRecordFromSupabase(teamId, fullDate);
}

export function getGameResultForTeam(game: KboMatch, teamId: string): 'W' | 'L' | 'D' | '-' {
  if (game.status !== 'finished') return '-';

  const isHome = TEAM_NAME_TO_ID[game.homeTeam] === teamId;
  const myScore = isHome ? game.homeScore ?? 0 : game.awayScore ?? 0;
  const opponentScore = isHome ? game.awayScore ?? 0 : game.homeScore ?? 0;

  if (myScore > opponentScore) return 'W';
  if (myScore < opponentScore) return 'L';
  return 'D';
}

function mergeFanDiaryRecords(localRecords: FanDiaryRecord[], remoteRecords: FanDiaryRecord[]) {
  const merged = new Map<string, FanDiaryRecord>();

  remoteRecords.forEach((record) => {
    merged.set(buildDiaryKey(record), record);
  });

  localRecords.forEach((record) => {
    merged.set(buildDiaryKey(record), record);
  });

  return Array.from(merged.values())
    .filter((record) => record.review.trim().length > 0)
    .slice(0, MAX_DIARY_RECORDS)
    .sort((left, right) => right.date.localeCompare(left.date));
}

async function fetchFanDiaryRecordsFromSupabase() {
  if (!isSupabaseConfigured()) return [];

  const userId = await ensureAnonymousSession();
  const supabase = getSupabaseBrowserClient();

  if (!userId || !supabase) return [];

  const { data, error } = await supabase
    .from('fan_diaries')
    .select('team_id, game_date, venue, result, review, rating')
    .eq('user_id', userId)
    .order('game_date', { ascending: false });

  if (error) {
    console.warn('야구일기 Supabase 조회 실패. 로컬 저장으로 계속 진행합니다.', error.message);
    return [];
  }

  return ((data ?? []) as FanDiaryRecordRow[])
    .map((row) =>
      normalizeDiaryItem({
        teamId: row.team_id,
        date: row.game_date,
        venue: row.venue,
        result: row.result as FanDiaryRecord['result'],
        review: row.review,
        rating: row.rating,
      })
    )
    .filter((record) => record.review.trim().length > 0);
}

async function upsertFanDiaryRecordToSupabase(record: FanDiaryRecord) {
  if (!isSupabaseConfigured()) return;

  const userId = await ensureAnonymousSession();
  const supabase = getSupabaseBrowserClient();

  if (!userId || !supabase) return;

  const { error } = await supabase.from('fan_diaries').upsert(
    {
      user_id: userId,
      team_id: record.teamId,
      game_date: record.date,
      venue: record.venue,
      result: record.result,
      review: record.review,
      rating: record.rating,
    },
    {
      onConflict: 'user_id,team_id,game_date',
    }
  );

  if (error) {
    console.warn('야구일기 Supabase 저장 실패. 로컬 저장은 유지됩니다.', error.message);
  }
}

async function upsertFanDiaryRecordsToSupabase(records: FanDiaryRecord[]) {
  if (!isSupabaseConfigured() || records.length === 0) return;

  const userId = await ensureAnonymousSession();
  const supabase = getSupabaseBrowserClient();

  if (!userId || !supabase) return;

  const { error } = await supabase.from('fan_diaries').upsert(
    records.map((record) => ({
      user_id: userId,
      team_id: record.teamId,
      game_date: record.date,
      venue: record.venue,
      result: record.result,
      review: record.review,
      rating: record.rating,
    })),
    {
      onConflict: 'user_id,team_id,game_date',
    }
  );

  if (error) {
    console.warn('야구일기 Supabase 일괄 저장 실패. 로컬 저장은 유지됩니다.', error.message);
  }
}

async function deleteFanDiaryRecordFromSupabase(teamId: string, fullDate: string) {
  if (!isSupabaseConfigured()) return;

  const userId = await ensureAnonymousSession();
  const supabase = getSupabaseBrowserClient();

  if (!userId || !supabase) return;

  const { error } = await supabase
    .from('fan_diaries')
    .delete()
    .eq('user_id', userId)
    .eq('team_id', teamId)
    .eq('game_date', fullDate);

  if (error) {
    console.warn('야구일기 Supabase 삭제 실패. 로컬 삭제는 유지됩니다.', error.message);
  }
}

async function cleanupPlaceholderFanDiaryRecordsInSupabase() {
  if (!isSupabaseConfigured()) return;

  const userId = await ensureAnonymousSession();
  const supabase = getSupabaseBrowserClient();

  if (!userId || !supabase) return;

  const { error } = await supabase
    .from('fan_diaries')
    .delete()
    .eq('user_id', userId)
    .eq('review', '')
    .eq('rating', 0)
    .eq('result', '-');

  if (error) {
    console.warn('임시 야구일기 정리 실패. 서비스는 계속 이용할 수 있습니다.', error.message);
  }
}

export async function syncFanDiaryRecordsFromSupabase() {
  if (!isSupabaseConfigured()) return;

  if (fanDiarySyncPromise) {
    return fanDiarySyncPromise;
  }

  fanDiarySyncPromise = (async () => {
    const localRecords = readFanDiaryRecords();
    const remoteRecords = await fetchFanDiaryRecordsFromSupabase();
    const mergedRecords = mergeFanDiaryRecords(localRecords, remoteRecords);

    writeFanDiaryRecords(mergedRecords);
    await upsertFanDiaryRecordsToSupabase(mergedRecords);
    await cleanupPlaceholderFanDiaryRecordsInSupabase();
  })().finally(() => {
    fanDiarySyncPromise = null;
  });

  await fanDiarySyncPromise;
}
