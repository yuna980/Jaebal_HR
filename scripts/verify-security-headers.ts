import assert from 'node:assert/strict';
import nextConfig from '../next.config';

async function main() {
  assert.equal(nextConfig.poweredByHeader, false);

  const headerRules = await nextConfig.headers?.();
  assert.ok(headerRules, 'headers() must be configured');

  const globalRule = headerRules.find((rule) => rule.source === '/:path*');
  assert.ok(globalRule, 'global security header rule is required');

  const headers = new Map(globalRule.headers.map((header) => [header.key.toLowerCase(), header.value]));

  assert.equal(headers.get('x-frame-options'), 'SAMEORIGIN');
  assert.equal(headers.get('x-content-type-options'), 'nosniff');
  assert.equal(headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
  assert.equal(headers.get('strict-transport-security'), 'max-age=63072000; includeSubDomains; preload');
  assert.equal(headers.get('cross-origin-opener-policy'), 'same-origin');
  assert.equal(headers.get('cross-origin-resource-policy'), 'same-origin');
  assert.equal(headers.get('x-dns-prefetch-control'), 'off');
  assert.equal(headers.get('x-permitted-cross-domain-policies'), 'none');

  const permissionsPolicy = headers.get('permissions-policy') ?? '';
  assert.match(permissionsPolicy, /camera=\(\)/);
  assert.match(permissionsPolicy, /microphone=\(\)/);
  assert.match(permissionsPolicy, /geolocation=\(\)/);
  assert.match(permissionsPolicy, /payment=\(\)/);
  assert.match(permissionsPolicy, /usb=\(\)/);

  const csp = headers.get('content-security-policy') ?? '';
  assert.match(csp, /object-src 'none'/);
  assert.match(csp, /base-uri 'self'/);
  assert.match(csp, /form-action 'self'/);
  assert.match(csp, /frame-ancestors 'self'/);
  assert.match(csp, /upgrade-insecure-requests/);

  console.log('security headers verified');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
