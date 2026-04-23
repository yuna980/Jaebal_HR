import axios from 'axios';
import * as cheerio from 'cheerio';
import type { AnyNode } from 'domhandler';

export interface KboMatch {
  /** 날짜 원본 문자열. 예: "04.16(목)" */
  day: string;
  /** 날짜만 추출. 예: "04.16" */
  date: string;
  /** 요일. 예: "목" */
  dayOfWeek: string;
  /** 경기 시간. 예: "18:30" */
  time: string;
  /** 원전 전체 match 문자열 */
  matchRaw: string;
  /** 어웨이 팀 이름 */
  awayTeam: string;
  /** 홈 팀 이름 */
  homeTeam: string;
  /** 어웨이 팀 점수 (경기 전이면 null) */
  awayScore: number | null;
  /** 홈 팀 점수 (경기 전이면 null) */
  homeScore: number | null;
  /** 구장 이름 */
  stadium: string;
  /** 경기 상태: 'scheduled' | 'finished' | 'cancelled' */
  status: 'scheduled' | 'finished' | 'cancelled';
  /** 비고 */
  note?: string | null;
  /** 승리 투수 */
  winningPitcherName?: string | null;
  /** 패전 투수 */
  losingPitcherName?: string | null;
  /** 세이브 투수 */
  savePitcherName?: string | null;
}

export interface KboBatter {
  order: number;
  position: string;
  name: string;
  war?: string;
}

export interface KboLineupData {
  startingPitcher: KboPitcherSummary | null;
  opponentStartingPitcher: KboPitcherSummary | null;
  battingOrder: KboBatter[];
  opponentBattingOrder: KboBatter[];
  opponentTeamName: string | null;
  isLineupOut: boolean;
}

export interface KboPitcherSummary {
  name: string;
  winLoss: string;
  era: string;
  whip?: string;
  war?: string;
  games?: string;
  startInnings?: string;
  qs?: string;
}

export interface KboRosterPlayer {
  number: string;
  name: string;
  position: string;
  handType?: string;
  birth?: string;
  body?: string;
}

export interface KboRosterData {
  date: string;
  teamId: string;
  callUps: KboRosterPlayer[];
  sendDowns: KboRosterPlayer[];
}

// 팀 이름 매핑 (크롤링된 짧은 이름 → teams.ts의 id)
export const TEAM_NAME_TO_ID: Record<string, string> = {
  'LG': 'lg',
  'KT': 'kt',
  'SSG': 'ssg',
  'NC': 'nc',
  '두산': 'doosan',
  'KIA': 'kia',
  '롯데': 'lotte',
  '삼성': 'samsung',
  '한화': 'hanwha',
  '키움': 'kiwoom',
};

export const APP_TO_KBO_TEAM_ID: Record<string, string> = {
  doosan: 'OB',
  ssg: 'SK',
  samsung: 'SS',
  hanwha: 'HH',
  lg: 'LG',
  kiwoom: 'WO',
  kia: 'HT',
  lotte: 'LT',
  nc: 'NC',
  kt: 'KT',
};

interface KboGameListItem {
  G_DT?: string;
  G_ID?: string;
  AWAY_ID?: string;
  HOME_ID?: string;
  AWAY_NM?: string;
  HOME_NM?: string;
  T_PIT_P_ID?: number | string | null;
  B_PIT_P_ID?: number | string | null;
  T_PIT_P_NM?: string;
  B_PIT_P_NM?: string;
  LINEUP_CK?: number | string | boolean;
  W_PIT_P_NM?: string;
  L_PIT_P_NM?: string;
  SV_PIT_P_NM?: string;
  GAME_STATE_SC?: string;
  CANCEL_SC_ID?: string;
  T_SCORE_CN?: string;
  B_SCORE_CN?: string;
}

interface KboGameListResponse {
  game?: KboGameListItem[];
}

interface KboLineUpFlagItem {
  LINEUP_CK?: boolean;
}

interface KboLineUpAnalysisTeamItem {
  T_ID?: string;
  T_NM?: string;
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

interface KboPitcherAnalysisResponse {
  rows?: KboTableRow[];
}

type KboLineUpAnalysisResponse = [
  KboLineUpFlagItem[]?,
  KboLineUpAnalysisTeamItem[]?,
  KboLineUpAnalysisTeamItem[]?,
  string[]?,
  string[]?
];

function parseTableRows(tableJson: string | undefined): KboBatter[] {
  if (!tableJson) return [];

  try {
    const parsed = JSON.parse(tableJson) as KboTableData;
    const batters: KboBatter[] = [];

    for (const row of parsed.rows ?? []) {
        const cells = row.row ?? [];
        const order = Number(cells[0]?.Text ?? '');
        const position = cells[1]?.Text?.trim() ?? '';
        const name = cells[2]?.Text?.trim() ?? '';
        const war = cells[3]?.Text?.trim() ?? '';

        if (!Number.isFinite(order) || !position || !name) {
          continue;
        }

        batters.push({
          order,
          position,
          name,
          war,
        });
    }

    return batters;
  } catch (error) {
    console.error('라인업 테이블 파싱 실패:', error);
    return [];
  }
}

function stripHtml(value: string | undefined) {
  return (value ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function parsePitcherName(cellText: string | undefined) {
  const nameMatch = stripHtml(cellText).match(/^(.*?)\s+(좌투|우투|좌타|우타|시즌)/);
  if (nameMatch?.[1]) {
    return nameMatch[1].trim();
  }

  return stripHtml(cellText).split('시즌')[0]?.trim() ?? '';
}

function parsePitcherRecord(
  row: KboTableRow | undefined
): KboPitcherSummary | null {
  const cells = row?.row ?? [];
  if (cells.length < 7) return null;

  const name = parsePitcherName(cells[0]?.Text);
  if (!name) return null;

  const winLossMatch = stripHtml(cells[0]?.Text).match(/시즌\s+(.+)$/);

  return {
    name,
    winLoss: winLossMatch?.[1]?.trim() ?? '-',
    era: stripHtml(cells[1]?.Text) || '-',
    war: stripHtml(cells[2]?.Text) || '-',
    games: stripHtml(cells[3]?.Text) || '-',
    startInnings: stripHtml(cells[4]?.Text) || '-',
    qs: stripHtml(cells[5]?.Text) || '-',
    whip: stripHtml(cells[6]?.Text) || '-',
  };
}

function extractViewState($: cheerio.CheerioAPI) {
  return {
    viewState: $('#__VIEWSTATE').val()?.toString() ?? '',
    viewStateGenerator: $('#__VIEWSTATEGENERATOR').val()?.toString() ?? '',
  };
}

function toDateString(gameDate: string | undefined) {
  if (!gameDate || gameDate.length < 8) return '';
  return `${gameDate.slice(4, 6)}.${gameDate.slice(6, 8)}`;
}

function buildDetailKey(date: string, awayTeam: string, homeTeam: string) {
  return `${date}-${awayTeam}-${homeTeam}`;
}

async function fetchMonthlyGameDetails(year: number, month: number) {
  const daysInMonth = new Date(year, month, 0).getDate();
  const requests = Array.from({ length: daysInMonth }, (_, index) => {
    const date = `${year}${String(month).padStart(2, '0')}${String(index + 1).padStart(2, '0')}`;
    const form = new URLSearchParams();
    form.append('leId', '1');
    form.append('srId', '0');
    form.append('date', date);

    return axios
      .post<KboGameListResponse>('https://www.koreabaseball.com/ws/Main.asmx/GetKboGameList', form.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      })
      .then((response) => response.data?.game ?? [])
      .catch(() => []);
  });

  const detailLists = await Promise.all(requests);
  const detailMap = new Map<string, KboGameListItem>();

  detailLists.flat().forEach((game) => {
    const date = toDateString(game.G_DT);
    const awayTeam = game.AWAY_NM?.trim() ?? '';
    const homeTeam = game.HOME_NM?.trim() ?? '';

    if (!date || !awayTeam || !homeTeam) return;
    detailMap.set(buildDetailKey(date, awayTeam, homeTeam), game);
  });

  return detailMap;
}

/**
 * match 문자열을 파싱하여 홈/어웨이 팀과 스코어를 분리합니다.
 * 예시:
 *   "두산   vs   SSG"       → { away: "두산", home: "SSG", awayScore: null, homeScore: null }
 *   "두산   3  vs  13   삼성" → { away: "두산", home: "삼성", awayScore: 3, homeScore: 13 }
 */
function parseMatchString(matchStr: string) {
  // 점수가 있는 경우: "팀A   3  vs  13   팀B"
  const scorePattern = /^(.+?)\s+(\d+)\s+vs\s+(\d+)\s+(.+)$/;
  const scoreMatch = matchStr.match(scorePattern);
  if (scoreMatch) {
    return {
      awayTeam: scoreMatch[1].trim(),
      awayScore: parseInt(scoreMatch[2]),
      homeTeam: scoreMatch[4].trim(),
      homeScore: parseInt(scoreMatch[3]),
      status: 'finished' as const,
    };
  }

  // 점수가 없는 경우: "팀A   vs   팀B"
  const noScorePattern = /^(.+?)\s+vs\s+(.+)$/;
  const noScoreMatch = matchStr.match(noScorePattern);
  if (noScoreMatch) {
    return {
      awayTeam: noScoreMatch[1].trim(),
      awayScore: null,
      homeTeam: noScoreMatch[2].trim(),
      homeScore: null,
      status: 'scheduled' as const,
    };
  }

  return null;
}

function parseNote(value: string | undefined) {
  return (value ?? '').replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ').trim();
}

/**
 * 날짜 문자열에서 날짜와 요일을 분리합니다.
 * 예: "04.16(목)" → { date: "04.16", dayOfWeek: "목" }
 */
function parseDayString(dayStr: string) {
  const match = dayStr.match(/^(\d{2}\.\d{2})\((.)\)$/);
  if (match) {
    return { date: match[1], dayOfWeek: match[2] };
  }
  return { date: dayStr, dayOfWeek: '' };
}

// 📌 서버에서 KBO 대진표를 긁어오는 함수입니다.
export async function fetchKboSchedule(
  targetYear?: number,
  targetMonth?: number,
  options?: { regularSeasonOnly?: boolean }
): Promise<KboMatch[]> {
  try {
    const today = new Date();
    const year = targetYear ?? today.getFullYear();
    const monthNumber = targetMonth ?? today.getMonth() + 1;
    const month = String(monthNumber).padStart(2, '0');
    const detailMap = await fetchMonthlyGameDetails(year, monthNumber);

    const srIdList = options?.regularSeasonOnly ? '0' : '0,1,3,4,5,7,9';

    const response = await axios.post(
      'https://www.koreabaseball.com/ws/Schedule.asmx/GetScheduleList',
      `leId=1&srIdList=${srIdList}&seasonId=${year}&gameMonth=${month}&teamId=`,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://www.koreabaseball.com/Schedule/Schedule.aspx'
        }
      }
    );

    const schedules: KboMatch[] = [];
    let currentDay = '';

    // 2️⃣ KBO 서버가 준 깔끔한 JSON 데이터를 순회합니다.
    const rows = response.data.rows || [];
    
    for (const item of rows) {
      if (!item.row) continue;
      
      const cols = item.row;
      if (!cols || cols.length === 0) continue;

      let dayIndex = -1;
      // 첫 번째 컬럼이 날짜(day) 데이터인지 확인
      if (cols[0]?.Class === 'day') {
        dayIndex = 0;
        const rawDay = cols[0].Text?.replace(/<[^>]*>?/gm, '').trim();
        if (rawDay) currentDay = rawDay;
      }

      // 날짜가 있으면 1, 없으면 0부터 시작
      const timeIndex = dayIndex + 1;
      const playIndex = dayIndex + 2;
      // 구장은 무조건 뒤에서 두 번째 (cols.length - 2)
      const stadiumIndex = cols.length - 2;
      const noteIndex = cols.length - 1;

      const time = cols[timeIndex]?.Text?.replace(/<[^>]*>?/gm, '').trim() || '';
      const matchInfo = cols[playIndex]?.Text?.replace(/<[^>]*>?/gm, ' ').trim() || '';
      const stadium = cols[stadiumIndex]?.Text?.replace(/<[^>]*>?/gm, '').trim() || '';
      const note = parseNote(cols[noteIndex]?.Text);

      if (!matchInfo || matchInfo === '-') continue;

      const parsed = parseMatchString(matchInfo);
      if (!parsed) continue;

      const { date, dayOfWeek } = parseDayString(currentDay);

      const detail = detailMap.get(buildDetailKey(date, parsed.awayTeam, parsed.homeTeam));

      schedules.push({
        day: currentDay,
        date,
        dayOfWeek,
        time,
        matchRaw: matchInfo,
        awayTeam: parsed.awayTeam,
        homeTeam: parsed.homeTeam,
        awayScore: parsed.awayScore,
        homeScore: parsed.homeScore,
        stadium,
        status: note.includes('취소') ? 'cancelled' : parsed.status,
        note: note || null,
        winningPitcherName: detail?.W_PIT_P_NM?.trim() || null,
        losingPitcherName: detail?.L_PIT_P_NM?.trim() || null,
        savePitcherName: detail?.SV_PIT_P_NM?.trim() || null,
      });
    }

    return schedules;
  } catch (error) {
    console.error("KBO 일정 조회 실패:", error);
    return [];
  }
}

export async function fetchKboLineup(teamId: string, dateParam: string): Promise<KboLineupData> {
  const emptyResult: KboLineupData = {
    startingPitcher: null,
    opponentStartingPitcher: null,
    battingOrder: [],
    opponentBattingOrder: [],
    opponentTeamName: null,
    isLineupOut: false,
  };

  try {
    const kboTeamId = APP_TO_KBO_TEAM_ID[teamId];
    if (!kboTeamId) return emptyResult;

    const currentYear = new Date().getFullYear();
    const normalizedDate = dateParam.includes('.')
      ? `${currentYear}${dateParam.split('.').join('')}`
      : dateParam;

    const gameListForm = new URLSearchParams();
    gameListForm.append('leId', '1');
    gameListForm.append('srId', '0');
    gameListForm.append('date', normalizedDate);

    const gameListResponse = await axios.post<KboGameListResponse>(
      'https://www.koreabaseball.com/ws/Main.asmx/GetKboGameList',
      gameListForm.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const games = Array.isArray(gameListResponse.data?.game) ? gameListResponse.data.game : [];
    const game = games.find(
      (candidate) => candidate.AWAY_ID === kboTeamId || candidate.HOME_ID === kboTeamId
    );

    if (!game?.G_ID) {
      return emptyResult;
    }

    const isAway = game.AWAY_ID === kboTeamId;
    const startingPitcherName = isAway ? game.T_PIT_P_NM : game.B_PIT_P_NM;
    const opponentPitcherName = isAway ? game.B_PIT_P_NM : game.T_PIT_P_NM;

    const lineUpForm = new URLSearchParams();
    lineUpForm.append('leId', '1');
    lineUpForm.append('srId', '0');
    lineUpForm.append('seasonId', normalizedDate.slice(0, 4));
    lineUpForm.append('gameId', game.G_ID);

    const lineUpResponse = await axios.post<KboLineUpAnalysisResponse>(
      'https://www.koreabaseball.com/ws/Schedule.asmx/GetLineUpAnalysis',
      lineUpForm.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        },
      }
    );

    const lineUpData = Array.isArray(lineUpResponse.data) ? lineUpResponse.data : [];
    const isLineupOut = Boolean(lineUpData[0]?.[0]?.LINEUP_CK);

    const homeTeam = lineUpData[1]?.[0];
    const awayTeam = lineUpData[2]?.[0];
    const homeLineup = parseTableRows(lineUpData[3]?.[0]);
    const awayLineup = parseTableRows(lineUpData[4]?.[0]);

    let battingOrder: KboBatter[] = [];
    let opponentBattingOrder: KboBatter[] = [];
    let opponentTeamName: string | null = null;
    if (homeTeam?.T_ID === kboTeamId) {
      battingOrder = homeLineup;
      opponentBattingOrder = awayLineup;
      opponentTeamName = awayTeam?.T_NM ?? null;
    } else if (awayTeam?.T_ID === kboTeamId) {
      battingOrder = awayLineup;
      opponentBattingOrder = homeLineup;
      opponentTeamName = homeTeam?.T_NM ?? null;
    } else {
      battingOrder = isAway ? awayLineup : homeLineup;
      opponentBattingOrder = isAway ? homeLineup : awayLineup;
      opponentTeamName = isAway ? homeTeam?.T_NM ?? null : awayTeam?.T_NM ?? null;
    }

    const pitcherRecordForm = new URLSearchParams();
    pitcherRecordForm.append('leId', '1');
    pitcherRecordForm.append('srId', '0');
    pitcherRecordForm.append('seasonId', normalizedDate.slice(0, 4));
    pitcherRecordForm.append('awayTeamId', game.AWAY_ID ?? '');
    pitcherRecordForm.append('awayPitId', String(game.T_PIT_P_ID ?? ''));
    pitcherRecordForm.append('homeTeamId', game.HOME_ID ?? '');
    pitcherRecordForm.append('homePitId', String(game.B_PIT_P_ID ?? ''));
    pitcherRecordForm.append('groupSc', 'SEASON');

    const pitcherRecordResponse = await axios.post<KboPitcherAnalysisResponse>(
      'https://www.koreabaseball.com/ws/Schedule.asmx/GetPitcherRecordAnalysis',
      pitcherRecordForm.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        },
      }
    );

    const pitcherRows = pitcherRecordResponse.data?.rows ?? [];
    const awayPitcherRecord = parsePitcherRecord(pitcherRows[0]);
    const homePitcherRecord = parsePitcherRecord(pitcherRows[1]);

    const startingPitcher =
      homeTeam?.T_ID === kboTeamId
        ? homePitcherRecord
        : awayTeam?.T_ID === kboTeamId
          ? awayPitcherRecord
          : isAway
            ? awayPitcherRecord
            : homePitcherRecord;

    const opponentStartingPitcher =
      homeTeam?.T_ID === kboTeamId
        ? awayPitcherRecord
        : awayTeam?.T_ID === kboTeamId
          ? homePitcherRecord
          : isAway
            ? homePitcherRecord
            : awayPitcherRecord;

    return {
      startingPitcher:
        startingPitcher ??
        (startingPitcherName
          ? {
              name: startingPitcherName.trim(),
              winLoss: '-',
              era: '-',
            }
          : null),
      opponentStartingPitcher:
        opponentStartingPitcher ??
        (opponentPitcherName
          ? {
              name: opponentPitcherName.trim(),
              winLoss: '-',
              era: '-',
            }
          : null),
      battingOrder,
      opponentBattingOrder,
      opponentTeamName,
      isLineupOut,
    };
  } catch (error) {
    console.error('KBO 라인업 조회 실패:', error);
    return emptyResult;
  }
}

export async function fetchKboRoster(teamId: string, date = new Date()): Promise<KboRosterData> {
  const emptyResult: KboRosterData = {
    date: date.toISOString().split('T')[0],
    teamId,
    callUps: [],
    sendDowns: [],
  };

  try {
    const kboTeamId = APP_TO_KBO_TEAM_ID[teamId];
    if (!kboTeamId) return emptyResult;

    const registerUrl = 'https://www.koreabaseball.com/Player/Register.aspx';
    const initialHtml = (await axios.get(registerUrl)).data;
    const $initial = cheerio.load(initialHtml);
    const { viewState, viewStateGenerator } = extractViewState($initial);

    const searchDate = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(
      date.getDate()
    ).padStart(2, '0')}`;

    const formData = new URLSearchParams();
    formData.append('__VIEWSTATE', viewState);
    formData.append('__VIEWSTATEGENERATOR', viewStateGenerator);
    formData.append(
      '__EVENTTARGET',
      'ctl00$ctl00$ctl00$cphContents$cphContents$cphContents$btnCalendarSelect'
    );
    formData.append('__EVENTARGUMENT', '');
    formData.append('ctl00$ctl00$ctl00$cphContents$cphContents$cphContents$hfSearchTeam', kboTeamId);
    formData.append('ctl00$ctl00$ctl00$cphContents$cphContents$cphContents$hfSearchDate', searchDate);
    formData.append('ctl00$ctl00$ctl00$cphContents$cphContents$cphContents$btnCalendarSelect', '');

    const resultHtml = (
      await axios.post(registerUrl, formData.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      })
    ).data;

    const $ = cheerio.load(resultHtml);
    const historyHeading = $('h4.bul_history')
      .filter((_, element) => $(element).text().includes('등/말소 현황'))
      .first();

    if (!historyHeading.length) {
      return {
        ...emptyResult,
        date: searchDate,
      };
    }

    const section = historyHeading.parent();
    const tables = section.find('table.tNData');
    const [callUpTable, sendDownTable] = [tables.eq(0), tables.eq(1)];

    const parseRosterTable = (table: cheerio.Cheerio<AnyNode>): KboRosterPlayer[] => {
      const players: KboRosterPlayer[] = [];

      table.find('tbody tr').each((_, row) => {
        const cells = $(row)
          .find('td')
          .map((__, cell) => $(cell).text().replace(/\s+/g, ' ').trim())
          .get();

        if (cells.length < 6) return;
        if (cells[0].includes('당일 1군')) return;

        players.push({
          number: cells[0],
          name: cells[1],
          position: cells[2],
          handType: cells[3],
          birth: cells[4],
          body: cells[5],
        });
      });

      return players;
    };

    return {
      date: searchDate,
      teamId,
      callUps: parseRosterTable(callUpTable),
      sendDowns: parseRosterTable(sendDownTable),
    };
  } catch (error) {
    console.error('KBO 등록/말소 조회 실패:', error);
    return emptyResult;
  }
}

/**
 * 특정 팀의 경기만 필터링합니다.
 * @param schedules 전체 일정
 * @param teamName 팀 이름 (예: "SSG", "두산")
 */
export function filterByTeam(schedules: KboMatch[], teamName: string): KboMatch[] {
  return schedules.filter(
    (m) => m.homeTeam === teamName || m.awayTeam === teamName
  );
}

/**
 * 특정 날짜의 경기만 필터링합니다.
 * @param schedules 전체 일정
 * @param dateStr 날짜 문자열 (예: "04.16")
 */
export function filterByDate(schedules: KboMatch[], dateStr: string): KboMatch[] {
  return schedules.filter((m) => m.date === dateStr);
}
