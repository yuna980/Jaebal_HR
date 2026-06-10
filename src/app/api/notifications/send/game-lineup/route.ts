import { NextResponse } from 'next/server';
import { logServerError } from '@/lib/errorLogs';
import { isCronAuthorized } from '@/lib/notifications/cronAuth';
import { sendScheduledNotifications } from '@/lib/notifications/scheduler';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ success: false, message: '권한이 없습니다.' }, { status: 401 });
  }

  try {
    const summary = await sendScheduledNotifications('game_lineup_reminder');
    return NextResponse.json({ success: true, summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : '알림 발송 실패';
    await logServerError({
      route: '/api/notifications/send/game-lineup',
      request,
      statusCode: 500,
      error,
      metadata: { type: 'game_lineup_reminder' },
    });
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
