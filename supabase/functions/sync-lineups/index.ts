import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

type SyncMode = "pitchers" | "lineups" | "due";

interface SyncRequest {
  mode?: SyncMode;
  date?: string;
  dryRun?: boolean;
}

interface GameScheduleRow {
  id: number;
  season_year: number;
  game_date: string;
  game_time: string;
  home_team_id: string;
  away_team_id: string;
}

interface ExistingLineupRow {
  is_lineup_out: boolean;
  home_starting_pitcher: unknown | null;
  away_starting_pitcher: unknown | null;
}

interface KboGameListItem {
  G_ID?: string;
  AWAY_ID?: string;
  HOME_ID?: string;
  T_PIT_P_ID?: number | string | null;
  B_PIT_P_ID?: number | string | null;
  T_PIT_P_NM?: string;
  B_PIT_P_NM?: string;
}

interface KboGameListResponse {
  game?: KboGameListItem[];
}

interface KboLineUpFlagItem {
  LINEUP_CK?: boolean;
}

interface KboTableCell {
  Text?: string;
}

interface KboTableRow {
  row?: KboTableCell[];
}

interface KboTableData {
  rows?: KboTableRow[];
}

type KboLineUpAnalysisResponse = [
  KboLineUpFlagItem[]?,
  unknown[]?,
  unknown[]?,
  string[]?,
  string[]?
];

interface KboPitcherAnalysisResponse {
  rows?: KboTableRow[];
}

const APP_TO_KBO_TEAM_ID: Record<string, string> = {
  doosan: "OB",
  ssg: "SK",
  samsung: "SS",
  hanwha: "HH",
  lg: "LG",
  kiwoom: "WO",
  kia: "HT",
  lotte: "LT",
  nc: "NC",
  kt: "KT",
};

const corsHeaders = {
  "Content-Type": "application/json",
};

function json(status: number, payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: corsHeaders,
  });
}

function stripHtml(value: string | undefined) {
  return (value ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function parsePitcherName(cellText: string | undefined) {
  const nameMatch = stripHtml(cellText).match(/^(.*?)\s+(좌투|우투|좌타|우타|시즌)/);
  if (nameMatch?.[1]) return nameMatch[1].trim();
  return stripHtml(cellText).split("시즌")[0]?.trim() ?? "";
}

function parsePitcherRecord(row: KboTableRow | undefined) {
  const cells = row?.row ?? [];
  if (cells.length < 7) return null;

  const name = parsePitcherName(cells[0]?.Text);
  if (!name) return null;

  const winLossMatch = stripHtml(cells[0]?.Text).match(/시즌\s+(.+)$/);

  return {
    name,
    winLoss: winLossMatch?.[1]?.trim() ?? "-",
    era: stripHtml(cells[1]?.Text) || "-",
    war: stripHtml(cells[2]?.Text) || "-",
    games: stripHtml(cells[3]?.Text) || "-",
    startInnings: stripHtml(cells[4]?.Text) || "-",
    qs: stripHtml(cells[5]?.Text) || "-",
    whip: stripHtml(cells[6]?.Text) || "-",
  };
}

function parseTableRows(tableJson: string | undefined) {
  if (!tableJson) return [];

  try {
    const parsed = JSON.parse(tableJson) as KboTableData;
    return (parsed.rows ?? [])
      .map((row) => {
        const cells = row.row ?? [];
        const order = Number(cells[0]?.Text ?? "");
        const position = stripHtml(cells[1]?.Text);
        const name = stripHtml(cells[2]?.Text);
        const war = stripHtml(cells[3]?.Text);

        if (!Number.isFinite(order) || !position || !name) return null;
        return { order, position, name, war };
      })
      .filter((item) => item !== null);
  } catch {
    return [];
  }
}

function toKboDate(gameDate: string) {
  return gameDate.replaceAll("-", "");
}

function getKstToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function getMinutesUntilKst(gameDate: string, gameTime: string) {
  if (!gameTime) return Number.POSITIVE_INFINITY;
  const gameStart = new Date(`${gameDate}T${gameTime}:00+09:00`).getTime();
  return Math.round((gameStart - Date.now()) / 60000);
}

function shouldTryLineup(game: GameScheduleRow) {
  const minutesUntil = getMinutesUntilKst(game.game_date, game.game_time);
  return [60, 50, 40].some((target) => Math.abs(minutesUntil - target) <= 4);
}

async function postForm<T>(url: string, body: URLSearchParams) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Referer: "https://www.koreabaseball.com/Schedule/Schedule.aspx",
    },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new Error(`KBO 요청 실패: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as T;
}

async function fetchLineup(game: GameScheduleRow) {
  const awayKboTeamId = APP_TO_KBO_TEAM_ID[game.away_team_id];
  const homeKboTeamId = APP_TO_KBO_TEAM_ID[game.home_team_id];
  if (!awayKboTeamId || !homeKboTeamId) return null;

  const gameListForm = new URLSearchParams();
  gameListForm.append("leId", "1");
  gameListForm.append("srId", "0");
  gameListForm.append("date", toKboDate(game.game_date));

  const gameListResponse = await postForm<KboGameListResponse>(
    "https://www.koreabaseball.com/ws/Main.asmx/GetKboGameList",
    gameListForm,
  );

  const kboGame = (gameListResponse.game ?? []).find(
    (item) => item.AWAY_ID === awayKboTeamId && item.HOME_ID === homeKboTeamId,
  );

  if (!kboGame?.G_ID) return null;

  const lineUpForm = new URLSearchParams();
  lineUpForm.append("leId", "1");
  lineUpForm.append("srId", "0");
  lineUpForm.append("seasonId", String(game.season_year));
  lineUpForm.append("gameId", kboGame.G_ID);

  const lineUpResponse = await postForm<KboLineUpAnalysisResponse>(
    "https://www.koreabaseball.com/ws/Schedule.asmx/GetLineUpAnalysis",
    lineUpForm,
  );

  const isLineupOut = Boolean(lineUpResponse[0]?.[0]?.LINEUP_CK);
  const homeBattingOrder = parseTableRows(lineUpResponse[3]?.[0]);
  const awayBattingOrder = parseTableRows(lineUpResponse[4]?.[0]);

  const pitcherRecordForm = new URLSearchParams();
  pitcherRecordForm.append("leId", "1");
  pitcherRecordForm.append("srId", "0");
  pitcherRecordForm.append("seasonId", String(game.season_year));
  pitcherRecordForm.append("awayTeamId", kboGame.AWAY_ID ?? "");
  pitcherRecordForm.append("awayPitId", String(kboGame.T_PIT_P_ID ?? ""));
  pitcherRecordForm.append("homeTeamId", kboGame.HOME_ID ?? "");
  pitcherRecordForm.append("homePitId", String(kboGame.B_PIT_P_ID ?? ""));
  pitcherRecordForm.append("groupSc", "SEASON");

  const pitcherRecordResponse = await postForm<KboPitcherAnalysisResponse>(
    "https://www.koreabaseball.com/ws/Schedule.asmx/GetPitcherRecordAnalysis",
    pitcherRecordForm,
  );

  const pitcherRows = pitcherRecordResponse.rows ?? [];
  const awayPitcherRecord = parsePitcherRecord(pitcherRows[0]);
  const homePitcherRecord = parsePitcherRecord(pitcherRows[1]);

  return {
    homeStartingPitcher:
      homePitcherRecord ??
      (kboGame.B_PIT_P_NM
        ? { name: kboGame.B_PIT_P_NM.trim(), winLoss: "-", era: "-" }
        : null),
    awayStartingPitcher:
      awayPitcherRecord ??
      (kboGame.T_PIT_P_NM
        ? { name: kboGame.T_PIT_P_NM.trim(), winLoss: "-", era: "-" }
        : null),
    homeBattingOrder,
    awayBattingOrder,
    isLineupOut,
  };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return json(405, { success: false, message: "POST 요청만 지원합니다." });
  }

  const syncSecret = Deno.env.get("KBO_SYNC_SECRET") ?? "";
  const requestSecret = req.headers.get("x-sync-secret") ?? "";

  if (!syncSecret || requestSecret !== syncSecret) {
    return json(401, { success: false, message: "동기화 권한이 없습니다." });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (!supabaseUrl || !serviceRoleKey) {
    return json(500, { success: false, message: "Supabase 관리자 설정이 누락되었습니다." });
  }

  const body = (await req.json().catch(() => ({}))) as SyncRequest;
  const mode = body.mode ?? "due";
  const targetDate = body.date ?? getKstToday();

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data: schedules, error: scheduleError } = await supabase
    .from("game_schedules")
    .select("id, season_year, game_date, game_time, home_team_id, away_team_id")
    .eq("game_date", targetDate);

  if (scheduleError) {
    return json(500, {
      success: false,
      message: "경기 일정 조회 중 오류가 발생했습니다.",
      error: scheduleError.message,
    });
  }

  let attempted = 0;
  let saved = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const game of (schedules ?? []) as GameScheduleRow[]) {
    const { data: existing } = await supabase
      .from("game_lineups")
      .select("is_lineup_out, home_starting_pitcher, away_starting_pitcher")
      .eq("season_year", game.season_year)
      .eq("game_date", game.game_date)
      .eq("home_team_id", game.home_team_id)
      .eq("away_team_id", game.away_team_id)
      .maybeSingle<ExistingLineupRow>();

    if (mode === "lineups" && existing?.is_lineup_out) {
      skipped += 1;
      continue;
    }

    if (mode === "due" && (!shouldTryLineup(game) || existing?.is_lineup_out)) {
      skipped += 1;
      continue;
    }

    if (mode === "pitchers" && existing?.home_starting_pitcher && existing?.away_starting_pitcher) {
      skipped += 1;
      continue;
    }

    attempted += 1;

    try {
      const lineup = await fetchLineup(game);
      if (!lineup) {
        skipped += 1;
        continue;
      }

      if (body.dryRun) {
        saved += 1;
        continue;
      }

      const now = new Date().toISOString();
      const { error } = await supabase.from("game_lineups").upsert(
        {
          game_schedule_id: game.id,
          season_year: game.season_year,
          game_date: game.game_date,
          game_time: game.game_time,
          home_team_id: game.home_team_id,
          away_team_id: game.away_team_id,
          home_starting_pitcher: lineup.homeStartingPitcher,
          away_starting_pitcher: lineup.awayStartingPitcher,
          home_batting_order: lineup.isLineupOut ? lineup.homeBattingOrder : existing ? undefined : [],
          away_batting_order: lineup.isLineupOut ? lineup.awayBattingOrder : existing ? undefined : [],
          is_lineup_out: lineup.isLineupOut,
          pitcher_synced_at: now,
          lineup_synced_at: lineup.isLineupOut ? now : null,
          last_attempted_at: now,
        },
        {
          onConflict: "season_year,game_date,home_team_id,away_team_id",
          ignoreDuplicates: false,
        },
      );

      if (error) {
        errors.push(error.message);
      } else {
        saved += 1;
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  return json(200, {
    success: errors.length === 0,
    mode,
    date: targetDate,
    totalSchedules: schedules?.length ?? 0,
    attempted,
    saved,
    skipped,
    errors,
  });
});
