import type { KboMatch } from '@/lib/kboScraper';

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const DEFAULT_TTL_MS = 5 * MINUTE;
const PRE_GAME_TTL_MS = 1 * MINUTE;
const LIVE_TTL_MS = 30 * SECOND;
const POST_GAME_TTL_MS = 1 * MINUTE;

function getKstDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
  };
}

function buildKstDate(year: number, month: number, day: number, hour: number, minute: number) {
  return new Date(Date.UTC(year, month - 1, day, hour - 9, minute));
}

function getGameStartDate(game: KboMatch, now: Date) {
  const timeMatch = game.time.match(/^(\d{1,2}):(\d{2})$/);
  if (!timeMatch) return null;

  const nowParts = getKstDateParts(now);
  const gameDateMatch = game.date.match(/^(\d{2})\.(\d{2})$/);
  const month = gameDateMatch ? Number(gameDateMatch[1]) : nowParts.month;
  const day = gameDateMatch ? Number(gameDateMatch[2]) : nowParts.day;

  return buildKstDate(nowParts.year, month, day, Number(timeMatch[1]), Number(timeMatch[2]));
}

export function getTodayScheduleCacheTtlMs(schedule: KboMatch | null, now = new Date()) {
  if (!schedule || schedule.status === 'cancelled') {
    return DEFAULT_TTL_MS;
  }

  if (schedule.status === 'finished') {
    return POST_GAME_TTL_MS;
  }

  const gameStart = getGameStartDate(schedule, now);
  if (!gameStart) {
    return DEFAULT_TTL_MS;
  }

  const untilStartMs = gameStart.getTime() - now.getTime();
  const sinceStartMs = now.getTime() - gameStart.getTime();

  if (untilStartMs > 2 * 60 * MINUTE) {
    return DEFAULT_TTL_MS;
  }

  if (untilStartMs > 0) {
    return PRE_GAME_TTL_MS;
  }

  if (sinceStartMs < 4 * 60 * MINUTE) {
    return LIVE_TTL_MS;
  }

  if (sinceStartMs < 6 * 60 * MINUTE) {
    return POST_GAME_TTL_MS;
  }

  return DEFAULT_TTL_MS;
}
