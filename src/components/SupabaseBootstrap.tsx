'use client';

import { useEffect } from 'react';
import { ensureAnonymousSession } from '@/lib/supabase/auth';

export default function SupabaseBootstrap() {
  useEffect(() => {
    void ensureAnonymousSession();
  }, []);

  return null;
}
