'use client';

import { getSupabaseBrowserClient, isSupabaseConfigured } from '@/lib/supabase/client';

let currentUserPromise: Promise<string | null> | null = null;

const AUTH_USER_STORAGE_KEY = 'auth-user-id';
const PERSONAL_STORAGE_KEYS = ['myTeamId', 'fan-diary-records', 'attendance-records'];
const PERSONAL_CHANGE_EVENTS = ['my-team-change', 'fan-diary-change', 'attendance-change'];

interface RememberAuthenticatedUserOptions {
  resetPersonalData?: boolean;
}

export async function getCurrentUserId() {
  if (!isSupabaseConfigured()) {
    return null;
  }

  if (currentUserPromise) {
    return currentUserPromise;
  }

  currentUserPromise = (async () => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return null;

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      return null;
    }

    return user?.id ?? null;
  })();

  const result = await currentUserPromise;
  currentUserPromise = null;

  return result;
}

export function rememberAuthenticatedUser(userId: string, options: RememberAuthenticatedUserOptions = {}) {
  try {
    const previousUserId = localStorage.getItem(AUTH_USER_STORAGE_KEY);

    if (options.resetPersonalData || previousUserId !== userId) {
      clearPersonalLocalData();
    }

    localStorage.setItem(AUTH_USER_STORAGE_KEY, userId);
  } catch {
    return;
  }
}

export function ensureAuthenticatedUserLocalDataOwner(userId: string) {
  rememberAuthenticatedUser(userId);
}

export function clearAuthenticatedUserData() {
  try {
    clearPersonalLocalData();
    localStorage.removeItem(AUTH_USER_STORAGE_KEY);
  } catch {
    return;
  }
}

function clearPersonalLocalData() {
  PERSONAL_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
  PERSONAL_CHANGE_EVENTS.forEach((eventName) => window.dispatchEvent(new Event(eventName)));
}
