export type ApiAccessPolicy = 'public' | 'authenticated' | 'cron';

export const API_ACCESS_POLICIES = {
  '/api/game-histories/head-to-head': 'public',
  '/api/game-schedules/month': 'public',
  '/api/game-schedules/season': 'public',
  '/api/game-schedules/today': 'public',
  '/api/lineup': 'public',
  '/api/notifications/preferences': 'authenticated',
  '/api/notifications/send': 'cron',
  '/api/notifications/send/attendance-tip': 'cron',
  '/api/notifications/send/game-lineup': 'cron',
  '/api/notifications/subscription': 'authenticated',
  '/api/roster': 'public',
  '/api/schedule': 'public',
  '/api/stadium-tip': 'public',
  '/api/team-stats': 'public',
  '/api/weather': 'public',
} as const satisfies Record<string, ApiAccessPolicy>;
