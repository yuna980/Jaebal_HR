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

function isPastDate(date: string) {
  return date < getKstToday();
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

  const { data: history, error: historyError } = await supabase
    .from('game_histories')
    .select('home_score, away_score, status, note, winning_pitcher_name, losing_pitcher_name')
    .eq('season_year', data.season_year)
    .eq('game_date', data.game_date)
    .eq('home_team_id', data.home_team_id)
    .eq('away_team_id', data.away_team_id)
    .maybeSingle();

  if (historyError) {
    console.error('오늘 경기 결과 조회 실패:', historyError);
    return NextResponse.json(
      { success: false, schedule: null, message: '오늘 경기 결과를 가져오지 못했습니다.' },
      { status: 500 }
    );
  }

  const awayTeam = TEAM_BY_ID[data.away_team_id] ?? data.away_team_id;
  const homeTeam = TEAM_BY_ID[data.home_team_id] ?? data.home_team_id;
  const gameDate = String(data.game_date);
  const note = history?.note && history.note !== '-' ? history.note : data.note;
  const status = note.includes('취소') ? 'cancelled' : history?.status ?? (isPastDate(gameDate) ? 'pending_result' : 'scheduled');

  return NextResponse.json({
    success: true,
    missingResult:
      status === 'pending_result'
        ? {
            gameDate,
            awayTeam,
            homeTeam,
            stadium: data.stadium,
            reason: 'past_schedule_without_history',
          }
        : null,
    schedule: {
      day: toDashboardDate(gameDate),
      date: toDashboardDate(gameDate),
      dayOfWeek: '',
      time: data.game_time,
      matchRaw: `${awayTeam} vs ${homeTeam}`,
      awayTeam,
      homeTeam,
      awayScore: history?.away_score ?? null,
      homeScore: history?.home_score ?? null,
      stadium: data.stadium,
      status,
      note: note || null,
      winningPitcherName: history?.winning_pitcher_name ?? null,
      losingPitcherName: history?.losing_pitcher_name ?? null,
      savePitcherName: null,
    },
  });
}
