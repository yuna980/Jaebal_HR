import { NextResponse } from 'next/server';
import { KBO_TEAMS } from '@/data/teams';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/apiSecurity';

export const dynamic = 'force-dynamic';

const TEAM_BY_ID = Object.fromEntries(KBO_TEAMS.map((team) => [team.id, team.name]));

function getKstToday() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function toDashboardDate(gameDate: string) {
  const [, , month, day] = gameDate.match(/^(\d{4})-(\d{2})-(\d{2})$/) ?? [];
  return month && day ? `${month}.${day}` : gameDate;
}

export async function GET(request: Request) {
  const rateLimit = checkRateLimit(request, 'game-schedules-today');
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { success: false, schedule: null, message: '요청이 너무 많아요. 잠시 후 다시 시도해주세요.' },
      { status: 429 }
    );
  }

  const { searchParams } = new URL(request.url);
  const teamId = searchParams.get('teamId');
  const date = searchParams.get('date') ?? getKstToday();

  if (!teamId) {
    return NextResponse.json(
      { success: false, schedule: null, message: '팀 정보가 필요합니다.' },
      { status: 400 }
    );
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json(
      { success: false, schedule: null, message: 'DB 연결 정보가 없습니다.' },
      { status: 500 }
    );
  }

  const { data, error } = await supabase
    .from('game_schedules')
    .select('season_year, game_date, game_time, home_team_id, away_team_id, stadium, note')
    .eq('game_date', date)
    .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
    .maybeSingle();

  if (error) {
    console.error('오늘 경기 일정 조회 실패:', error);
    return NextResponse.json(
      { success: false, schedule: null, message: '오늘 경기 일정을 가져오지 못했습니다.' },
      { status: 500 }
    );
  }

  if (!data) {
    return NextResponse.json({ success: true, schedule: null });
  }

  const awayTeam = TEAM_BY_ID[data.away_team_id] ?? data.away_team_id;
  const homeTeam = TEAM_BY_ID[data.home_team_id] ?? data.home_team_id;
  const gameDate = String(data.game_date);

  return NextResponse.json({
    success: true,
    schedule: {
      day: toDashboardDate(gameDate),
      date: toDashboardDate(gameDate),
      dayOfWeek: '',
      time: data.game_time,
      matchRaw: `${awayTeam} vs ${homeTeam}`,
      awayTeam,
      homeTeam,
      awayScore: null,
      homeScore: null,
      stadium: data.stadium,
      status: data.note.includes('취소') ? 'cancelled' : 'scheduled',
      note: data.note || null,
    },
  });
}
