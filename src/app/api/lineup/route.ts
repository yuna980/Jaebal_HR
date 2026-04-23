import { NextResponse } from 'next/server';
import { APP_TO_KBO_TEAM_ID } from '@/lib/kboScraper';
import { checkRateLimit, isValidTeamId, normalizeLineupDate } from '@/lib/apiSecurity';
import { KBO_TEAMS } from '@/data/teams';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const TEAM_BY_ID = Object.fromEntries(KBO_TEAMS.map((team) => [team.id, team.name]));

function emptyLineup(date: string, teamId: string) {
  return {
    date,
    teamId,
    startingPitcher: null,
    opponentStartingPitcher: null,
    battingOrder: [],
    opponentBattingOrder: [],
    opponentTeamName: null,
    isLineupOut: false,
  };
}

function toDbDate(normalizedDate: string) {
  if (normalizedDate.length !== 8) return '';
  return `${normalizedDate.slice(0, 4)}-${normalizedDate.slice(4, 6)}-${normalizedDate.slice(6, 8)}`;
}

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
  const normalizedDate = normalizeLineupDate(dateParam) ?? '';

  if (!isValidTeamId(teamId, Object.keys(APP_TO_KBO_TEAM_ID))) {
    return NextResponse.json(
      { success: false, message: '잘못된 팀 정보입니다.', ...emptyLineup(normalizedDate, teamId) },
      { status: 400 }
    );
  }

  if (!normalizedDate) {
    return NextResponse.json(
      { success: false, message: '잘못된 날짜 형식입니다.', ...emptyLineup(normalizedDate, teamId) },
      { status: 400 }
    );
  }

  try {
    const supabase = getSupabaseServerClient();
    const gameDate = toDbDate(normalizedDate);

    if (!supabase || !gameDate) {
      return NextResponse.json(emptyLineup(normalizedDate, teamId));
    }

    const { data, error } = await supabase
      .from('game_lineups')
      .select(
        'home_team_id, away_team_id, home_starting_pitcher, away_starting_pitcher, home_batting_order, away_batting_order, is_lineup_out'
      )
      .eq('game_date', gameDate)
      .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
      .maybeSingle();

    if (error || !data) {
      if (error) console.error('라인업 DB 조회 실패:', error);
      return NextResponse.json(emptyLineup(normalizedDate, teamId));
    }

    const isHome = data.home_team_id === teamId;
    const opponentTeamId = isHome ? data.away_team_id : data.home_team_id;

    return NextResponse.json({
      date: normalizedDate,
      teamId,
      startingPitcher: isHome ? data.home_starting_pitcher : data.away_starting_pitcher,
      opponentStartingPitcher: isHome ? data.away_starting_pitcher : data.home_starting_pitcher,
      battingOrder: isHome ? data.home_batting_order : data.away_batting_order,
      opponentBattingOrder: isHome ? data.away_batting_order : data.home_batting_order,
      opponentTeamName: TEAM_BY_ID[opponentTeamId] ?? null,
      isLineupOut: Boolean(data.is_lineup_out),
    });
  } catch (error) {
    console.error('라인업 API 에러:', error);
    return NextResponse.json(emptyLineup(normalizedDate, teamId));
  }
}
