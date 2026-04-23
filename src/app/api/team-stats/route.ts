import { NextResponse } from 'next/server';
import { KBO_TEAMS } from '@/data/teams';
import { checkRateLimit, isValidTeamId } from '@/lib/apiSecurity';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { buildStandings, formatWinRate, getRank, type GameHistoryForStats } from '@/lib/teamStats';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const rateLimit = checkRateLimit(request, 'team-stats');
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { success: false, message: '요청이 너무 많아요. 잠시 후 다시 시도해주세요.' },
      { status: 429 }
    );
  }

  const { searchParams } = new URL(request.url);
  const teamId = searchParams.get('teamId') ?? '';
  const seasonYear = Number(searchParams.get('seasonYear') ?? new Date().getFullYear());
  const teamIds = KBO_TEAMS.map((team) => team.id);

  if (!isValidTeamId(teamId, teamIds) || !Number.isInteger(seasonYear)) {
    return NextResponse.json(
      { success: false, message: '잘못된 팀 정보입니다.' },
      { status: 400 }
    );
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json(
      { success: false, message: 'DB 연결 정보가 없습니다.' },
      { status: 500 }
    );
  }

  const today = new Date();
  const previousSeasonYear = seasonYear - 1;
  const compareDate = `${previousSeasonYear}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const [{ data: currentRows, error: currentError }, { data: previousRows, error: previousError }] =
    await Promise.all([
      supabase
        .from('game_histories')
        .select('home_team_id, away_team_id, home_score, away_score')
        .eq('season_year', seasonYear)
        .eq('status', 'finished'),
      supabase
        .from('game_histories')
        .select('home_team_id, away_team_id, home_score, away_score')
        .eq('season_year', previousSeasonYear)
        .eq('status', 'finished')
        .lte('game_date', compareDate),
    ]);

  if (currentError || previousError) {
    console.error('팀 성적 조회 실패:', currentError ?? previousError);
    return NextResponse.json(
      { success: false, message: '팀 성적을 가져오지 못했습니다.' },
      { status: 500 }
    );
  }

  const currentStandings = buildStandings((currentRows ?? []) as GameHistoryForStats[], teamIds);
  const previousStandings = buildStandings((previousRows ?? []) as GameHistoryForStats[], teamIds);
  const current = currentStandings.find((standing) => standing.teamId === teamId);
  const previous = previousStandings.find((standing) => standing.teamId === teamId);

  if (!current) {
    return NextResponse.json(
      { success: false, message: '팀 성적 데이터가 없습니다.' },
      { status: 404 }
    );
  }

  const rank = getRank(currentStandings, teamId);
  const previousRank = previous ? getRank(previousStandings, teamId) : null;
  const delta = previous ? current.winRate - previous.winRate : 0;

  return NextResponse.json({
    success: true,
    stats: {
      seasonYear,
      currentWinRate: formatWinRate(current.winRate),
      previousWinRate: previous ? formatWinRate(previous.winRate) : '-',
      winRateDelta: delta,
      winRateDeltaLabel: `${delta >= 0 ? '▲' : '▼'} ${Math.abs(delta).toFixed(3)}`,
      rank,
      previousRank,
      total: current.total,
      win: current.win,
      loss: current.loss,
      draw: current.draw,
      isPostseasonZone: rank > 0 && rank <= 5,
    },
  });
}
