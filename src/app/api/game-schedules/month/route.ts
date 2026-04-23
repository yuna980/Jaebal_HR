import { NextResponse } from 'next/server';
import { KBO_TEAMS } from '@/data/teams';
import { checkRateLimit } from '@/lib/apiSecurity';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const TEAM_BY_ID = Object.fromEntries(KBO_TEAMS.map((team) => [team.id, team.name]));

const DAYS = ['일', '월', '화', '수', '목', '금', '토'];

type ScheduleRow = {
  season_year: number;
  game_date: string;
  game_time: string;
  home_team_id: string;
  away_team_id: string;
  stadium: string;
  note: string;
};

type HistoryRow = {
  season_year: number;
  game_date: string;
  home_team_id: string;
  away_team_id: string;
  stadium: string;
  home_score: number | null;
  away_score: number | null;
  status: 'scheduled' | 'finished' | 'cancelled';
  note: string;
  winning_pitcher_name: string | null;
  losing_pitcher_name: string | null;
};

function buildMonthRange(year: number, month: number) {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const nextMonthDate = new Date(Date.UTC(year, month, 1));
  const endDate = `${nextMonthDate.getUTCFullYear()}-${String(nextMonthDate.getUTCMonth() + 1).padStart(2, '0')}-01`;

  return { startDate, endDate };
}

function toDateText(gameDate: string) {
  const [, , month, day] = gameDate.match(/^(\d{4})-(\d{2})-(\d{2})$/) ?? [];
  return month && day ? `${month}.${day}` : gameDate;
}

function toDayOfWeek(gameDate: string) {
  const date = new Date(`${gameDate}T00:00:00+09:00`);
  return DAYS[date.getDay()] ?? '';
}

function getGameKey(row: Pick<ScheduleRow, 'game_date' | 'home_team_id' | 'away_team_id'>) {
  return `${row.game_date}-${row.away_team_id}-${row.home_team_id}`;
}

export async function GET(request: Request) {
  const rateLimit = checkRateLimit(request, 'game-schedules-month');
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { success: false, schedules: [], message: '요청이 너무 많아요. 잠시 후 다시 시도해주세요.' },
      { status: 429 }
    );
  }

  const { searchParams } = new URL(request.url);
  const year = Number(searchParams.get('year'));
  const month = Number(searchParams.get('month'));

  if (!Number.isInteger(year) || year < 2000 || year > 2100 || !Number.isInteger(month) || month < 1 || month > 12) {
    return NextResponse.json(
      { success: false, schedules: [], message: '잘못된 조회 기간입니다.' },
      { status: 400 }
    );
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json(
      { success: false, schedules: [], message: 'DB 연결 정보가 없습니다.' },
      { status: 500 }
    );
  }

  const { startDate, endDate } = buildMonthRange(year, month);

  const [{ data: scheduleRows, error: scheduleError }, { data: historyRows, error: historyError }] =
    await Promise.all([
      supabase
        .from('game_schedules')
        .select('season_year, game_date, game_time, home_team_id, away_team_id, stadium, note')
        .gte('game_date', startDate)
        .lt('game_date', endDate)
        .order('game_date', { ascending: true })
        .order('game_time', { ascending: true }),
      supabase
        .from('game_histories')
        .select(
          'season_year, game_date, home_team_id, away_team_id, stadium, home_score, away_score, status, note, winning_pitcher_name, losing_pitcher_name'
        )
        .gte('game_date', startDate)
        .lt('game_date', endDate),
    ]);

  if (scheduleError || historyError) {
    console.error('월간 대진표 DB 조회 실패:', scheduleError ?? historyError);
    return NextResponse.json(
      { success: false, schedules: [], message: '월간 대진표를 가져오지 못했습니다.' },
      { status: 500 }
    );
  }

  const historyMap = new Map(
    ((historyRows ?? []) as HistoryRow[]).map((row) => [getGameKey(row), row])
  );

  const schedules = ((scheduleRows ?? []) as ScheduleRow[]).map((schedule) => {
    const history = historyMap.get(getGameKey(schedule));
    const awayTeam = TEAM_BY_ID[schedule.away_team_id] ?? schedule.away_team_id;
    const homeTeam = TEAM_BY_ID[schedule.home_team_id] ?? schedule.home_team_id;
    const date = toDateText(schedule.game_date);
    const note = history?.note && history.note !== '-' ? history.note : schedule.note;
    const status = note?.includes('취소') ? 'cancelled' : history?.status ?? 'scheduled';

    return {
      day: `${date}(${toDayOfWeek(schedule.game_date)})`,
      date,
      dayOfWeek: toDayOfWeek(schedule.game_date),
      time: schedule.game_time,
      matchRaw: `${awayTeam} vs ${homeTeam}`,
      awayTeam,
      homeTeam,
      awayScore: history?.away_score ?? null,
      homeScore: history?.home_score ?? null,
      stadium: schedule.stadium || history?.stadium || '',
      status,
      note: note || null,
      winningPitcherName: history?.winning_pitcher_name ?? null,
      losingPitcherName: history?.losing_pitcher_name ?? null,
      savePitcherName: null,
    };
  });

  return NextResponse.json({
    success: true,
    schedules,
    source: 'db',
  });
}
