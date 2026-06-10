import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { chromium } from 'playwright';

function loadLocalEnv() {
  try {
    const envText = readFileSync('.env.local', 'utf8');

    for (const line of envText.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const separatorIndex = trimmed.indexOf('=');
      if (separatorIndex === -1) continue;

      const key = trimmed.slice(0, separatorIndex);
      const value = trimmed.slice(separatorIndex + 1);

      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    return;
  }
}

loadLocalEnv();

const baseUrl = process.env.APP_BASE_URL ?? 'https://jaebal-hr.vercel.app';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

assert.ok(supabaseUrl, 'NEXT_PUBLIC_SUPABASE_URL is required');
assert.ok(serviceRoleKey, 'SUPABASE_SERVICE_ROLE_KEY is required for test user cleanup');

const email = `codex-auth-team-${Date.now()}@example.com`;
const password = 'Testpass123!';
let createdUserId: string | null = null;

const browserEvents: string[] = [];

async function main() {
  const browser = await chromium.launch({ headless: process.env.PLAYWRIGHT_HEADLESS !== '0' });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

  page.on('console', (message) => {
    if (message.type() === 'error') {
      browserEvents.push(`[console:${message.type()}] ${message.text()}`);
    }
  });

  page.on('pageerror', (error) => {
    browserEvents.push(`[pageerror] ${error.message}`);
  });

  page.on('requestfailed', (request) => {
    browserEvents.push(`[requestfailed] ${request.method()} ${request.url()} ${request.failure()?.errorText ?? ''}`);
  });

  try {
    await page.goto(`${baseUrl}/signup`, { waitUntil: 'networkidle', timeout: 45_000 });
    await page.getByPlaceholder('you@example.com').fill(email);
    await page.getByPlaceholder('6자 이상').fill(password);
    await page.getByRole('button', { name: /회원가입하기/ }).click();

    await page.waitForURL(/\/teams(?:\?|$)/, { timeout: 30_000 });
    createdUserId = await page.evaluate(() => localStorage.getItem('auth-user-id'));
    assert.ok(createdUserId, 'signup should store authenticated user id');

    await page.getByText('LG 트윈스').first().click();
    await page.getByRole('button', { name: /함께 시작하기/ }).click();

    await page.waitForURL(/\/dashboard(?:\?|$)/, { timeout: 30_000 });

    const bodyText = await page.locator('body').innerText();
    assert.match(page.url(), /\/dashboard(?:\?|$)/);
    assert.equal(bodyText.includes('응원팀 저장 중'), false);
    assert.equal(bodyText.includes('응원팀 저장에 실패'), false);

    console.log('auth team selection browser flow verified');
  } catch (error) {
    console.error('Auth/team browser flow failed.');
    console.error(`URL: ${page.url()}`);

    if (browserEvents.length > 0) {
      console.error(browserEvents.join('\n'));
    }

    throw error;
  } finally {
    await browser.close();

    if (createdUserId) {
      const admin = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });

      const { error } = await admin.auth.admin.deleteUser(createdUserId);
      if (error) {
        console.error(`Test user cleanup failed: ${createdUserId} ${error.message}`);
      }
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
