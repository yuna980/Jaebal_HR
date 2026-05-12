import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

async function getAuthenticatedSupabaseClient() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { supabase, user: null };
  }

  return { supabase, user };
}

export async function PATCH(request: Request) {
  const { supabase, user } = await getAuthenticatedSupabaseClient();

  if (!user) {
    return NextResponse.json({ success: false, message: '로그인이 필요합니다.' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    gameReminderEnabled?: unknown;
    attendanceTipEnabled?: unknown;
  } | null;

  const nextPreference = {
    user_id: user.id,
    game_reminder_enabled:
      typeof body?.gameReminderEnabled === 'boolean' ? body.gameReminderEnabled : true,
    attendance_tip_enabled:
      typeof body?.attendanceTipEnabled === 'boolean' ? body.attendanceTipEnabled : true,
  };

  const { error } = await supabase.from('notification_preferences').upsert(nextPreference, {
    onConflict: 'user_id',
  });

  if (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
