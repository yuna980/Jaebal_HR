'use client';

import { ensureAnonymousSession } from '@/lib/supabase/auth';
import { getSupabaseBrowserClient, isSupabaseConfigured } from '@/lib/supabase/client';

const TEAM_STORAGE_KEY = 'myTeamId';
const TEAM_CHANGE_EVENT = 'my-team-change';

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

export async function saveSelectedTeamToSupabase(teamId: string) {
  if (!isSupabaseConfigured()) return;

  const userId = await ensureAnonymousSession();
  const supabase = getSupabaseBrowserClient();

  if (!userId || !supabase) return;

  const { error } = await supabase.from('profiles').upsert(
    {
      id: userId,
      favorite_team_id: teamId,
    },
    {
      onConflict: 'id',
    }
  );

  if (error) {
    console.warn('응원팀 Supabase 저장 실패. 로컬 저장은 유지됩니다.', error.message);
  }
}

export async function syncSelectedTeamFromSupabase() {
  if (!isSupabaseConfigured()) return;

  if (teamSyncPromise) {
    return teamSyncPromise;
  }

  teamSyncPromise = (async () => {
    const localTeamId = readLocalTeamId();
    const userId = await ensureAnonymousSession();
    const supabase = getSupabaseBrowserClient();

    if (!userId || !supabase) return;

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
        await saveSelectedTeamToSupabase(localTeamId);
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
