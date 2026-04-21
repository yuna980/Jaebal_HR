'use client';

import { useSyncExternalStore } from 'react';
import { KboMatch, TEAM_NAME_TO_ID } from '@/lib/kboScraper';

export interface FanDiaryRecord {
  teamId: string;
  date: string;
  venue: string;
  isAttending: boolean;
  result: 'W' | 'L' | 'D' | '-';
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

function safeParseRecords(value: string | null) {
  if (!value) return DEFAULT_RECORDS;

  try {
    const parsed = JSON.parse(value) as FanDiaryRecord[];
    if (!Array.isArray(parsed)) {
      return DEFAULT_RECORDS;
    }

    return parsed
      .filter((item): item is FanDiaryRecord => {
        return Boolean(
          item &&
            typeof item.teamId === 'string' &&
            typeof item.date === 'string' &&
            typeof item.venue === 'string' &&
            typeof item.isAttending === 'boolean' &&
            ['W', 'L', 'D', '-'].includes(item.result) &&
            typeof item.review === 'string' &&
            typeof item.rating === 'number'
        );
      })
      .slice(0, MAX_DIARY_RECORDS)
      .map((item) => ({
        ...item,
        review: item.review.slice(0, MAX_REVIEW_LENGTH),
        rating: Math.min(5, Math.max(0, Math.round(item.rating))),
      }));
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
    const normalizedRecords = records.slice(0, MAX_DIARY_RECORDS).map((record) => ({
      ...record,
      review: record.review.slice(0, MAX_REVIEW_LENGTH),
      rating: Math.min(5, Math.max(0, Math.round(record.rating))),
    }));

    localStorage.setItem(FAN_DIARY_STORAGE_KEY, JSON.stringify(normalizedRecords));
    emitChange();
  } catch {
    emitChange();
  }
}

export function useFanDiaryRecords() {
  return useSyncExternalStore(subscribeToFanDiary, readFanDiaryRecords, () => DEFAULT_RECORDS);
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

export function setAttendanceForGame(teamId: string, fullDate: string, venue: string, isAttending: boolean) {
  const records = readFanDiaryRecords();
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
    writeFanDiaryRecords(nextRecords);
    return;
  }

  writeFanDiaryRecords([
    ...records,
    {
      teamId,
      date: fullDate,
      venue,
      isAttending,
      result: '-',
      review: '',
      rating: 0,
    },
  ]);
}

export function saveDiaryRecord(record: FanDiaryRecord) {
  const records = readFanDiaryRecords();
  const existingIndex = records.findIndex(
    (item) => item.teamId === record.teamId && item.date === record.date
  );

  if (existingIndex >= 0) {
    const nextRecords = [...records];
    nextRecords[existingIndex] = {
      ...nextRecords[existingIndex],
      ...record,
    };
    writeFanDiaryRecords(nextRecords);
    return;
  }

  writeFanDiaryRecords([...records, record]);
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
