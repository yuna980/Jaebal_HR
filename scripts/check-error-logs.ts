import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

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

function formatKst(value: string | null) {
  if (!value) return '-';

  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date(value));
}

loadLocalEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

assert.ok(supabaseUrl, 'NEXT_PUBLIC_SUPABASE_URL is required');
assert.ok(serviceRoleKey, 'SUPABASE_SERVICE_ROLE_KEY is required');

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

async function main() {
  const { data: logs, error } = await supabase
    .from('server_error_logs')
    .select('id, created_at, route, method, status_code, error_name, error_message, user_id, request_path')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    throw new Error(`에러 로그 조회 실패: ${error.message}`);
  }

  console.log('최근 서버 에러 로그');
  console.table(
    (logs ?? []).map((log) => ({
      id: log.id,
      createdAt: formatKst(log.created_at),
      route: log.route,
      method: log.method ?? '',
      status: log.status_code ?? '',
      name: log.error_name,
      message: log.error_message,
      userId: log.user_id ?? '',
      path: log.request_path ?? '',
    }))
  );

  if (!logs || logs.length === 0) {
    console.log('최근 서버 에러 로그가 없습니다.');
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
