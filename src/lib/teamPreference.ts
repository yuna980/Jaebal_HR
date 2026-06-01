'use client';

import { ensureAuthenticatedUserLocalDataOwner, getCurrentUserId } from '@/lib/supabase/auth';
import { getSupabaseBrowserClient, isSupabaseConfigured } from '@/lib/supabase/client';

const TEAM_STORAGE_KEY = 'myTeamId';
const TEAM_CHANGE_EVENT = 'my-team-change';
const TEAM_SAVE_TIMEOUT_MS = 8000;

type SupabaseWriteResult = {
  error: { message: string } | null;
};

let teamSyncPromise: Promise<void> | null = null;

function emitTeamChange() {
  window.dispatchEvent(new Event(TEAM_CHANGE_EVENT));
}

function readLocalTeamId() {
  try {
    return localStorage.getItem(TEAM_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeLocalTeamId(teamId: string) {
  try {
    localStorage.setItem(TEAM_STORAGE_KEY, teamId);
    emitTeamChange();
  } catch {
    emitTeamChange();
  }
}

function withTimeout<T>(promise: PromiseLike<T>, timeoutMs: number, message: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs);
  });

  return Promise.race([Promise.resolve(promise), timeout]).finally(() => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  });
}

export async function saveSelectedTeamToSupabase(teamId: string, knownUserId?: string | null) {
  if (!isSupabaseConfigured()) return;

  const userId =
    knownUserId ??
    (await withTimeout(
      getCurrentUserId(),
      TEAM_SAVE_TIMEOUT_MS,
      '로그인 정보를 확인하는 시간이 초과되었습니다.'
    ));
  const supabase = getSupabaseBrowserClient();

  if (!userId || !supabase) {
    throw new Error('로그인 정보를 확인하지 못했습니다.');
  }

  const saveRequest: PromiseLike<SupabaseWriteResult> = supabase.from('profiles').upsert(
    {
      id: userId,
      favorite_team_id: teamId,
    },
    {
      onConflict: 'id',
    }
  );

  const { error } = await withTimeout(
    saveRequest,
    TEAM_SAVE_TIMEOUT_MS,
    '응원팀 저장 요청 시간이 초과되었습니다.'
  );

  if (error) {
    throw new Error(error.message);
  }
}

export async function syncSelectedTeamFromSupabase() {
  if (!isSupabaseConfigured()) return;

  if (teamSyncPromise) {
    return teamSyncPromise;
  }

  teamSyncPromise = (async () => {
    const userId = await getCurrentUserId();
    const supabase = getSupabaseBrowserClient();

    if (!userId || !supabase) return;

    ensureAuthenticatedUserLocalDataOwner(userId);

    const localTeamId = readLocalTeamId();

    const { data, error } = await supabase
      .from('profiles')
      .select('favorite_team_id')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.warn('응원팀 Supabase 조회 실패. 로컬 저장으로 계속 진행합니다.', error.message);
      return;
    }

    const remoteTeamId = data?.favorite_team_id ?? null;

    if (localTeamId) {
      if (localTeamId !== remoteTeamId) {
        try {
          await saveSelectedTeamToSupabase(localTeamId);
        } catch (error) {
          console.warn('응원팀 Supabase 저장 실패. 로컬 저장은 유지됩니다.', error);
        }
      }
      return;
    }

    if (remoteTeamId) {
      writeLocalTeamId(remoteTeamId);
    }
  })().finally(() => {
    teamSyncPromise = null;
  });

  await teamSyncPromise;
}
