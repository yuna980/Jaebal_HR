import assert from 'node:assert/strict';
import {
  buildServerErrorLog,
  getRequestErrorContext,
  redactSensitiveLogValue,
  serializeErrorForLog,
} from '../src/lib/errorLogs';

const serializedError = serializeErrorForLog(new TypeError('broken'));
assert.equal(serializedError.name, 'TypeError');
assert.equal(serializedError.message, 'broken');
assert.ok(serializedError.stack?.includes('TypeError'));

const serializedString = serializeErrorForLog('plain failure');
assert.equal(serializedString.name, 'Error');
assert.equal(serializedString.message, 'plain failure');
assert.equal(serializedString.stack, null);

const request = new Request('https://example.com/api/schedule?team=lg&empty=', {
  method: 'POST',
});
const context = getRequestErrorContext(request);
assert.equal(context.method, 'POST');
assert.equal(context.requestPath, '/api/schedule');
assert.deepEqual(context.query, { team: 'lg', empty: '' });

const log = buildServerErrorLog({
  route: '/api/schedule',
  request,
  statusCode: 500,
  error: new Error('database down'),
  metadata: { step: 'fetch' },
});

assert.equal(log.source, 'next_api');
assert.equal(log.route, '/api/schedule');
assert.equal(log.method, 'POST');
assert.equal(log.status_code, 500);
assert.equal(log.error_name, 'Error');
assert.equal(log.error_message, 'database down');
assert.equal(log.request_path, '/api/schedule');
assert.deepEqual(log.query, { team: 'lg', empty: '' });
assert.deepEqual(log.metadata, { step: 'fetch' });

const sensitiveRequest = new Request(
  'https://example.com/api/schedule?access_token=abc123&team=lg&refreshToken=def456',
  {
    method: 'GET',
  }
);
const sensitiveLog = buildServerErrorLog({
  route: '/api/schedule',
  request: sensitiveRequest,
  statusCode: 500,
  error: new Error('auth failed with token abc123'),
  metadata: {
    authorization: 'Bearer abc123',
    nested: {
      cookie: 'sb-access-token=abc123',
      safeValue: 'keep-me',
    },
    list: [{ apiKey: 'secret-key' }, 'plain'],
  },
});

assert.deepEqual(sensitiveLog.query, {
  access_token: '[REDACTED]',
  team: 'lg',
  refreshToken: '[REDACTED]',
});
assert.deepEqual(sensitiveLog.metadata, {
  authorization: '[REDACTED]',
  nested: {
    cookie: '[REDACTED]',
    safeValue: 'keep-me',
  },
  list: [{ apiKey: '[REDACTED]' }, 'plain'],
});
assert.equal(sensitiveLog.error_message, 'auth failed with token [REDACTED]');

assert.deepEqual(
  redactSensitiveLogValue({
    password: 'pw',
    profile: { email: 'safe@example.com', session_secret: 'secret' },
  }),
  {
    password: '[REDACTED]',
    profile: { email: 'safe@example.com', session_secret: '[REDACTED]' },
  }
);

console.log('error log helpers verified');
