'use client';

import { useTeam } from '@/context/TeamContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Navigation, Info, Loader2 } from 'lucide-react';
import { getTodayDateString } from '@/hooks/useKboSchedule';
import { useGameScheduleMonth } from '@/hooks/useGameScheduleMonth';
import { useTodayGameSchedule } from '@/hooks/useTodayGameSchedule';
import { useHeadToHeadRecord } from '@/hooks/useHeadToHeadRecord';
import { RosterData, useGameWeather, useKboLineup, useKboRoster } from '@/hooks/useKboExtra';
import { KboLineupData, TEAM_NAME_TO_ID } from '@/lib/kboScraper';
import { KBO_TEAMS } from '@/data/teams';
import TeamLogo from '@/components/TeamLogo';
import { formatDiaryDate } from '@/lib/fanDiary';
import { findAttendanceRecord, setAttendanceForGame, useAttendanceRecords } from '@/lib/attendance';

const FIELD_POSITIONS = {
  dh: { label: 'DH', left: '13%', top: '82%', scale: 1.04 },
  lf: { label: 'LF', left: '16%', top: '22%', scale: 0.9 },
  cf: { label: 'CF', left: '50%', top: '10%', scale: 0.88 },
  rf: { label: 'RF', left: '84%', top: '22%', scale: 0.9 },
  ss: { label: 'SS', left: '34%', top: '43%', scale: 0.95 },
  second: { label: '2B', left: '66%', top: '43%', scale: 0.95 },
  third: { label: '3B', left: '19%', top: '58%', scale: 1 },
  first: { label: '1B', left: '81%', top: '58%', scale: 1 },
  p: { label: 'P', left: '50%', top: '55%', scale: 1 },
  c: { label: 'C', left: '50%', top: '87%', scale: 1.06 },
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
  roster?: RosterData | null;
}

function PlayerBadge({
  label,
  name,
  left,
  top,
  scale = 1,
}: {
  label: string;
  name: string;
  left: string;
  top: string;
  scale?: number;
}) {
  return (
    <div
      style={{
        position: 'absolute',
        left,
        top,
        transform: `translate(-50%, -50%) scale(${scale})`,
        zIndex: 10,
        minWidth: '44px',
        minHeight: '44px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          background: 'rgba(24, 32, 24, 0.9)',
          backdropFilter: 'blur(6px)',
          color: '#f5f5f5',
          padding: 'clamp(4px, 0.7vw, 7px) clamp(7px, 1.2vw, 12px)',
          borderRadius: '12px',
          boxShadow: '0 6px 16px rgba(0, 0, 0, 0.2)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          whiteSpace: 'nowrap',
          maxWidth: '112px',
        }}
      >
        <span
          style={{
            color: '#fbbf24',
            fontSize: 'clamp(8px, 2vw, 10px)',
            fontWeight: 900,
            letterSpacing: '0.08em',
            lineHeight: 1,
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontSize: 'clamp(10px, 2.8vw, 12px)',
            fontWeight: 800,
            lineHeight: 1,
          }}
        >
          {name}
        </span>
      </div>
    </div>
  );
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
                aspectRatio: '16 / 9',
                borderRadius: '24px',
                overflow: 'hidden',
                background: '#3f6f34',
                border: '1px solid rgba(43, 64, 34, 0.45)',
                boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08)',
                marginBottom: '16px',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background:
                    'repeating-linear-gradient(0deg, rgba(255,255,255,0.04) 0 2px, rgba(0,0,0,0) 2px 14px)',
                  opacity: 0.35,
                  zIndex: 1,
                }}
              />

              <div
                style={{
                  position: 'absolute',
                  left: '-2%',
                  bottom: '16%',
                  width: '48%',
                  height: '2px',
                  background: 'rgba(255, 255, 255, 0.55)',
                  transform: 'rotate(36deg)',
                  transformOrigin: 'left center',
                  zIndex: 3,
                }}
              />

              <div
                style={{
                  position: 'absolute',
                  right: '-2%',
                  bottom: '16%',
                  width: '48%',
                  height: '2px',
                  background: 'rgba(255, 255, 255, 0.55)',
                  transform: 'rotate(-36deg)',
                  transformOrigin: 'right center',
                  zIndex: 3,
                }}
              />

              <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  zIndex: 2,
                }}
              >
                <path
                  d="M24 58 L50 34 L76 58 Q68 71 50 84 Q32 71 24 58 Z"
                  fill="#b99674"
                  stroke="rgba(89, 44, 23, 0.3)"
                  strokeWidth="0.4"
                />
                <path
                  d="M33 58 L50 41 L67 58 Q61.5 66.5 50 75 Q38.5 66.5 33 58 Z"
                  fill="#3f6f34"
                />
                <circle cx="50" cy="55" r="6.8" fill="#9f7a59" />
              </svg>

              {[
                { left: '50%', top: '34%' },
                { left: '76%', top: '58%' },
                { left: '50%', top: '84%' },
                { left: '24%', top: '58%' },
              ].map((base, index) => (
                <div
                  key={index}
                  style={{
                    position: 'absolute',
                    left: base.left,
                    top: base.top,
                    width: index === 2 ? '40px' : '26px',
                    height: index === 2 ? '40px' : '26px',
                    background: index === 2 ? '#c6a88c' : '#b99674',
                    borderRadius: '9999px',
                    transform: 'translate(-50%, -50%)',
                    zIndex: 5,
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      left: '50%',
                      top: '50%',
                      width: index === 2 ? '12px' : '10px',
                      height: index === 2 ? '12px' : '10px',
                      background: 'rgba(255,255,255,0.98)',
                      transform: 'translate(-50%, -50%) rotate(45deg)',
                      borderRadius: '2px',
                    }}
                  />
                </div>
              ))}

              <div
                style={{
                  position: 'absolute',
                  left: '50%',
                  bottom: '12%',
                  width: '15px',
                  height: '15px',
                  background: 'rgba(255,255,255,0.96)',
                  clipPath: 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)',
                  transform: 'translateX(-50%)',
                  zIndex: 6,
                }}
              />

              {fieldPlayers.map((batter) => (
                <PlayerBadge
                  key={`${batter.order}-${batter.name}-field`}
                  label={batter.field.label}
                  name={batter.name}
                  left={batter.field.left}
                  top={batter.field.top}
                  scale={batter.field.scale}
                />
              ))}

              <PlayerBadge
                label={FIELD_POSITIONS.p.label}
                name={pitcher?.name ?? '-'}
                left={FIELD_POSITIONS.p.left}
                top={FIELD_POSITIONS.p.top}
                scale={FIELD_POSITIONS.p.scale}
              />
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
  items: Array<{
    result: string;
    opponent?: string;
  }>;
}

function ResultBadgeRow({ items }: ResultBadgeRowProps) {
  return (
    <div
      style={{
        background: 'var(--background)',
        borderRadius: 'var(--radius-sm)',
        padding: '4px',
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: '8px',
          width: '100%',
        }}
      >
        {items.map((item, index) => (
          <motion.div
            key={`${item.result}-${item.opponent ?? 'none'}-${index}`}
            whileHover={{ y: -4 }}
            transition={{ duration: 0.15 }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 1,
              minWidth: 0,
              padding: '10px 4px',
              borderRadius: '12px',
              borderBottom: `2px solid ${
                item.result === '승'
                  ? 'rgba(167, 243, 208, 1)'
                  : item.result === '패'
                    ? 'rgba(254, 205, 211, 1)'
                    : 'rgba(203, 213, 225, 1)'
              }`,
              background:
                item.result === '승'
                  ? 'rgba(209, 250, 229, 1)'
                  : item.result === '패'
                    ? 'rgba(255, 228, 230, 1)'
                    : 'rgba(241, 245, 249, 1)',
              color:
                item.result === '승'
                  ? 'rgba(5, 150, 105, 1)'
                  : item.result === '패'
                    ? 'rgba(225, 29, 72, 1)'
                    : 'rgba(71, 85, 105, 1)',
              cursor: 'pointer',
            }}
          >
            <div
              style={{
                fontSize: '18px',
                fontWeight: 900,
                lineHeight: 1,
              }}
            >
              {item.result}
            </div>
            {item.opponent && (
              <div
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  lineHeight: 1,
                  marginTop: '2px',
                  opacity: 0.6,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '100%',
                }}
              >
                {item.opponent}
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
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

function HeadToHeadSummary({
  total,
  win,
  loss,
  draw,
}: {
  total: number;
  win: number;
  loss: number;
  draw: number;
}) {
  return (
    <div
      style={{
        background: 'var(--background)',
        borderRadius: 'var(--radius-sm)',
        padding: '22px 16px',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text)', marginBottom: '14px' }}>
        총 {total}경기
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '10px',
          flexWrap: 'wrap',
        }}
      >
        {[
          { label: '승', value: win, color: 'var(--success)', background: 'rgba(34, 197, 94, 0.12)' },
          { label: '패', value: loss, color: 'var(--error)', background: 'rgba(239, 68, 68, 0.12)' },
          { label: '무', value: draw, color: 'var(--text-light)', background: 'rgba(148, 163, 184, 0.16)' },
        ].map((item) => (
          <div
            key={item.label}
            style={{
              minWidth: '78px',
              padding: '12px 12px 14px',
              borderRadius: '14px',
              background: item.background,
              border: '1px solid rgba(15, 23, 42, 0.04)',
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 800, color: item.color, marginBottom: '4px' }}>
              {item.label}
            </div>
            <div style={{ fontSize: '20px', fontWeight: 900, color: item.color }}>{item.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { myTeam } = useTeam();
  const router = useRouter();
  const today = new Date();
  const { schedules } = useGameScheduleMonth(
    today.getFullYear(),
    today.getMonth() + 1
  );
  const {
    schedule: todayGameSchedule,
    loading: todayGameScheduleLoading,
    error: todayGameScheduleError,
  } = useTodayGameSchedule(myTeam?.id);
  const attendanceRecords = useAttendanceRecords();
  const previousSeasonYear = today.getFullYear() - 1;
  const todayStr = getTodayDateString();
  const { lineup } = useKboLineup(myTeam?.id, todayStr);
  const { roster } = useKboRoster(myTeam?.id);

  useEffect(() => {
    if (!myTeam) {
      router.push('/');
    }
  }, [myTeam, router]);

  // 오늘 내 팀 경기 찾기
  const myTeamGame = todayGameSchedule;
  const { weather, loaded: weatherLoaded } = useGameWeather(myTeamGame?.stadium, myTeamGame?.time);
  const opponentName = myTeamGame
    ? TEAM_NAME_TO_ID[myTeamGame.homeTeam] === myTeam?.id
      ? myTeamGame.awayTeam
      : myTeamGame.homeTeam
    : null;
  const opponentTeamId = opponentName ? TEAM_NAME_TO_ID[opponentName] : undefined;
  const {
    record: lastSeasonHeadToHeadRecord,
    loading: headToHeadLoading,
  } = useHeadToHeadRecord(myTeam?.id, opponentTeamId, previousSeasonYear);

  if (!myTeam) return null;
  const todayFullDate = formatDiaryDate(today.getFullYear(), todayStr);
  const todayAttendanceRecord = findAttendanceRecord(attendanceRecords, myTeam.id, todayFullDate);
  const isGoingToday = todayAttendanceRecord?.isAttending ?? false;
  const isTodayGameActuallyFinished = myTeamGame ? isClearlyFinishedGame(myTeamGame, todayStr) : false;
  const isTodayGameCancelled = myTeamGame?.status === 'cancelled';
  const shouldShowFinishedState = Boolean(myTeamGame) && (isTodayGameCancelled || isTodayGameActuallyFinished);

  // 상대 팀 정보 가져오기
  const lineupOpponentTeamName = lineup?.opponentTeamName ?? '';
  const lineupOpponentTeam = lineupOpponentTeamName
    ? KBO_TEAMS.find((team) => team.id === TEAM_NAME_TO_ID[lineupOpponentTeamName])
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
      const isMyTeamHome = TEAM_NAME_TO_ID[m.homeTeam] === myTeam.id;
      const opponent = isMyTeamHome ? m.awayTeam : m.homeTeam;
      if (m.status === 'cancelled') {
        return {
          result: '무',
          opponent,
        };
      }
      const myScore = isMyTeamHome ? m.homeScore! : m.awayScore!;
      const oppScore = isMyTeamHome ? m.awayScore! : m.homeScore!;
      return {
        result: myScore > oppScore ? '승' : myScore < oppScore ? '패' : '무',
        opponent,
      };
    });

  // 오늘 날짜 포맷
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const dateDisplay = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일 (${days[today.getDay()]})`;

  const cancelledMessage = myTeamGame?.note?.includes('우천취소')
    ? '해당 경기는 우천취소 되었습니다'
    : myTeamGame?.status === 'cancelled'
      ? `해당 경기는 ${myTeamGame.note || '취소'} 되었습니다`
      : null;
  const dashboardLoading =
    todayGameScheduleLoading ||
    Boolean(myTeamGame?.stadium && !weatherLoaded);

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
      {dashboardLoading && (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            style={{ display: 'inline-block' }}
          >
            <Loader2 size={32} color="var(--primary)" />
          </motion.div>
          <p style={{ color: 'var(--text-light)', marginTop: '12px', fontSize: '14px' }}>
            오늘의 야구 정보를 가져오는 중입니다... ⚾
          </p>
        </div>
      )}

      {/* Error State */}
      {todayGameScheduleError && !dashboardLoading && (
        <div className="card" style={{ textAlign: 'center', padding: '32px 20px' }}>
          <p style={{ fontSize: '16px', marginBottom: '8px' }}>😢</p>
          <p style={{ color: 'var(--text-light)', fontSize: '14px' }}>{todayGameScheduleError}</p>
        </div>
      )}

      {/* No Game Today */}
      {!dashboardLoading && !todayGameScheduleError && !myTeamGame && (
        <div className="card" style={{ textAlign: 'center', padding: '32px 20px' }}>
          <p style={{ fontSize: '48px', marginBottom: '12px' }}>😴</p>
          <p style={{ fontWeight: '800', fontSize: '18px', marginBottom: '4px' }}>오늘은 경기가 없어요</p>
          <p style={{ color: 'var(--text-light)', fontSize: '14px' }}>대진표에서 다음 경기를 확인해보세요!</p>
        </div>
      )}

      {/* Today's Match Card */}
      {!dashboardLoading && myTeamGame && (
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
                    {Math.round(weather.temperature ?? 0)}℃ · 강수 {(weather.precipitation ?? 0).toFixed(1)}mm · 미세먼지 {weather.airQualityLabel ?? '-'}
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
                {isTodayGameCancelled ? (
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
              {isTodayGameCancelled ? (
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
                isLineupOut={Boolean(lineup.isLineupOut)}
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
                isLineupOut={Boolean(lineup.isLineupOut)}
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
      {!dashboardLoading && (myTeamResults.length > 0 || (opponentName && lastSeasonHeadToHeadRecord && lastSeasonHeadToHeadRecord.total > 0) || headToHeadLoading) && (
        <div style={{ marginBottom: '16px' }}>
          <h3 style={{ fontSize: '18px', marginBottom: '14px' }}>
            {myTeam.name} 이기고 있나요?
          </h3>

          {myTeamResults.length > 0 && (
            <div className="card" style={{ padding: '20px', marginBottom: '18px' }}>
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '18px', fontWeight: 800, marginBottom: '4px' }}>
                  {myTeam.name} 최근 전적
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-light)' }}>
                  최근 {myTeamResults.length}경기 결과
                </div>
              </div>
              <div
                style={{
                  border: '1px solid rgba(15, 23, 42, 0.08)',
                  borderRadius: '18px',
                  padding: '20px 14px',
                  background: 'rgba(255,255,255,0.4)',
                }}
              >
                <ResultBadgeRow items={myTeamResults} />
              </div>
            </div>
          )}

          {opponentName && (
            <>
              <h3 style={{ fontSize: '18px', marginBottom: '14px' }}>
                {myTeam.name} 이길 수 있나요?
              </h3>
              <div className="card" style={{ padding: '20px' }}>
                <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '18px', fontWeight: 800, marginBottom: '4px' }}>
                  상대 전적 (vs {opponentName})
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-light)' }}>
                  지난 정규시즌 기준 누적 전적
                </div>
              </div>
                <div
                  style={{
                    border: '1px solid rgba(15, 23, 42, 0.08)',
                    borderRadius: '18px',
                    padding: '20px 14px',
                  background: 'rgba(255,255,255,0.4)',
                  }}
                >
                  {headToHeadLoading ? (
                    <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-light)', fontSize: '14px' }}>
                      상대 전적을 불러오고 있어요...
                    </div>
                  ) : lastSeasonHeadToHeadRecord && lastSeasonHeadToHeadRecord.total > 0 ? (
                    <HeadToHeadSummary {...lastSeasonHeadToHeadRecord} />
                  ) : (
                    <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-light)', fontSize: '14px' }}>
                      아직 저장된 지난 시즌 전적이 없습니다.
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
