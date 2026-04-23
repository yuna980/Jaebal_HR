export type GameStatus = "scheduled" | "finished" | "cancelled";

export interface KboGameRecord {
  seasonYear: number;
  gameDate: string;
  homeTeamId: string;
  awayTeamId: string;
  stadium: string;
  homeScore: number | null;
  awayScore: number | null;
  status: GameStatus;
  note: string;
  winningPitcherName: string | null;
  losingPitcherName: string | null;
}

interface KboTableCell {
  Text?: string;
  Class?: string;
}

interface KboTableRow {
  row?: KboTableCell[];
}

interface KboScheduleResponse {
  rows?: KboTableRow[];
}

interface KboGameListItem {
  G_DT?: string;
  AWAY_NM?: string;
  HOME_NM?: string;
  W_PIT_P_NM?: string;
  L_PIT_P_NM?: string;
}

interface KboGameListResponse {
  game?: KboGameListItem[];
}

const TEAM_NAME_TO_ID: Record<string, string> = {
  SSG: "ssg",
  LG: "lg",
  두산: "doosan",
  KIA: "kia",
  롯데: "lotte",
  삼성: "samsung",
  한화: "hanwha",
  키움: "kiwoom",
  NC: "nc",
  KT: "kt",
};

function stripHtml(value: string | undefined) {
  return (value ?? "").replace(/<[^>]*>?/gm, " ").replace(/\s+/g, " ").trim();
}

function parseNote(value: string | undefined) {
  return stripHtml(value);
}

function parseDayString(dayStr: string) {
  const match = dayStr.match(/^(\d{2})\.(\d{2})\((.)\)$/);
  if (!match) {
    return { month: "", day: "" };
  }

  return { month: match[1], day: match[2] };
}

function buildGameDate(year: number, dayText: string) {
  const { month, day } = parseDayString(dayText);
  if (!month || !day) return "";
  return `${year}-${month}-${day}`;
}

function buildDetailKey(gameDate: string, awayTeam: string, homeTeam: string) {
  return `${gameDate}-${awayTeam}-${homeTeam}`;
}

function toDetailDate(gameDate: string | undefined) {
  if (!gameDate || gameDate.length < 8) return "";
  return `${gameDate.slice(0, 4)}-${gameDate.slice(4, 6)}-${gameDate.slice(6, 8)}`;
}

function parseMatchString(matchStr: string) {
  const scorePattern = /^(.+?)\s+(\d+)\s+vs\s+(\d+)\s+(.+)$/;
  const scoreMatch = matchStr.match(scorePattern);

  if (scoreMatch) {
    return {
      awayTeamName: scoreMatch[1].trim(),
      awayScore: Number.parseInt(scoreMatch[2], 10),
      homeScore: Number.parseInt(scoreMatch[3], 10),
      homeTeamName: scoreMatch[4].trim(),
      status: "finished" as const,
    };
  }

  const noScorePattern = /^(.+?)\s+vs\s+(.+)$/;
  const noScoreMatch = matchStr.match(noScorePattern);

  if (noScoreMatch) {
    return {
      awayTeamName: noScoreMatch[1].trim(),
      awayScore: null,
      homeScore: null,
      homeTeamName: noScoreMatch[2].trim(),
      status: "scheduled" as const,
    };
  }

  return null;
}

async function postForm<T>(url: string, body: URLSearchParams | string) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Referer: "https://www.koreabaseball.com/Schedule/Schedule.aspx",
    },
    body: typeof body === "string" ? body : body.toString(),
  });

  if (!response.ok) {
    throw new Error(`KBO 요청 실패: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as T;
}

async function fetchMonthlyGameDetails(year: number, month: number) {
  const daysInMonth = new Date(year, month, 0).getDate();

  const responses = await Promise.all(
    Array.from({ length: daysInMonth }, (_, index) => {
      const date = `${year}${String(month).padStart(2, "0")}${String(index + 1).padStart(2, "0")}`;
      const form = new URLSearchParams();
      form.append("leId", "1");
      form.append("srId", "0");
      form.append("date", date);

      return postForm<KboGameListResponse>(
        "https://www.koreabaseball.com/ws/Main.asmx/GetKboGameList",
        form,
      ).catch(() => ({ game: [] }));
    }),
  );

  const detailMap = new Map<string, KboGameListItem>();

  for (const response of responses) {
    for (const game of response.game ?? []) {
      const gameDate = toDetailDate(game.G_DT);
      const awayTeam = game.AWAY_NM?.trim() ?? "";
      const homeTeam = game.HOME_NM?.trim() ?? "";

      if (!gameDate || !awayTeam || !homeTeam) continue;
      detailMap.set(buildDetailKey(gameDate, awayTeam, homeTeam), game);
    }
  }

  return detailMap;
}

export async function fetchRegularSeasonGames(year: number, month: number): Promise<KboGameRecord[]> {
  const detailMap = await fetchMonthlyGameDetails(year, month);
  const monthText = String(month).padStart(2, "0");

  const response = await postForm<KboScheduleResponse>(
    "https://www.koreabaseball.com/ws/Schedule.asmx/GetScheduleList",
    `leId=1&srIdList=0&seasonId=${year}&gameMonth=${monthText}&teamId=`,
  );

  const games: KboGameRecord[] = [];
  let currentDay = "";

  for (const item of response.rows ?? []) {
    const cols = item.row ?? [];
    if (cols.length === 0) continue;

    let dayIndex = -1;
    if (cols[0]?.Class === "day") {
      dayIndex = 0;
      const rawDay = stripHtml(cols[0]?.Text);
      if (rawDay) currentDay = rawDay;
    }

    const playIndex = dayIndex + 2;
    const stadiumIndex = cols.length - 2;
    const noteIndex = cols.length - 1;

    const matchInfo = stripHtml(cols[playIndex]?.Text);
    if (!matchInfo || matchInfo === "-") continue;

    const parsed = parseMatchString(matchInfo);
    if (!parsed) continue;

    const gameDate = buildGameDate(year, currentDay);
    if (!gameDate) continue;

    const awayTeamId = TEAM_NAME_TO_ID[parsed.awayTeamName];
    const homeTeamId = TEAM_NAME_TO_ID[parsed.homeTeamName];
    if (!awayTeamId || !homeTeamId) continue;

    const detail = detailMap.get(buildDetailKey(gameDate, parsed.awayTeamName, parsed.homeTeamName));
    const note = parseNote(cols[noteIndex]?.Text);

    games.push({
      seasonYear: year,
      gameDate,
      awayTeamId,
      homeTeamId,
      stadium: stripHtml(cols[stadiumIndex]?.Text),
      awayScore: parsed.awayScore,
      homeScore: parsed.homeScore,
      status: note.includes("취소") ? "cancelled" : parsed.status,
      note,
      winningPitcherName: detail?.W_PIT_P_NM?.trim() || null,
      losingPitcherName: detail?.L_PIT_P_NM?.trim() || null,
    });
  }

  return games;
}
