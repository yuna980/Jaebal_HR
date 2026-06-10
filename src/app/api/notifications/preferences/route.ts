import { NextResponse } from 'next/server';
import { requireAuthenticatedApiUser } from '@/lib/apiAuth';
import { logServerError } from '@/lib/errorLogs';

export const dynamic = 'force-dynamic';

export async function PATCH(request: Request) {
  const { supabase, user } = await requireAuthenticatedApiUser();

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
    await logServerError({
      route: '/api/notifications/preferences',
      request,
      statusCode: 500,
      error,
      userId: user.id,
      metadata: { step: 'preference_upsert' },
    });
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
