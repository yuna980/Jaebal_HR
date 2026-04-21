const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 60;

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

export function checkRateLimit(request: Request, scope: string) {
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

export function isValidTeamId(teamId: string, validTeamIds: string[]) {
  return validTeamIds.includes(teamId);
}

export function isValidCompactDate(value: string) {
  return /^\d{8}$/.test(value);
}

export function isValidIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
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
