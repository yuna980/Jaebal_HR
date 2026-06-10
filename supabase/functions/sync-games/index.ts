import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { fetchRegularSeasonGames } from "../_shared/kbo.ts";

type SyncMode = "backfill" | "daily";

interface SyncRequest {
  mode?: SyncMode;
  seasons?: number[];
  monthsBySeason?: Record<string, number[]>;
  dryRun?: boolean;
}

interface SyncSummary {
  seasonYear: number;
  month: number;
  processed: number;
  saved: number;
}

interface SyncRunUpdate {
  status: "success" | "failed";
  totalProcessed: number;
  totalSaved: number;
  summaries: SyncSummary[];
  errorMessage?: string;
}

const corsHeaders = {
  "Content-Type": "application/json",
};

function json(status: number, payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: corsHeaders,
  });
}

function getMonthsForSeason(mode: SyncMode, seasonYear: number, monthsBySeason?: Record<string, number[]>) {
  const requestedMonths = monthsBySeason?.[String(seasonYear)]
    ?.map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value >= 1 && value <= 12);

  if (requestedMonths && requestedMonths.length > 0) {
    return [...new Set(requestedMonths)].sort((a, b) => a - b);
  }

  if (mode === "daily") {
    const now = new Date();
    return [now.getUTCMonth() + 1];
  }

  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const lastMonth = seasonYear === currentYear ? now.getUTCMonth() + 1 : 10;
  const finalMonth = Math.min(Math.max(lastMonth, 3), 10);

  return Array.from({ length: finalMonth - 2 }, (_, index) => index + 3);
}

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

function dedupeGames<T extends {
  season_year: number;
  game_date: string;
  home_team_id: string;
  away_team_id: string;
}>(items: T[]) {
  const uniqueMap = new Map<string, T>();

  for (const item of items) {
    const key = `${item.season_year}-${item.game_date}-${item.home_team_id}-${item.away_team_id}`;
    uniqueMap.set(key, item);
  }

  return Array.from(uniqueMap.values());
}

function isHistoryEligible(status: string) {
  return status === "finished" || status === "cancelled";
}

async function createSyncRun(
  supabase: ReturnType<typeof createClient>,
  params: { mode: SyncMode; dryRun: boolean; seasons: number[] },
) {
  const { data, error } = await supabase
    .from("kbo_sync_runs")
    .insert({
      mode: params.mode,
      dry_run: params.dryRun,
      seasons: params.seasons,
      status: "started",
    })
    .select("id")
    .single();

  if (error) {
    console.error("kbo_sync_runs insert failed", error);
    return null;
  }

  return data?.id as number | null;
}

async function finishSyncRun(
  supabase: ReturnType<typeof createClient>,
  runId: number | null,
  update: SyncRunUpdate,
) {
  if (!runId) return;

  const { error } = await supabase
    .from("kbo_sync_runs")
    .update({
      status: update.status,
      finished_at: new Date().toISOString(),
      total_processed: update.totalProcessed,
      total_saved: update.totalSaved,
      summaries: update.summaries,
      error_message: update.errorMessage ?? null,
    })
    .eq("id", runId);

  if (error) {
    console.error("kbo_sync_runs update failed", error);
  }
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
  const mode = body.mode ?? "daily";
  const today = new Date();
  const currentYear = today.getUTCFullYear();
  const seasons =
    body.seasons?.filter((value) => Number.isInteger(value)) ??
    (mode === "backfill" ? [2025, 2026] : [currentYear]);

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const summaries: SyncSummary[] = [];
  let totalProcessed = 0;
  let totalSaved = 0;
  const runId = await createSyncRun(supabase, {
    mode,
    dryRun: Boolean(body.dryRun),
    seasons,
  });

  try {
    for (const seasonYear of seasons) {
      const months = getMonthsForSeason(mode, seasonYear, body.monthsBySeason);

      for (const month of months) {
        const games = await fetchRegularSeasonGames(seasonYear, month);
        totalProcessed += games.length;
        const completedGames = games.filter((game) => isHistoryEligible(game.status));
        const saved = body.dryRun ? 0 : completedGames.length;
        totalSaved += saved;
        summaries.push({
          seasonYear,
          month,
          processed: games.length,
          saved,
        });

        if (body.dryRun || completedGames.length === 0) {
          continue;
        }

        const payload = dedupeGames(
          completedGames.map((game) => ({
            season_year: game.seasonYear,
            game_date: game.gameDate,
            home_team_id: game.homeTeamId,
            away_team_id: game.awayTeamId,
            stadium: game.stadium,
            home_score: game.homeScore,
            away_score: game.awayScore,
            status: game.status,
            note: game.note,
            winning_pitcher_name: game.winningPitcherName,
            losing_pitcher_name: game.losingPitcherName,
            last_synced_at: new Date().toISOString(),
          })),
        );

        for (const batch of chunk(payload, 200)) {
          const { error } = await supabase.from("game_histories").upsert(batch, {
            onConflict: "season_year,game_date,home_team_id,away_team_id",
          });

          if (error) {
            console.error("game_histories upsert failed", error);
            await finishSyncRun(supabase, runId, {
              status: "failed",
              totalProcessed,
              totalSaved,
              summaries,
              errorMessage: error.message,
            });
            return json(500, {
              success: false,
              message: "경기 데이터 저장 중 오류가 발생했습니다.",
              error: error.message,
              summaries,
            });
          }
        }
      }
    }

    await finishSyncRun(supabase, runId, {
      status: "success",
      totalProcessed,
      totalSaved,
      summaries,
    });

    return json(200, {
      success: true,
      mode,
      seasons,
      totalProcessed,
      totalSaved,
      summaries,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 동기화 오류";
    console.error("sync-games failed", error);
    await finishSyncRun(supabase, runId, {
      status: "failed",
      totalProcessed,
      totalSaved,
      summaries,
      errorMessage: message,
    });

    return json(500, {
      success: false,
      message: "경기 데이터 동기화 중 오류가 발생했습니다.",
      error: message,
      summaries,
    });
  }
});
