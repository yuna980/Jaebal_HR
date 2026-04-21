import axios from 'axios';

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
export async function fetchKboSchedule(): Promise<KboMatch[]> {
  try {
    // 현재 년도와 월 구하기
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');

    // 1️⃣ KBO '숨겨진 API' 주소로 POST 요청을 보냅니다!
    const response = await axios.post(
      'https://www.koreabaseball.com/ws/Schedule.asmx/GetScheduleList',
      `leId=1&srIdList=0,1,3,4,5,7,9&seasonId=${year}&gameMonth=${month}&teamId=`,
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

      const time = cols[timeIndex]?.Text?.replace(/<[^>]*>?/gm, '').trim() || '';
      const matchInfo = cols[playIndex]?.Text?.replace(/<[^>]*>?/gm, ' ').trim() || '';
      const stadium = cols[stadiumIndex]?.Text?.replace(/<[^>]*>?/gm, '').trim() || '';

      if (!matchInfo || matchInfo === '-') continue;

      const parsed = parseMatchString(matchInfo);
      if (!parsed) continue;

      const { date, dayOfWeek } = parseDayString(currentDay);

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
        status: parsed.status,
      });
    }

    return schedules;
  } catch (error) {
    console.error("KBO 일정 조회 실패:", error);
    return [];
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
