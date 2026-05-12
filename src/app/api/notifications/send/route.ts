import { NextResponse } from 'next/server';
import { sendScheduledNotifications } from '@/lib/notifications/scheduler';
import { isCronAuthorized } from '@/lib/notifications/cronAuth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ success: false, message: '권한이 없습니다.' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');

  if (type !== 'game_lineup_reminder' && type !== 'attendance_tip') {
    return NextResponse.json({ success: false, message: '알림 타입이 올바르지 않습니다.' }, { status: 400 });
  }

  try {
    const summary = await sendScheduledNotifications(type);
    return NextResponse.json({ success: true, summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : '알림 발송 실패';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
