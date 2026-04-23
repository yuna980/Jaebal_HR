import { NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/apiSecurity';
import { buildHeadToHeadRecord, fetchHeadToHeadRecordFromKbo } from '@/lib/gameRecords';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const rateLimit = checkRateLimit(request, 'game-histories-head-to-head');
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { success: false, record: null, message: '요청이 너무 많아요. 잠시 후 다시 시도해주세요.' },
      { status: 429 }
    );
  }

  const { searchParams } = new URL(request.url);
  const teamId = searchParams.get('teamId');
  const opponentTeamId = searchParams.get('opponentTeamId');
  const seasonYearParam = Number(searchParams.get('seasonYear'));

  if (!teamId || !opponentTeamId || !Number.isInteger(seasonYearParam)) {
    return NextResponse.json(
      { success: false, record: null, message: '잘못된 조회 조건입니다.' },
      { status: 400 }
    );
  }

  const supabase = getSupabaseServerClient();

  try {
    if (supabase) {
      const { data, error } = await supabase
        .from('game_histories')
        .select('home_team_id, away_team_id, home_score, away_score')
        .eq('season_year', seasonYearParam)
        .eq('status', 'finished')
        .or(
          `and(home_team_id.eq.${teamId},away_team_id.eq.${opponentTeamId}),and(home_team_id.eq.${opponentTeamId},away_team_id.eq.${teamId})`
        );

      if (!error && data && data.length > 0) {
        const record = buildHeadToHeadRecord(
          data.map((row) => ({
            homeTeamId: row.home_team_id,
            awayTeamId: row.away_team_id,
            homeScore: row.home_score,
            awayScore: row.away_score,
          })),
          teamId,
          opponentTeamId
        );

        return NextResponse.json({
          success: true,
          record,
          source: 'db',
        });
      }
    }

    const fallbackRecord = await fetchHeadToHeadRecordFromKbo(teamId, opponentTeamId, seasonYearParam);

    return NextResponse.json({
      success: true,
      record: fallbackRecord.total > 0 ? fallbackRecord : null,
      source: 'crawl',
    });
  } catch (error) {
    console.error('상대 전적 조회 API 에러:', error);
    return NextResponse.json(
      { success: false, record: null, message: '상대 전적을 가져오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
