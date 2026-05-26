import { getSupabaseAdminClient } from '@/lib/supabase/admin';

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 60;
const RATE_LIMIT_WINDOW_SECONDS = RATE_LIMIT_WINDOW_MS / 1000;

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const rateLimitStore = new Map<string, RateLimitEntry>();

function cleanupExpiredEntries(now: number) {
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetAt <= now) {
      rateLimitStore.delete(key);
    }
  }
}

export function getClientIp(request: Request) {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() || 'unknown';
  }

  return request.headers.get('x-real-ip') || 'unknown';
}

function checkMemoryRateLimit(request: Request, scope: string) {
  const now = Date.now();
  cleanupExpiredEntries(now);

  const ip = getClientIp(request);
  const key = `${scope}:${ip}`;
  const existing = rateLimitStore.get(key);

  if (!existing || existing.resetAt <= now) {
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });

    return {
      allowed: true,
      remaining: RATE_LIMIT_MAX_REQUESTS - 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    };
  }

  if (existing.count >= RATE_LIMIT_MAX_REQUESTS) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: existing.resetAt,
    };
  }

  existing.count += 1;
  rateLimitStore.set(key, existing);

  return {
    allowed: true,
    remaining: RATE_LIMIT_MAX_REQUESTS - existing.count,
    resetAt: existing.resetAt,
  };
}

type RateLimitRpcRow = {
  allowed: boolean;
  remaining: number;
  reset_at: string;
};

export async function checkRateLimit(request: Request, scope: string) {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return checkMemoryRateLimit(request, scope);
  }

  const clientIp = getClientIp(request);
  const { data, error } = await supabase.rpc('consume_api_rate_limit', {
    p_scope: scope,
    p_client_key: clientIp,
    p_window_seconds: RATE_LIMIT_WINDOW_SECONDS,
    p_max_requests: RATE_LIMIT_MAX_REQUESTS,
  });

  if (error) {
    console.error('Rate limit RPC 실패. 메모리 제한으로 대체합니다:', error);
    return checkMemoryRateLimit(request, scope);
  }

  const row = Array.isArray(data) ? (data[0] as RateLimitRpcRow | undefined) : null;

  if (!row) {
    return checkMemoryRateLimit(request, scope);
  }

  return {
    allowed: row.allowed,
    remaining: row.remaining,
    resetAt: new Date(row.reset_at).getTime(),
  };
}

export function isValidTeamId(teamId: string, validTeamIds: string[]) {
  return validTeamIds.includes(teamId);
}

export function isValidSeasonYear(value: number) {
  return Number.isInteger(value) && value >= 2000 && value <= 2100;
}

export function isValidCompactDate(value: string) {
  return /^\d{8}$/.test(value);
}

export function isValidIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [yearText, monthText, dayText] = value.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function isValidMonthDayDate(value: string) {
  return /^\d{2}\.\d{2}$/.test(value);
}

export function normalizeLineupDate(value: string) {
  if (isValidCompactDate(value)) {
    return value;
  }

  if (isValidIsoDate(value)) {
    return value.replaceAll('-', '');
  }

  if (isValidMonthDayDate(value)) {
    const today = new Date();
    const [month, day] = value.split('.');
    return `${today.getFullYear()}${month}${day}`;
  }

  return null;
}
