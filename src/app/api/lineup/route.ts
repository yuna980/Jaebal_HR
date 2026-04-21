import { NextResponse } from 'next/server';
import { APP_TO_KBO_TEAM_ID, fetchKboLineup } from '@/lib/kboScraper';
import { checkRateLimit, isValidTeamId, normalizeLineupDate } from '@/lib/apiSecurity';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const rateLimit = checkRateLimit(request, 'lineup');
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { success: false, message: '요청이 너무 많아요. 잠시 후 다시 시도해주세요.' },
      { status: 429 }
    );
  }

  const { searchParams } = new URL(request.url);
  const teamId = searchParams.get('teamId') || '';
  const dateParam = searchParams.get('date') || '';
  const normalizedDate = normalizeLineupDate(dateParam);

  if (!isValidTeamId(teamId, Object.keys(APP_TO_KBO_TEAM_ID))) {
    return NextResponse.json(
      { success: false, message: '잘못된 팀 정보입니다.', startingPitcher: null, battingOrder: [], isLineupOut: false },
      { status: 400 }
    );
  }

  if (!normalizedDate) {
    return NextResponse.json(
      { success: false, message: '잘못된 날짜 형식입니다.', startingPitcher: null, battingOrder: [], isLineupOut: false },
      { status: 400 }
    );
  }

  try {
    const lineup = await fetchKboLineup(teamId, normalizedDate);

    return NextResponse.json({
      date: normalizedDate,
      teamId,
      ...lineup,
    });
  } catch {
    return NextResponse.json({ success: false, startingPitcher: null, battingOrder: [], isLineupOut: false });
  }
}
