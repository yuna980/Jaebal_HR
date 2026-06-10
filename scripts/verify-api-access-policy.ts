import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { API_ACCESS_POLICIES } from '../src/lib/apiAccessPolicy';

const expectedPolicies = {
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
} as const;

assert.deepEqual(API_ACCESS_POLICIES, expectedPolicies);

const routeFiles = Object.keys(expectedPolicies).map((route) => {
  const filePath = `src/app${route}/route.ts`;
  return [route, filePath, readFileSync(filePath, 'utf8')] as const;
});

for (const [route, filePath, content] of routeFiles) {
  const policy = expectedPolicies[route as keyof typeof expectedPolicies];

  if (policy === 'public') {
    assert.match(content, /checkRateLimit/, `${filePath} must rate-limit public API requests`);
  }

  if (policy === 'authenticated') {
    assert.match(content, /requireAuthenticatedApiUser/, `${filePath} must require a logged-in user`);
    assert.match(content, /로그인이 필요합니다/, `${filePath} must return a clear auth error`);
  }

  if (policy === 'cron') {
    assert.match(content, /isCronAuthorized/, `${filePath} must require cron authorization`);
    assert.match(content, /권한이 없습니다/, `${filePath} must return a clear cron auth error`);
  }
}

console.log('api access policy verified');
