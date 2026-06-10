import assert from 'node:assert/strict';
import {
  buildServerErrorLog,
  getRequestErrorContext,
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

console.log('error log helpers verified');
