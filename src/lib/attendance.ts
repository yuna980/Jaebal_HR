'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { ensureAnonymousSession } from '@/lib/supabase/auth';
import { getSupabaseBrowserClient, isSupabaseConfigured } from '@/lib/supabase/client';

export interface AttendanceRecord {
  teamId: string;
  date: string;
  venue: string;
  isAttending: boolean;
}

interface AttendanceRecordRow {
  team_id: string;
  game_date: string;
  venue: string;
  is_attending: boolean;
}

const ATTENDANCE_STORAGE_KEY = 'attendance-records';
const ATTENDANCE_EVENT = 'attendance-change';
const MAX_ATTENDANCE_RECORDS = 500;
const DEFAULT_RECORDS: AttendanceRecord[] = [];

let cachedRawValue: string | null = null;
let cachedRecords: AttendanceRecord[] = DEFAULT_RECORDS;
let attendanceSyncPromise: Promise<void> | null = null;

function subscribeToAttendance(callback: () => void) {
  const handleChange = () => callback();
  window.addEventListener('storage', handleChange);
  window.addEventListener(ATTENDANCE_EVENT, handleChange);

  return () => {
    window.removeEventListener('storage', handleChange);
    window.removeEventListener(ATTENDANCE_EVENT, handleChange);
  };
}

function emitChange() {
  window.dispatchEvent(new Event(ATTENDANCE_EVENT));
}

function buildAttendanceKey(record: Pick<AttendanceRecord, 'teamId' | 'date'>) {
  return `${record.teamId}:${record.date}`;
}

function safeParseAttendanceRecords(value: string | null) {
  if (!value) return DEFAULT_RECORDS;

  try {
    const parsed = JSON.parse(value) as AttendanceRecord[];
    if (!Array.isArray(parsed)) {
      return DEFAULT_RECORDS;
    }

    return parsed
      .filter((item): item is AttendanceRecord => {
        return Boolean(
          item &&
            typeof item.teamId === 'string' &&
            typeof item.date === 'string' &&
            typeof item.venue === 'string' &&
            typeof item.isAttending === 'boolean'
        );
      })
      .slice(0, MAX_ATTENDANCE_RECORDS);
  } catch {
    return DEFAULT_RECORDS;
  }
}

export function readAttendanceRecords() {
  if (typeof window === 'undefined') return DEFAULT_RECORDS;

  try {
    const rawValue = localStorage.getItem(ATTENDANCE_STORAGE_KEY);

    if (rawValue === cachedRawValue) {
      return cachedRecords;
    }

    cachedRawValue = rawValue;
    cachedRecords = safeParseAttendanceRecords(rawValue);
    return cachedRecords;
  } catch {
    return DEFAULT_RECORDS;
  }
}

function writeAttendanceRecords(records: AttendanceRecord[]) {
  try {
    localStorage.setItem(
      ATTENDANCE_STORAGE_KEY,
      JSON.stringify(records.slice(0, MAX_ATTENDANCE_RECORDS))
    );
    emitChange();
  } catch {
    emitChange();
  }
}

export function useAttendanceRecords() {
  const records = useSyncExternalStore(
    subscribeToAttendance,
    readAttendanceRecords,
    () => DEFAULT_RECORDS
  );

  useEffect(() => {
    void syncAttendanceRecordsFromSupabase();
  }, []);

  return records;
}

export function findAttendanceRecord(
  records: AttendanceRecord[],
  teamId: string,
  fullDate: string
) {
  return records.find((record) => record.teamId === teamId && record.date === fullDate) ?? null;
}

export function getAttendanceRecord(teamId: string, fullDate: string) {
  return readAttendanceRecords().find(
    (record) => record.teamId === teamId && record.date === fullDate
  ) ?? null;
}

export function setAttendanceForGame(
  teamId: string,
  fullDate: string,
  venue: string,
  isAttending: boolean
) {
  const records = readAttendanceRecords();
  const existingIndex = records.findIndex(
    (record) => record.teamId === teamId && record.date === fullDate
  );

  if (existingIndex >= 0) {
    const nextRecords = [...records];
    nextRecords[existingIndex] = {
      ...nextRecords[existingIndex],
      venue,
      isAttending,
    };
    writeAttendanceRecords(nextRecords);
    void upsertAttendanceRecordToSupabase(nextRecords[existingIndex]);
    return;
  }

  const nextRecord: AttendanceRecord = {
    teamId,
    date: fullDate,
    venue,
    isAttending,
  };

  writeAttendanceRecords([...records, nextRecord]);
  void upsertAttendanceRecordToSupabase(nextRecord);
}

function mergeAttendanceRecords(localRecords: AttendanceRecord[], remoteRecords: AttendanceRecord[]) {
  const merged = new Map<string, AttendanceRecord>();

  remoteRecords.forEach((record) => {
    merged.set(buildAttendanceKey(record), record);
  });

  localRecords.forEach((record) => {
    merged.set(buildAttendanceKey(record), record);
  });

  return Array.from(merged.values())
    .slice(0, MAX_ATTENDANCE_RECORDS)
    .sort((left, right) => right.date.localeCompare(left.date));
}

async function fetchAttendanceRecordsFromSupabase() {
  if (!isSupabaseConfigured()) return [];

  const userId = await ensureAnonymousSession();
  const supabase = getSupabaseBrowserClient();

  if (!userId || !supabase) return [];

  const { data, error } = await supabase
    .from('attendance_records')
    .select('team_id, game_date, venue, is_attending')
    .eq('user_id', userId)
    .order('game_date', { ascending: false });

  if (error) {
    console.warn('직관 정보 Supabase 조회 실패. 로컬 저장으로 계속 진행합니다.', error.message);
    return [];
  }

  return ((data ?? []) as AttendanceRecordRow[]).map((row) => ({
    teamId: row.team_id,
    date: row.game_date,
    venue: row.venue,
    isAttending: row.is_attending,
  }));
}

async function upsertAttendanceRecordToSupabase(record: AttendanceRecord) {
  if (!isSupabaseConfigured()) return;

  const userId = await ensureAnonymousSession();
  const supabase = getSupabaseBrowserClient();

  if (!userId || !supabase) return;

  const { error } = await supabase.from('attendance_records').upsert(
    {
      user_id: userId,
      team_id: record.teamId,
      game_date: record.date,
      venue: record.venue,
      is_attending: record.isAttending,
    },
    {
      onConflict: 'user_id,team_id,game_date',
    }
  );

  if (error) {
    console.warn('직관 정보 Supabase 저장 실패. 로컬 저장은 유지됩니다.', error.message);
  }
}

async function upsertAttendanceRecordsToSupabase(records: AttendanceRecord[]) {
  if (!isSupabaseConfigured() || records.length === 0) return;

  const userId = await ensureAnonymousSession();
  const supabase = getSupabaseBrowserClient();

  if (!userId || !supabase) return;

  const { error } = await supabase.from('attendance_records').upsert(
    records.map((record) => ({
      user_id: userId,
      team_id: record.teamId,
      game_date: record.date,
      venue: record.venue,
      is_attending: record.isAttending,
    })),
    {
      onConflict: 'user_id,team_id,game_date',
    }
  );

  if (error) {
    console.warn('직관 정보 Supabase 일괄 저장 실패. 로컬 저장은 유지됩니다.', error.message);
  }
}

export async function syncAttendanceRecordsFromSupabase() {
  if (!isSupabaseConfigured()) return;

  if (attendanceSyncPromise) {
    return attendanceSyncPromise;
  }

  attendanceSyncPromise = (async () => {
    const localRecords = readAttendanceRecords();
    const remoteRecords = await fetchAttendanceRecordsFromSupabase();
    const mergedRecords = mergeAttendanceRecords(localRecords, remoteRecords);

    writeAttendanceRecords(mergedRecords);
    await upsertAttendanceRecordsToSupabase(mergedRecords);
  })().finally(() => {
    attendanceSyncPromise = null;
  });

  await attendanceSyncPromise;
}
