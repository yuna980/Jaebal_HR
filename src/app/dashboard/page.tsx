'use client';

import { useTeam } from '@/context/TeamContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Navigation, Info, ChevronRight, Loader2 } from 'lucide-react';
import { useKboSchedule, getTodayDateString } from '@/hooks/useKboSchedule';
import { useGameWeather, useKboLineup, useKboRoster } from '@/hooks/useKboExtra';
import { KboLineupData, KboRosterData, TEAM_NAME_TO_ID } from '@/lib/kboScraper';
import { KBO_TEAMS } from '@/data/teams';
import TeamLogo from '@/components/TeamLogo';
import { findRecordForDate, formatDiaryDate, setAttendanceForGame, useFanDiaryRecords } from '@/lib/fanDiary';

const FIELD_POSITIONS = {
  dh: { label: 'DH', left: '18%', top: '84%' },
  lf: { label: 'LF', left: '16%', top: '18%' },
  cf: { label: 'CF', left: '50%', top: '7%' },
  rf: { label: 'RF', left: '84%', top: '18%' },
  ss: { label: 'SS', left: '30%', top: '33%' },
  second: { label: '2B', left: '71%', top: '37%' },
  third: { label: '3B', left: '19%', top: '55%' },
  first: { label: '1B', left: '81%', top: '55%' },
  c: { label: 'C', left: '50%', top: '88%' },
} as const;

function getFieldKey(position: string) {
  switch (position) {
    case '지명타자':
      return 'dh';
    case '좌익수':
      return 'lf';
    case '중견수':
      return 'cf';
    case '우익수':
      return 'rf';
    case '유격수':
      return 'ss';
    case '2루수':
      return 'second';
    case '3루수':
      return 'third';
    case '1루수':
      return 'first';
    case '포수':
      return 'c';
    default:
      return null;
  }
}

interface LineupPanelProps {
  title: string;
  pitcher: KboLineupData['startingPitcher'];
  battingOrder: KboLineupData['battingOrder'];
  isLineupOut: boolean;
  accentColor: string;
  roster?: KboRosterData | null;
}

function LineupPanel({ title, pitcher, battingOrder, isLineupOut, accentColor, roster }: LineupPanelProps) {
  const fieldPlayers = battingOrder
    .map((batter) => {
      const fieldKey = getFieldKey(batter.position);
      if (!fieldKey) return null;

      return {
        ...batter,
        field: FIELD_POSITIONS[fieldKey],
      };
    })
    .filter((batter): batter is NonNullable<typeof batter> => batter !== null);

  return (
    <div style={{ marginBottom: '18px' }}>
      <div style={{ fontSize: '16px', fontWeight: 800, marginBottom: '12px' }}>{title}</div>
      <div
        style={{
          border: '1px solid var(--border)',
          borderRadius: '22px',
          padding: '20px 16px',
          background: '#fff',
          boxShadow: '0 10px 24px rgba(15, 23, 42, 0.05)',
        }}
      >
        <div style={{ fontSize: '15px', fontWeight: 800, marginBottom: '14px' }}>선발 투수</div>

        <div style={{ fontSize: '18px', fontWeight: 800, marginBottom: '10px' }}>
          {pitcher?.name ?? '-'}
        </div>

        <div
          style={{
            border: '1px solid var(--border)',
            borderRadius: '14px',
            padding: '12px 14px',
            background: 'var(--background)',
            fontSize: '14px',
            color: 'var(--text)',
            lineHeight: 1.6,
            marginBottom: '20px',
          }}
        >
          시즌 {pitcher?.winLoss ?? '-'} ERA {pitcher?.era ?? '-'} WHIP {pitcher?.whip ?? '-'} WAR{' '}
          {pitcher?.war ?? '-'} 경기 {pitcher?.games ?? '-'} QS {pitcher?.qs ?? '-'}
        </div>

        <div style={{ fontSize: '15px', fontWeight: 800, marginBottom: '14px' }}>라인업</div>

        {!isLineupOut ? (
          <div
            style={{
              textAlign: 'center',
              padding: '22px 12px',
              borderRadius: '16px',
              background: 'var(--background)',
              color: 'var(--text-light)',
              fontSize: '14px',
              fontWeight: 700,
            }}
          >
            아직 라인업이 발표되지 않았습니다.
          </div>
        ) : battingOrder.length > 0 ? (
          <div
            style={{
              borderRadius: '18px',
              background: 'linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)',
            }}
          >
            <div
              style={{
                position: 'relative',
                aspectRatio: '4 / 3',
                borderRadius: '22px',
                overflow: 'hidden',
                background: '#49754f',
                border: '6px solid #3a5e3f',
                boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.06)',
                marginBottom: '16px',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '12%',
                  width: '86%',
                  height: '70%',
                  background: '#c7b79c',
                  borderRadius: '50% 50% 22% 22% / 72% 72% 20% 20%',
                  transform: 'translateX(-50%)',
                  zIndex: 0,
                }}
              />

              <div
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  width: '58%',
                  height: '58%',
                  background: '#49754f',
                  transform: 'translate(-50%, -50%) rotate(45deg)',
                  borderRadius: '18px',
                  zIndex: 1,
                }}
              />

              {[
                { left: '33%', top: '49%', width: '40%', rotate: '-45deg' },
                { left: '67%', top: '49%', width: '40%', rotate: '45deg' },
                { left: '40%', top: '31%', width: '28%', rotate: '-45deg' },
                { left: '60%', top: '31%', width: '28%', rotate: '45deg' },
              ].map((path, index) => (
                <div
                  key={`basepath-${index}`}
                  style={{
                    position: 'absolute',
                    left: path.left,
                    top: path.top,
                    width: path.width,
                    height: '18px',
                    background: '#a99274',
                    borderRadius: '9999px',
                    transform: `translate(-50%, -50%) rotate(${path.rotate})`,
                    zIndex: 2,
                  }}
                />
              ))}

              <div
                style={{
                  position: 'absolute',
                  left: '50%',
                  bottom: '15%',
                  width: '118%',
                  height: '3px',
                  background: 'rgba(255,255,255,0.28)',
                  transform: 'translateX(-50%) rotate(-45deg)',
                  transformOrigin: 'center',
                  zIndex: 0,
                }}
              />

              <div
                style={{
                  position: 'absolute',
                  left: '50%',
                  bottom: '15%',
                  width: '118%',
                  height: '3px',
                  background: 'rgba(255,255,255,0.28)',
                  transform: 'translateX(-50%) rotate(45deg)',
                  transformOrigin: 'center',
                  zIndex: 0,
                }}
              />

              <div
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  width: '74px',
                  height: '74px',
                  background: '#a99274',
                  borderRadius: '9999px',
                  transform: 'translate(-50%, -50%)',
                  zIndex: 2,
                }}
              />

              {[
                { left: '50%', top: '20%' },
                { left: '76%', top: '49%' },
                { left: '50%', top: '84%' },
                { left: '24%', top: '49%' },
              ].map((base, index) => (
                <div
                  key={index}
                  style={{
                    position: 'absolute',
                    left: base.left,
                    top: base.top,
                    width: '44px',
                    height: '44px',
                    background: '#a99274',
                    borderRadius: '9999px',
                    transform: 'translate(-50%, -50%)',
                    zIndex: 3,
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      left: '50%',
                      top: '50%',
                      width: '12px',
                      height: '12px',
                      background: '#fff',
                      transform: 'translate(-50%, -50%) rotate(45deg)',
                      borderRadius: '2px',
                    }}
                  />
                </div>
              ))}

              {fieldPlayers.map((batter) => (
                <div
                  key={`${batter.order}-${batter.name}-field`}
                  style={{
                    position: 'absolute',
                    left: batter.field.left,
                    top: batter.field.top,
                    transform: 'translate(-50%, -50%)',
                    zIndex: 4,
                  }}
                >
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      minHeight: '40px',
                      padding: '0 14px',
                      minWidth: batter.field.label === 'CF' ? '126px' : undefined,
                      borderRadius: '9999px',
                      background: 'rgba(37, 58, 34, 0.96)',
                      backdropFilter: 'blur(6px)',
                      color: '#fff',
                      fontSize: '12px',
                      fontWeight: 800,
                      whiteSpace: 'nowrap',
                      boxShadow: '0 6px 12px rgba(0, 0, 0, 0.18)',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    <span style={{ color: '#fbbf24', fontSize: '9px', fontWeight: 900 }}>
                      {batter.field.label}
                    </span>
                    <span style={{ fontSize: '12px', fontWeight: 800 }}>{batter.name}</span>
                  </div>
                </div>
              ))}

              <div
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                  zIndex: 5,
                }}
              >
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    minHeight: '40px',
                    padding: '0 14px',
                    borderRadius: '9999px',
                    background: 'rgba(37, 58, 34, 0.96)',
                    color: '#fff',
                    fontSize: '12px',
                    fontWeight: 800,
                    boxShadow: '0 6px 12px rgba(0, 0, 0, 0.18)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span style={{ color: '#fbbf24', fontSize: '9px', fontWeight: 900 }}>P</span>
                  {pitcher?.name ?? '-'}
                </div>
              </div>
            </div>

            <div
              style={{
                borderRadius: '18px',
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                padding: '14px',
                marginBottom:
                  roster && (roster.callUps.length > 0 || roster.sendDowns.length > 0) ? '14px' : 0,
              }}
            >
              <div style={{ fontSize: '15px', fontWeight: 800, marginBottom: '12px' }}>
                🔥 오늘의 타선
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
                  gap: '10px',
                }}
              >
                {battingOrder.map((batter) => (
                  <div
                    key={`${batter.order}-${batter.name}-order`}
                    style={{
                      minHeight: '60px',
                      borderRadius: '14px',
                      border: '1px solid #DBE4EE',
                      background: '#fff',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center',
                      boxShadow: '0 4px 10px rgba(15, 23, 42, 0.05)',
                      padding: '8px 4px',
                      minWidth: 0,
                    }}
                  >
                    <span style={{ fontSize: '13px', fontWeight: 800, color: accentColor, marginBottom: '4px' }}>
                      {batter.order}
                    </span>
                    <span
                      style={{
                        width: '100%',
                        fontSize: '13px',
                        fontWeight: 800,
                        textAlign: 'center',
                        whiteSpace: 'nowrap',
                        wordBreak: 'keep-all',
                      }}
                    >
                      {batter.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {roster && (roster.callUps.length > 0 || roster.sendDowns.length > 0) && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div
                  style={{
                    borderRadius: '16px',
                    background: '#FFF1F2',
                    border: '1px solid #FBCFE8',
                    padding: '12px 14px',
                  }}
                >
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#E11D48', marginBottom: '6px' }}>
                    IN
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#BE123C' }}>
                    {roster.callUps.length > 0
                      ? roster.callUps.slice(0, 2).map((player) => `${player.name} (${player.position})`).join(', ')
                      : '변동 없음'}
                  </div>
                </div>

                <div
                  style={{
                    borderRadius: '16px',
                    background: '#EFF6FF',
                    border: '1px solid #BFDBFE',
                    padding: '12px 14px',
                  }}
                >
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#2563EB', marginBottom: '6px' }}>
                    OUT
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#1D4ED8' }}>
                    {roster.sendDowns.length > 0
                      ? roster.sendDowns.slice(0, 2).map((player) => `${player.name} (${player.position})`).join(', ')
                      : '변동 없음'}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div
            style={{
              textAlign: 'center',
              padding: '22px 12px',
              borderRadius: '16px',
              background: 'var(--background)',
              color: 'var(--text-light)',
              fontSize: '14px',
            }}
          >
            라인업 상세 데이터를 정리하는 중입니다.
          </div>
        )}
      </div>
    </div>
  );
}

interface ResultBadgeRowProps {
  results: string[];
}

function ResultBadgeRow({ results }: ResultBadgeRowProps) {
  return (
    <div
      style={{
        background: 'var(--background)',
        borderRadius: 'var(--radius-sm)',
        padding: '20px 16px',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
        {results.map((result, index) => (
          <div
            key={`${result}-${index}`}
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '9999px',
              background:
                result === '승'
                  ? 'rgba(34, 197, 94, 0.14)'
                  : result === '패'
                    ? 'rgba(239, 68, 68, 0.14)'
                    : 'rgba(148, 163, 184, 0.18)',
              color:
                result === '승'
                  ? 'var(--success)'
                  : result === '패'
                    ? 'var(--error)'
                    : 'var(--text-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '22px',
              fontWeight: 800,
              border: '1px solid rgba(15, 23, 42, 0.04)',
            }}
          >
            {result}
          </div>
        ))}
      </div>
    </div>
  );
}

function parseScheduleDate(dateText: string, year: number) {
  const [month, day] = dateText.split('.').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

function isClearlyFinishedGame(game: {
  date: string;
  status: string;
  awayScore: number | null;
  homeScore: number | null;
  note?: string | null;
}, todayStr: string) {
  if (game.status !== 'finished') return false;

  if (
    game.date === todayStr &&
    game.status === 'finished' &&
    game.awayScore === 0 &&
    game.homeScore === 0 &&
    (!game.note || game.note === '-')
  ) {
    return false;
  }

  return true;
}

function getRecentSeriesResults(
  schedules: Array<{
    date: string;
    seasonYear?: number;
    status: string;
    homeTeam: string;
    awayTeam: string;
    homeScore: number | null;
    awayScore: number | null;
  }>,
  myTeamId: string,
  opponentName: string
) {
  const headToHeadGames = schedules
    .filter(
      (game) =>
        game.status !== 'scheduled' &&
        ((TEAM_NAME_TO_ID[game.homeTeam] === myTeamId && game.awayTeam === opponentName) ||
          (TEAM_NAME_TO_ID[game.awayTeam] === myTeamId && game.homeTeam === opponentName))
    )
    .sort(
      (left, right) =>
        parseScheduleDate(left.date, left.seasonYear ?? new Date().getFullYear()).getTime() -
        parseScheduleDate(right.date, right.seasonYear ?? new Date().getFullYear()).getTime()
    );

  if (headToHeadGames.length === 0) return [];

  const seriesGroups: typeof headToHeadGames[] = [];
  let currentGroup: typeof headToHeadGames = [];

  headToHeadGames.forEach((game, index) => {
    if (index === 0) {
      currentGroup = [game];
      return;
    }

    const previousGame = headToHeadGames[index - 1];
    const gap =
      (parseScheduleDate(game.date, game.seasonYear ?? new Date().getFullYear()).getTime() -
        parseScheduleDate(previousGame.date, previousGame.seasonYear ?? new Date().getFullYear()).getTime()) /
      (1000 * 60 * 60 * 24);

    if (gap > 1) {
      seriesGroups.push(currentGroup);
      currentGroup = [game];
      return;
    }

    currentGroup.push(game);
  });

  if (currentGroup.length > 0) {
    seriesGroups.push(currentGroup);
  }

  const latestSeries = [...seriesGroups]
    .reverse()
    .find((group) => group.some((game) => game.status === 'finished'));

  if (!latestSeries) return [];

  return latestSeries
    .filter((game) => game.status === 'finished')
    .slice(-3)
    .map((game) => {
    const isMyTeamHome = TEAM_NAME_TO_ID[game.homeTeam] === myTeamId;
    const myScore = isMyTeamHome ? game.homeScore ?? 0 : game.awayScore ?? 0;
    const opponentScore = isMyTeamHome ? game.awayScore ?? 0 : game.homeScore ?? 0;

    if (myScore > opponentScore) return '승';
    if (myScore < opponentScore) return '패';
    return '무';
    });
}

export default function Dashboard() {
  const { myTeam } = useTeam();
  const router = useRouter();
  const { schedules, loading, error } = useKboSchedule();
  const diaryRecords = useFanDiaryRecords();
  const today = new Date();
  const previousMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const previousSeasonYear = today.getFullYear() - 1;
  const { schedules: previousMonthSchedules } = useKboSchedule(
    previousMonthDate.getFullYear(),
    previousMonthDate.getMonth() + 1
  );
  const { schedules: previousSeasonSeptemberSchedules } = useKboSchedule(previousSeasonYear, 9);
  const { schedules: previousSeasonOctoberSchedules } = useKboSchedule(previousSeasonYear, 10);
  
  const todayStr = getTodayDateString();
  const { lineup } = useKboLineup(myTeam?.id, todayStr);
  const { roster } = useKboRoster(myTeam?.id);

  useEffect(() => {
    if (!myTeam) {
      router.push('/');
    }
  }, [myTeam, router]);

  // 오늘 내 팀 경기 찾기
  const myTeamGame = schedules.find(
    (m) =>
      m.date === todayStr &&
      (TEAM_NAME_TO_ID[m.homeTeam] === myTeam?.id || TEAM_NAME_TO_ID[m.awayTeam] === myTeam?.id)
  );
  const { weather, loading: weatherLoading } = useGameWeather(myTeamGame?.stadium, myTeamGame?.time);

  if (!myTeam) return null;
  const todayFullDate = formatDiaryDate(today.getFullYear(), todayStr);
  const todayRecord = findRecordForDate(diaryRecords, myTeam.id, todayFullDate);
  const isGoingToday = todayRecord?.isAttending ?? false;
  const isTodayGameActuallyFinished = myTeamGame ? isClearlyFinishedGame(myTeamGame, todayStr) : false;
  const isTodayGameCancelled = myTeamGame?.status === 'cancelled';
  const shouldShowFinishedState = Boolean(myTeamGame) && (isTodayGameCancelled || isTodayGameActuallyFinished);

  // 상대 팀 정보 가져오기
  const opponentName = myTeamGame
    ? TEAM_NAME_TO_ID[myTeamGame.homeTeam] === myTeam.id
      ? myTeamGame.awayTeam
      : myTeamGame.homeTeam
    : null;
  const lineupOpponentTeam = lineup?.opponentTeamName
    ? KBO_TEAMS.find((team) => team.id === TEAM_NAME_TO_ID[lineup.opponentTeamName])
    : null;

  const awayTeam = myTeamGame ? KBO_TEAMS.find((t) => t.id === TEAM_NAME_TO_ID[myTeamGame.awayTeam]) : null;
  const homeTeam = myTeamGame ? KBO_TEAMS.find((t) => t.id === TEAM_NAME_TO_ID[myTeamGame.homeTeam]) : null;

  // 최근 전적 계산 (이번 달 내 팀 경기 결과)
  const myTeamResults = schedules
    .filter(
      (m) =>
        (m.status === 'finished' || m.status === 'cancelled') &&
        (TEAM_NAME_TO_ID[m.homeTeam] === myTeam.id || TEAM_NAME_TO_ID[m.awayTeam] === myTeam.id) &&
        (m.date !== todayStr || m.status === 'cancelled' || isClearlyFinishedGame(m, todayStr))
    )
    .slice(-5)
    .map((m) => {
      if (m.status === 'cancelled') return '무';
      const isMyTeamHome = TEAM_NAME_TO_ID[m.homeTeam] === myTeam.id;
      const myScore = isMyTeamHome ? m.homeScore! : m.awayScore!;
      const oppScore = isMyTeamHome ? m.awayScore! : m.homeScore!;
      return myScore > oppScore ? '승' : myScore < oppScore ? '패' : '무';
    });

  // 오늘 날짜 포맷
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const dateDisplay = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일 (${days[today.getDay()]})`;

  const extendedSchedules = [
    ...previousSeasonSeptemberSchedules.map((game) => ({ ...game, seasonYear: previousSeasonYear })),
    ...previousSeasonOctoberSchedules.map((game) => ({ ...game, seasonYear: previousSeasonYear })),
    ...previousMonthSchedules.map((game) => ({ ...game, seasonYear: previousMonthDate.getFullYear() })),
    ...schedules.map((game) => ({ ...game, seasonYear: today.getFullYear() })),
  ].filter(
    (game, index, array) =>
      array.findIndex(
        (candidate) =>
          candidate.date === game.date &&
          candidate.awayTeam === game.awayTeam &&
          candidate.homeTeam === game.homeTeam &&
          candidate.time === game.time
      ) === index
  );

  const recentSeriesResults =
    myTeam && opponentName
      ? getRecentSeriesResults(extendedSchedules, myTeam.id, opponentName)
      : [];

  const cancelledMessage = myTeamGame?.note?.includes('우천취소')
    ? '해당 경기는 우천취소 되었습니다'
    : myTeamGame?.status === 'cancelled'
      ? `해당 경기는 ${myTeamGame.note || '취소'} 되었습니다`
      : null;
  const shouldWaitForWeather =
    Boolean(myTeamGame) &&
    myTeamGame?.status === 'scheduled' &&
    weatherLoading;

  return (
    <div className="container">
      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '24px', color: myTeam.color }}>오늘의 {myTeam.name}</h2>
          <p style={{ color: 'var(--text-light)', fontSize: '14px' }}>{dateDisplay}</p>
        </div>
        <TeamLogo team={myTeam} size={40} />
      </header>

      {/* Loading State */}
      {(loading || shouldWaitForWeather) && (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            style={{ display: 'inline-block' }}
          >
            <Loader2 size={32} color="var(--primary)" />
          </motion.div>
          <p style={{ color: 'var(--text-light)', marginTop: '12px', fontSize: '14px' }}>
            경기 정보를 불러오고 있어요... ⚾
          </p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && !shouldWaitForWeather && (
        <div className="card" style={{ textAlign: 'center', padding: '32px 20px' }}>
          <p style={{ fontSize: '16px', marginBottom: '8px' }}>😢</p>
          <p style={{ color: 'var(--text-light)', fontSize: '14px' }}>{error}</p>
        </div>
      )}

      {/* No Game Today */}
      {!loading && !shouldWaitForWeather && !error && !myTeamGame && (
        <div className="card" style={{ textAlign: 'center', padding: '32px 20px' }}>
          <p style={{ fontSize: '48px', marginBottom: '12px' }}>😴</p>
          <p style={{ fontWeight: '800', fontSize: '18px', marginBottom: '4px' }}>오늘은 경기가 없어요</p>
          <p style={{ color: 'var(--text-light)', fontSize: '14px' }}>대진표에서 다음 경기를 확인해보세요!</p>
        </div>
      )}

      {/* Today's Match Card */}
      {!loading && !shouldWaitForWeather && myTeamGame && (
        <>
          <motion.div
            className="card"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ background: `linear-gradient(135deg, ${myTeam.bgSecondary} 0%, #ffffff 100%)`, border: `2px solid ${myTeam.color}20` }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px', fontWeight: 'bold', color: myTeam.color }}>
                  <MapPin size={16} />
                  <span>{myTeamGame.stadium}</span>
                </div>
                {weather && (
                  <div
                    style={{
                      fontSize: '12px',
                      color: 'var(--text-light)',
                      background: 'rgba(255,255,255,0.75)',
                      padding: '4px 10px',
                      borderRadius: '9999px',
                      fontWeight: 700,
                    }}
                  >
                    {Math.round(weather.temperature ?? 0)}℃ · 강수 {weather.precipitationProbability ?? 0}%
                  </div>
                )}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-light)', background: 'var(--border)', padding: '4px 10px', borderRadius: '12px', fontWeight: 600 }}>
                {myTeamGame.day}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', margin: '20px 0' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
                  <TeamLogo team={awayTeam} size={46} />
                </div>
                <div style={{ fontWeight: '800' }}>{myTeamGame.awayTeam}</div>
              </div>
                <div style={{ textAlign: 'center' }}>
                {isTodayGameActuallyFinished ? (
                  <div style={{ fontSize: '28px', fontWeight: '800' }}>
                    <span style={{ color: (myTeamGame.awayScore ?? 0) > (myTeamGame.homeScore ?? 0) ? 'var(--success)' : 'var(--text-light)' }}>
                      {myTeamGame.awayScore}
                    </span>
                    <span style={{ color: 'var(--border)', margin: '0 8px' }}>:</span>
                    <span style={{ color: (myTeamGame.homeScore ?? 0) > (myTeamGame.awayScore ?? 0) ? 'var(--success)' : 'var(--text-light)' }}>
                      {myTeamGame.homeScore}
                    </span>
                  </div>
                ) : isTodayGameCancelled ? (
                  <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--error)' }}>취소</div>
                ) : (
                  <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--border)' }}>VS</div>
                )}
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
                  <TeamLogo team={homeTeam} size={46} />
                </div>
                <div style={{ fontWeight: '800' }}>{myTeamGame.homeTeam}</div>
                <div style={{ fontSize: '12px', color: 'white', background: 'var(--primary)', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold', display: 'inline-block', marginTop: '4px' }}>홈</div>
              </div>
            </div>

            <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.5)', padding: '10px', borderRadius: 'var(--radius-sm)', fontSize: '14px' }}>
              {isTodayGameActuallyFinished ? (
                <span>
                  경기 종료 — {' '}
                  {(() => {
                    const isMyHome = TEAM_NAME_TO_ID[myTeamGame.homeTeam] === myTeam.id;
                    const myScore = isMyHome ? myTeamGame.homeScore! : myTeamGame.awayScore!;
                    const oppScore = isMyHome ? myTeamGame.awayScore! : myTeamGame.homeScore!;
                    if (myScore > oppScore) return <strong style={{ color: 'var(--success)' }}>승리! 🎉</strong>;
                    if (myScore < oppScore) return <strong style={{ color: 'var(--error)' }}>패배 😢</strong>;
                    return <strong>무승부</strong>;
                  })()}
                </span>
              ) : isTodayGameCancelled ? (
                <strong style={{ color: 'var(--error)' }}>{cancelledMessage}</strong>
              ) : (
                <span>오늘 경기 <strong>{myTeamGame.time}</strong> 시작!</span>
              )}
            </div>
          </motion.div>

          {/* Attendance Toggle */}
          {!shouldShowFinishedState && (
            <>
              <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: '16px' }}>오늘 직관 가시나요?</h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-light)' }}>체크하면 꿀팁을 알려드려요!</p>
                </div>
                <button
                  onClick={() => {
                    if (!myTeamGame) return;
                    setAttendanceForGame(myTeam.id, todayFullDate, myTeamGame.stadium, !isGoingToday);
                  }}
                  style={{
                    width: '60px',
                    height: '32px',
                    background: isGoingToday ? 'var(--success)' : 'var(--border)',
                    borderRadius: '20px',
                    position: 'relative',
                    padding: '4px',
                  }}
                >
                  <motion.div
                    animate={{ x: isGoingToday ? 28 : 0 }}
                    style={{ width: '24px', height: '24px', background: 'white', borderRadius: '50%', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                  />
                </button>
              </div>

              {isGoingToday && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  style={{ marginBottom: '16px' }}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <button className="card" style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, padding: '12px' }}>
                      <Navigation size={20} color="var(--primary)" />
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontSize: '14px', fontWeight: 'bold' }}>가는 길</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>대중교통</div>
                      </div>
                    </button>
                    <button className="card" style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, padding: '12px' }}>
                      <Info size={20} color="var(--primary)" />
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontSize: '14px', fontWeight: 'bold' }}>맛도리 정보</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>구장 주변</div>
                      </div>
                    </button>
                  </div>
                </motion.div>
              )}
            </>
          )}

          {/* Starting Lineup & Pitcher */}
          {lineup && myTeamGame.status !== 'cancelled' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card" style={{ marginBottom: '16px' }}>
              <div style={{ marginBottom: '12px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 800 }}>오늘의 선발 라인업</h3>
              </div>
              <LineupPanel
                title={`${myTeam.name} 선발 투수 및 라인업`}
                pitcher={lineup.startingPitcher}
                battingOrder={lineup.battingOrder}
                isLineupOut={lineup.isLineupOut}
                accentColor={myTeam.color}
                roster={roster}
              />

              <div
                style={{
                  textAlign: 'center',
                  fontSize: '22px',
                  fontWeight: 800,
                  color: 'var(--text)',
                  margin: '4px 0 18px',
                }}
              >
                VS
              </div>

              <LineupPanel
                title={`${lineup.opponentTeamName ?? '상대 팀'} 선발 투수 및 라인업`}
                pitcher={lineup.opponentStartingPitcher}
                battingOrder={lineup.opponentBattingOrder}
                isLineupOut={lineup.isLineupOut}
                accentColor={lineupOpponentTeam?.color ?? 'var(--primary)'}
              />
            </motion.div>
          )}

          {/* Roster Changes */}
          {roster && (roster.callUps.length > 0 || roster.sendDowns.length > 0) && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card" style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '16px' }}>오늘의 1군 엔트리 변동</h3>
              </div>
              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: 'bold', marginBottom: '8px' }}>등록 (콜업)</div>
                  {roster.callUps.length > 0 ? roster.callUps.map((p, i) => (
                    <div key={i} style={{ fontSize: '13px', marginBottom: '4px' }}>{p.name} <span style={{ color: 'var(--text-light)', fontSize: '11px' }}>({p.position})</span></div>
                  )) : <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>없음</div>}
                </div>
                <div style={{ width: '1px', background: 'var(--border)' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12px', color: 'var(--error)', fontWeight: 'bold', marginBottom: '8px' }}>말소 (강등)</div>
                  {roster.sendDowns.length > 0 ? roster.sendDowns.map((p, i) => (
                    <div key={i} style={{ fontSize: '13px', marginBottom: '4px' }}>{p.name} <span style={{ color: 'var(--text-light)', fontSize: '11px' }}>({p.position})</span></div>
                  )) : <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>없음</div>}
                </div>
              </div>
            </motion.div>
          )}
        </>
      )}

      {/* Form Summary */}
      {!loading && (myTeamResults.length > 0 || (opponentName && recentSeriesResults.length > 0)) && (
        <div style={{ marginBottom: '16px' }}>
          <h3 style={{ fontSize: '18px', marginBottom: '12px' }}>
            {myTeam.name} 이기고 있나요?
          </h3>

          {myTeamResults.length > 0 && (
            <div className="card" style={{ padding: '20px', marginBottom: '16px' }}>
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '18px', fontWeight: 800, marginBottom: '4px' }}>
                  {myTeam.name} 최근 전적
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-light)' }}>
                  최근 {myTeamResults.length}경기
                </div>
              </div>
              <ResultBadgeRow results={myTeamResults} />
            </div>
          )}

          {opponentName && recentSeriesResults.length > 0 && (
            <div className="card" style={{ padding: '20px' }}>
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '18px', fontWeight: 800, marginBottom: '4px' }}>
                  상대 전적 (vs {opponentName})
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-light)' }}>
                  최근 시리즈
                </div>
              </div>
              <ResultBadgeRow results={recentSeriesResults} />
            </div>
          )}
        </div>
      )}

      {/* Quick Links */}
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => router.push('/schedule')}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ fontSize: '24px' }}>🗓️</div>
          <div>
            <div style={{ fontWeight: 'bold' }}>대진표 보기</div>
            <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>이번 달 전체 일정</div>
          </div>
        </div>
        <ChevronRight size={20} color="var(--border)" />
      </div>
    </div>
  );
}
