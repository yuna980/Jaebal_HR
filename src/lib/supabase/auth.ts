'use client';

import { getSupabaseBrowserClient, isSupabaseConfigured } from '@/lib/supabase/client';

let authBootstrapPromise: Promise<string | null> | null = null;

export async function ensureAnonymousSession() {
  if (!isSupabaseConfigured()) {
    return null;
  }

  if (authBootstrapPromise) {
    return authBootstrapPromise;
  }

  authBootstrapPromise = (async () => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return null;

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (user && !userError) {
      return user.id;
    }

    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) {
      console.warn('Supabase 익명 로그인 실패. 로컬 저장으로 계속 진행합니다.', error.message);
      return null;
    }

    return data.user?.id ?? null;
  })();

  const result = await authBootstrapPromise;

  if (!result) {
    authBootstrapPromise = null;
  }

  return result;
}
