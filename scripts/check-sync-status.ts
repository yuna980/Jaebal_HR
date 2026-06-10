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
  const { data: runs, error: runsError } = await supabase
    .from('kbo_sync_runs')
    .select('id, started_at, finished_at, mode, status, total_processed, total_saved, total_invalid, invalid_samples, error_message, summaries')
    .order('started_at', { ascending: false })
    .limit(5);

  if (runsError) {
    throw new Error(`동기화 기록 조회 실패: ${runsError.message}`);
  }

  const { data: gaps, error: gapsError } = await supabase.rpc('get_game_result_sync_gaps', {
    limit_count: 10,
  });

  if (gapsError) {
    throw new Error(`누락 경기 조회 실패: ${gapsError.message}`);
  }

  console.log('최근 KBO 동기화 기록');
  console.table(
    (runs ?? []).map((run) => ({
      id: run.id,
      status: run.status,
      mode: run.mode,
      startedAt: formatKst(run.started_at),
      finishedAt: formatKst(run.finished_at),
      processed: run.total_processed,
      saved: run.total_saved,
      invalid: run.total_invalid,
      error: run.error_message ?? '',
    }))
  );

  if (!runs || runs.length === 0) {
    console.warn('아직 저장된 동기화 기록이 없습니다.');
  }

  if (gaps && gaps.length > 0) {
    console.warn('결과 누락 의심 경기');
    console.table(gaps);
  } else {
    console.log('결과 누락 의심 경기는 없습니다.');
  }

  const latestRun = runs?.[0];
  const latestInvalidSamples = Array.isArray(latestRun?.invalid_samples)
    ? latestRun.invalid_samples
    : [];

  if (latestInvalidSamples.length > 0) {
    console.warn('최근 동기화에서 제외된 이상 데이터 샘플');
    console.table(latestInvalidSamples);
  }

  if (latestRun?.status === 'failed') {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
