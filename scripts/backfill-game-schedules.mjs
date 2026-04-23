const TEAM_NAME_TO_ID = {
  LG: 'lg',
  KT: 'kt',
  SSG: 'ssg',
  NC: 'nc',
  두산: 'doosan',
  KIA: 'kia',
  롯데: 'lotte',
  삼성: 'samsung',
  한화: 'hanwha',
  키움: 'kiwoom',
};

function stripHtml(value = '') {
  return value.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
}

function parseDayString(dayText) {
  const match = dayText.match(/^(\d{2})\.(\d{2})\((.)\)$/);
  if (!match) return null;
  return { month: match[1], day: match[2], dayOfWeek: match[3] };
}

function parseMatchString(matchText) {
  const scoreMatch = matchText.match(/^(.+?)\s+\d+\s+vs\s+\d+\s+(.+)$/);
  if (scoreMatch) {
    return { awayTeamName: scoreMatch[1].trim(), homeTeamName: scoreMatch[2].trim() };
  }

  const noScoreMatch = matchText.match(/^(.+?)\s+vs\s+(.+)$/);
  if (noScoreMatch) {
    return { awayTeamName: noScoreMatch[1].trim(), homeTeamName: noScoreMatch[2].trim() };
  }

  return null;
}

function sql(value) {
  if (value === null || value === undefined) return 'null';
  return `'${String(value).replaceAll("'", "''")}'`;
}

async function fetchMonthlySchedules(year, month) {
  const monthText = String(month).padStart(2, '0');
  const response = await fetch('https://www.koreabaseball.com/ws/Schedule.asmx/GetScheduleList', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Referer: 'https://www.koreabaseball.com/Schedule/Schedule.aspx',
    },
    body: `leId=1&srIdList=0&seasonId=${year}&gameMonth=${monthText}&teamId=`,
  });

  if (!response.ok) {
    throw new Error(`KBO 일정 요청 실패: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const schedules = [];
  let currentDay = '';

  for (const item of data.rows ?? []) {
    const cols = item.row ?? [];
    if (cols.length === 0) continue;

    let dayIndex = -1;
    if (cols[0]?.Class === 'day') {
      dayIndex = 0;
      const rawDay = stripHtml(cols[0]?.Text);
      if (rawDay) currentDay = rawDay;
    }

    const parsedDay = parseDayString(currentDay);
    if (!parsedDay) continue;

    const timeIndex = dayIndex + 1;
    const playIndex = dayIndex + 2;
    const stadiumIndex = cols.length - 2;
    const noteIndex = cols.length - 1;

    const gameTime = stripHtml(cols[timeIndex]?.Text);
    const matchText = stripHtml(cols[playIndex]?.Text);
    const stadium = stripHtml(cols[stadiumIndex]?.Text);
    const note = stripHtml(cols[noteIndex]?.Text);
    const parsedMatch = parseMatchString(matchText);

    if (!parsedMatch) continue;

    const awayTeamId = TEAM_NAME_TO_ID[parsedMatch.awayTeamName];
    const homeTeamId = TEAM_NAME_TO_ID[parsedMatch.homeTeamName];
    if (!awayTeamId || !homeTeamId) continue;

    schedules.push({
      seasonYear: year,
      gameDate: `${year}-${parsedDay.month}-${parsedDay.day}`,
      gameTime,
      awayTeamId,
      homeTeamId,
      stadium,
      note,
    });
  }

  return schedules;
}

async function main() {
  const year = Number(process.argv[2] ?? new Date().getFullYear());
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new Error('사용법: node scripts/backfill-game-schedules.mjs 2026');
  }

  const monthlySchedules = await Promise.all(
    Array.from({ length: 12 }, (_, index) => fetchMonthlySchedules(year, index + 1).catch(() => [])),
  );
  const schedules = monthlySchedules.flat();

  console.log('begin;');
  console.log(`delete from public.game_schedules where season_year = ${year};`);

  if (schedules.length > 0) {
    const values = schedules
      .map(
        (item) =>
          `(${item.seasonYear}, ${sql(item.gameDate)}, ${sql(item.gameTime)}, ${sql(item.homeTeamId)}, ${sql(
            item.awayTeamId,
          )}, ${sql(item.stadium)}, ${sql(item.note)})`,
      )
      .join(',\n');

    console.log(`
insert into public.game_schedules (
  season_year,
  game_date,
  game_time,
  home_team_id,
  away_team_id,
  stadium,
  note
)
values
${values}
on conflict (season_year, game_date, home_team_id, away_team_id)
do update set
  game_time = excluded.game_time,
  stadium = excluded.stadium,
  note = excluded.note;`);
  }

  console.log('commit;');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
