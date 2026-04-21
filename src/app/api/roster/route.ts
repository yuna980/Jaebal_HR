import { NextResponse } from 'next/server';
import { APP_TO_KBO_TEAM_ID, fetchKboRoster } from '@/lib/kboScraper';
import { checkRateLimit, isValidIsoDate, isValidTeamId } from '@/lib/apiSecurity';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const rateLimit = checkRateLimit(request, 'roster');
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { success: false, message: '요청이 너무 많아요. 잠시 후 다시 시도해주세요.' },
      { status: 429 }
    );
  }

  const { searchParams } = new URL(request.url);
  const teamId = searchParams.get('teamId') || '';
  const dateParam = searchParams.get('date');

  if (!isValidTeamId(teamId, Object.keys(APP_TO_KBO_TEAM_ID))) {
    return NextResponse.json({ success: false, message: '잘못된 팀 정보입니다.' }, { status: 400 });
  }

  if (dateParam && !isValidIsoDate(dateParam)) {
    return NextResponse.json({ success: false, message: '잘못된 날짜 형식입니다.' }, { status: 400 });
  }

  const targetDate = dateParam ? new Date(dateParam) : new Date();
  const roster = await fetchKboRoster(teamId, Number.isNaN(targetDate.getTime()) ? new Date() : targetDate);

  return NextResponse.json(roster);
}
