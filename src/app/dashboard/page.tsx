'use client';

import { useTeam } from '@/context/TeamContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BusFront, Check, ChevronRight, MapPin, Utensils } from 'lucide-react';
import { getTodayDateString } from '@/hooks/useKboSchedule';
import { useGameScheduleMonth } from '@/hooks/useGameScheduleMonth';
import { useTodayGameSchedule } from '@/hooks/useTodayGameSchedule';
import { useHeadToHeadRecord } from '@/hooks/useHeadToHeadRecord';
import { LineupData, useKboLineup, useKboRoster } from '@/hooks/useKboExtra';
import { TEAM_NAME_TO_ID } from '@/lib/kboScraper';
import { KBO_TEAMS, Team } from '@/data/teams';
import TeamLogo from '@/components/TeamLogo';
import { formatDiaryDate } from '@/lib/fanDiary';
import { findAttendanceRecord, setAttendanceForGame, useAttendanceRecords } from '@/lib/attendance';

function toPositionCode(position: string) {
  switch (position) {
    case '지명타자':
      return 'DH';
    case '좌익수':
      return 'LF';
    case '중견수':
      return 'CF';
    case '우익수':
      return 'RF';
    case '유격수':
      return 'SS';
    case '2루수':
      return '2B';
    case '3루수':
      return '3B';
    case '1루수':
      return '1B';
    case '포수':
      return 'C';
    case '투수':
      return 'P';
    default:
      return position || '-';
  }
}

function getTeamFullName(teamName: string | null | undefined) {
  if (!teamName) return '';
  const teamId = TEAM_NAME_TO_ID[teamName];
  return KBO_TEAMS.find((team) => team.id === teamId)?.fullName ?? teamName;
}

const STADIUM_DISPLAY_NAMES: Record<string, string> = {
  잠실: '잠실야구장',
  문학: 'SSG랜더스필드',
  사직: '사직야구장',
  고척: '고척스카이돔',
  대전: '한화생명볼파크',
  수원: 'KT위즈파크',
  대구: '삼성 라이온즈 파크',
  광주: '기아 챔피언스 필드',
  창원: '창원NC파크',
};

function getStadiumDisplayName(stadiumName: string | null | undefined) {
  if (!stadiumName) return '';
  return STADIUM_DISPLAY_NAMES[stadiumName] ?? stadiumName;
}

interface MatchupLineupCardProps {
  game: NonNullable<ReturnType<typeof useTodayGameSchedule>['schedule']>;
  leftTeam: Team | null | undefined;
  rightTeam: Team | null | undefined;
  lineup: LineupData;
}

interface PitcherMatchupRowsProps {
  leftTeam: Team | null | undefined;
  rightTeam: Team | null | undefined;
  leftPitcher: LineupData['startingPitcher'];
  rightPitcher: LineupData['startingPitcher'];
}

const dashboardLoadingMessages = [
  '경기 정보를 불러오는 중입니다...',
  '라인업 데이터를 업데이트 중입니다...',
  '최근 전적을 동기화하고 있습니다...',
  '잠시만 기다려주세요...',
];

function SkeletonBlock({
  width,
  height,
  radius = '999px',
  delay = '0s',
}: {
  width: string;
  height: string;
  radius?: string;
  delay?: string;
}) {
  return (
    <div
      className="dashboard-skeleton-pulse"
      style={{
        width,
        height,
        borderRadius: radius,
        background: '#E2E8F0',
        animationDelay: delay,
      }}
    />
  );
}

function DashboardLoadingState() {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setMessageIndex((current) => (current + 1) % dashboardLoadingMessages.length);
    }, 2000);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <section
      aria-live="polite"
      aria-busy="true"
      style={{
        position: 'relative',
        minHeight: '420px',
        borderRadius: '20px',
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'grid', gap: '12px' }}>
        <div
          className="card"
          style={{
            padding: '14px',
            marginBottom: 0,
            boxShadow: '0 8px 24px rgba(15, 23, 42, 0.05)',
          }}
        >
          <div
            style={{
              borderRadius: '16px',
              background: '#F1F5F9',
              padding: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '14px',
              marginBottom: '16px',
            }}
          >
            <SkeletonBlock width="42%" height="16px" delay="0s" />
            <SkeletonBlock width="56px" height="22px" delay="0.075s" />
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr) 48px minmax(0, 1fr)',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '16px',
            }}
          >
            <div style={{ display: 'grid', justifyItems: 'center', gap: '8px' }}>
              <SkeletonBlock width="46px" height="46px" radius="16px" delay="0.15s" />
              <SkeletonBlock width="50px" height="15px" delay="0.075s" />
              <SkeletonBlock width="30px" height="17px" delay="0.15s" />
            </div>
            <SkeletonBlock width="42px" height="16px" delay="0.075s" />
            <div style={{ display: 'grid', justifyItems: 'center', gap: '8px' }}>
              <SkeletonBlock width="46px" height="46px" radius="16px" delay="0.15s" />
              <SkeletonBlock width="50px" height="15px" delay="0.075s" />
              <SkeletonBlock width="30px" height="17px" delay="0.15s" />
            </div>
          </div>

          <SkeletonBlock width="100%" height="38px" radius="14px" delay="0.15s" />
        </div>

        <div className="card" style={{ padding: '16px 14px', marginBottom: 0 }}>
          <div style={{ display: 'grid', justifyItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <SkeletonBlock width="128px" height="21px" delay="0s" />
            <SkeletonBlock width="100%" height="54px" radius="16px" delay="0.075s" />
          </div>

          <div style={{ display: 'grid', gap: '8px' }}>
            {[0, 1, 2, 3].map((item) => (
              <div
                key={item}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 82px 1fr',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <SkeletonBlock width="100%" height="13px" delay={`${item * 0.075}s`} />
                <SkeletonBlock width="72px" height="20px" delay={`${item * 0.075}s`} />
                <SkeletonBlock width="100%" height="13px" delay={`${item * 0.075}s`} />
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{ padding: '14px', marginBottom: 0 }}>
          <SkeletonBlock width="46%" height="16px" delay="0s" />
          <div style={{ height: '10px' }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '8px' }}>
            <SkeletonBlock width="100%" height="52px" radius="12px" delay="0.075s" />
            <SkeletonBlock width="100%" height="52px" radius="12px" delay="0.15s" />
            <SkeletonBlock width="100%" height="52px" radius="12px" delay="0.225s" />
          </div>
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(255, 255, 255, 0.6)',
          backdropFilter: 'blur(2px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          padding: '20px',
        }}
      >
        <div style={{ display: 'grid', justifyItems: 'center', gap: '8px' }}>
          <div className="dashboard-baseball-bounce" style={{ fontSize: '42px', lineHeight: 1 }}>
            <span className="dashboard-baseball-spin" style={{ display: 'inline-block' }}>
              ⚾
            </span>
          </div>
          <div
            className="dashboard-ball-shadow"
            style={{
              width: '36px',
              height: '7px',
              borderRadius: '999px',
              background: '#CBD5E1',
              filter: 'blur(2px)',
            }}
          />
        </div>

        <div
          style={{
            minHeight: '38px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '999px',
            background: 'rgba(241, 245, 249, 0.92)',
            color: '#4E5968',
            padding: '0 16px',
            boxShadow: '0 8px 18px rgba(15, 23, 42, 0.08)',
            border: '1px solid rgba(226, 232, 240, 0.9)',
          }}
        >
          <p
            key={messageIndex}
            className="dashboard-loading-text"
            style={{
              fontSize: '13px',
              fontWeight: 800,
              letterSpacing: 0,
              whiteSpace: 'nowrap',
            }}
          >
            {dashboardLoadingMessages[messageIndex]}
          </p>
        </div>
      </div>
    </section>
  );
}

function PitcherMatchupRows({ leftTeam, rightTeam, leftPitcher, rightPitcher }: PitcherMatchupRowsProps) {
  const rows = [
    { label: '경기 수', left: leftPitcher?.games ?? '-', right: rightPitcher?.games ?? '-' },
    { label: '선발평균이닝', left: leftPitcher?.startInnings ?? '-', right: rightPitcher?.startInnings ?? '-' },
    { label: 'ERA', left: leftPitcher?.era ?? '-', right: rightPitcher?.era ?? '-' },
    { label: 'WHIP', left: leftPitcher?.whip ?? '-', right: rightPitcher?.whip ?? '-' },
    { label: 'WAR', left: leftPitcher?.war ?? '-', right: rightPitcher?.war ?? '-' },
    { label: 'QS', left: leftPitcher?.qs ?? '-', right: rightPitcher?.qs ?? '-' },
  ];

  return (
    <div
      style={{
        borderRadius: '20px',
        background: '#F8FAFC',
        border: '1px solid #EEF2F7',
        padding: '14px',
      }}
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 84px minmax(0, 1fr)', gap: '10px', alignItems: 'center', marginBottom: '12px' }}>
        <div style={{ minWidth: 0, textAlign: 'left' }}>
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#94A3B8', marginBottom: '6px' }}>선발 투수</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '12px', fontWeight: 900, color: leftTeam?.color ?? '#64748B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '5px' }}>
              {leftTeam?.fullName ?? '-'}
            </div>
            <div style={{ fontSize: '20px', lineHeight: 1.12, fontWeight: 900, color: '#191F28', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {leftPitcher?.name ?? '-'}
            </div>
          </div>
          <div style={{ fontSize: '12px', fontWeight: 800, color: '#6B7684', marginTop: '6px' }}>
            시즌 {leftPitcher?.winLoss ?? '-'}
          </div>
        </div>
        <div style={{ textAlign: 'center', fontSize: '11px', fontWeight: 900, color: '#64748B' }}>MATCH</div>
        <div style={{ minWidth: 0, textAlign: 'right' }}>
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#94A3B8', marginBottom: '6px' }}>선발 투수</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '12px', fontWeight: 900, color: rightTeam?.color ?? '#64748B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '5px' }}>
              {rightTeam?.fullName ?? '-'}
            </div>
            <div style={{ fontSize: '20px', lineHeight: 1.12, fontWeight: 900, color: '#191F28', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {rightPitcher?.name ?? '-'}
            </div>
          </div>
          <div style={{ fontSize: '12px', fontWeight: 800, color: '#6B7684', marginTop: '6px' }}>
            시즌 {rightPitcher?.winLoss ?? '-'}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gap: '8px' }}>
        {rows.map((row) => {
          return (
            <div
              key={row.label}
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) 86px minmax(0, 1fr)',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <div
                style={{
                  textAlign: 'right',
                  fontSize: '14px',
                  fontWeight: 900,
                  color: '#4E5968',
                }}
              >
                {row.left}
              </div>
              <div
                style={{
                  height: '24px',
                  borderRadius: '999px',
                  background: '#FFFFFF',
                  border: '1px solid #E5E8EB',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '10px',
                  fontWeight: 900,
                  color: '#8B95A1',
                }}
              >
                {row.label}
              </div>
              <div
                style={{
                  textAlign: 'left',
                  fontSize: '14px',
                  fontWeight: 900,
                  color: '#4E5968',
                }}
              >
                {row.right}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MatchupLineupCard({ game, leftTeam, rightTeam, lineup }: MatchupLineupCardProps) {
  const leftPitcher = lineup.startingPitcher;
  const rightPitcher = lineup.opponentStartingPitcher;
  const leftBattingOrder = lineup.battingOrder;
  const rightBattingOrder = lineup.opponentBattingOrder;
  const lineupRows = Array.from({ length: 9 }, (_, index) => {
    const order = index + 1;
    return {
      order,
      left: leftBattingOrder.find((batter) => batter.order === order),
      right: rightBattingOrder.find((batter) => batter.order === order),
    };
  });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card" style={{ padding: '22px 18px', marginBottom: '16px' }}>
      <div style={{ textAlign: 'center', marginBottom: '18px' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            height: '26px',
            padding: '0 10px',
            borderRadius: '999px',
            background: '#F2F4F6',
            color: '#4E5968',
            fontSize: '11px',
            fontWeight: 900,
            marginBottom: '10px',
          }}
        >
          정규시즌
          <span style={{ width: '3px', height: '3px', borderRadius: '999px', background: '#CBD5E1' }} />
          {game.stadium}
          <span style={{ width: '3px', height: '3px', borderRadius: '999px', background: '#CBD5E1' }} />
          {game.time}
        </div>

      </div>

      <PitcherMatchupRows
        leftTeam={leftTeam}
        rightTeam={rightTeam}
        leftPitcher={leftPitcher}
        rightPitcher={rightPitcher}
      />

      <div style={{ marginTop: '18px' }}>
        <div style={{ fontSize: '15px', fontWeight: 900, color: '#191F28', marginBottom: '12px' }}>선발 라인업</div>

        {!Boolean(lineup.isLineupOut) ? (
          <div
            style={{
              textAlign: 'center',
              padding: '22px 12px',
              borderRadius: '18px',
              background: '#F8FAFC',
              color: '#8B95A1',
              fontSize: '14px',
              fontWeight: 800,
            }}
          >
            아직 라인업이 발표되지 않았습니다.
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '2px' }}>
            {lineupRows.map((row) => (
              <div
                key={row.order}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1fr) 1px minmax(0, 1fr)',
                  alignItems: 'center',
                  gap: '12px',
                  minHeight: '36px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                  <span style={{ flexShrink: 0, width: '22px', height: '22px', borderRadius: '999px', background: leftTeam?.color ?? '#191F28', color: '#FFFFFF', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 900 }}>
                    {row.order}
                  </span>
                  <span style={{ flex: '1 1 auto', minWidth: 0, fontSize: '14px', fontWeight: 900, color: '#191F28', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {row.left?.name ?? '-'}
                  </span>
                  <span style={{ flexShrink: 0, width: '24px', textAlign: 'center', fontSize: '10px', fontWeight: 900, color: '#8B95A1' }}>
                    {row.left ? toPositionCode(row.left.position) : '-'}
                  </span>
                </div>

                <div style={{ width: '1px', height: '18px', background: '#E5E8EB' }} />

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', minWidth: 0 }}>
                  <span style={{ flexShrink: 0, width: '24px', textAlign: 'center', fontSize: '10px', fontWeight: 900, color: '#8B95A1' }}>
                    {row.right ? toPositionCode(row.right.position) : '-'}
                  </span>
                  <span style={{ flex: '1 1 auto', minWidth: 0, textAlign: 'right', fontSize: '14px', fontWeight: 900, color: '#191F28', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {row.right?.name ?? '-'}
                  </span>
                  <span style={{ flexShrink: 0, width: '22px', height: '22px', borderRadius: '999px', background: rightTeam?.color ?? '#191F28', color: '#FFFFFF', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 900 }}>
                    {row.order}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

interface RecentResultItem {
  result: string;
  opponent?: string;
  date?: string;
  score?: string;
}

interface ResultBadgeRowProps {
  items: RecentResultItem[];
}

function getResultColor(result: string) {
  if (result === '승') return '#10B981';
  if (result === '패') return '#F43F5E';
  return '#94A3B8';
}

function ResultBadgeRow({ items }: ResultBadgeRowProps) {
  return (
    <div style={{ position: 'relative', padding: '4px 0 2px' }}>
      <div
        style={{
          position: 'absolute',
          left: '9%',
          right: '9%',
          top: '36px',
          height: '2px',
          background: '#E5E8EB',
        }}
      />
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`, gap: '6px', position: 'relative', zIndex: 1 }}>
        {items.map((item, index) => {
          const color = getResultColor(item.result);

          return (
            <div key={`${item.result}-${item.opponent ?? 'none'}-${item.date ?? index}`} style={{ minWidth: 0, textAlign: 'center' }}>
              <div style={{ fontSize: '10px', fontWeight: 900, color: '#8B95A1', marginBottom: '7px' }}>
                {item.date ?? '-'}
              </div>
              <div
                style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '999px',
                  background: color,
                  color: '#FFFFFF',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '13px',
                  fontWeight: 900,
                  boxShadow: `0 6px 12px ${color}33`,
                  marginBottom: '7px',
                }}
              >
                {item.result}
              </div>
              <div style={{ fontSize: '11px', fontWeight: 900, color: '#4E5968', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.score ?? '-'}
              </div>
              <div style={{ fontSize: '10px', fontWeight: 800, color: '#8B95A1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '2px' }}>
                vs {item.opponent ?? '-'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

type StadiumTip = {
  sourceStadium: string;
  stadiumName: string;
  transport: string;
  foods: Array<{
    vendorName: string;
    mainMenu: string;
  }>;
};

function formatFoodSummary(foods: StadiumTip['foods']) {
  if (!foods.length) return '맛도리 정보를 확인 중이에요.';
  return foods.map((food) => `${food.vendorName} (${food.mainMenu})`).join(', ');
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
  const winRate = total > 0 ? (win / total) * 100 : 0;
  const drawRate = total > 0 ? (draw / total) * 100 : 0;
  const lossRate = Math.max(0, 100 - winRate - drawRate);

  return (
    <div
      style={{
        borderRadius: '20px',
        background: '#F8FAFC',
        border: '1px solid #EEF2F7',
        padding: '18px 16px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px', marginBottom: '14px' }}>
        <div style={{ fontSize: '15px', fontWeight: 900, color: '#191F28' }}>전년도 정규 시즌 성적</div>
        <div style={{ fontSize: '12px', fontWeight: 900, color: '#8B95A1' }}>총 {total}경기</div>
      </div>
      <div
        style={{
          display: 'flex',
          height: '16px',
          overflow: 'hidden',
          borderRadius: '999px',
          background: '#E5E8EB',
          marginBottom: '14px',
        }}
      >
        <div style={{ width: `${winRate}%`, background: '#10B981' }} />
        <div style={{ width: `${drawRate}%`, background: '#94A3B8' }} />
        <div style={{ width: `${lossRate}%`, background: '#F43F5E' }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '8px' }}>
        {[
          { label: '승', value: win, color: '#10B981' },
          { label: '무', value: draw, color: '#94A3B8' },
          { label: '패', value: loss, color: '#F43F5E' },
        ].map((item) => (
          <div
            key={item.label}
            style={{
              minWidth: 0,
              padding: '12px 8px',
              borderRadius: '14px',
              background: '#FFFFFF',
              border: '1px solid #E5E8EB',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 900, color: item.color, marginBottom: '4px' }}>
              {item.label}
            </div>
            <div style={{ fontSize: '20px', fontWeight: 900, color: '#191F28' }}>{item.value}</div>
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
  const previousMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const { schedules } = useGameScheduleMonth(
    today.getFullYear(),
    today.getMonth() + 1
  );
  const { schedules: previousMonthSchedules } = useGameScheduleMonth(
    previousMonth.getFullYear(),
    previousMonth.getMonth() + 1
  );
  const [stadiumTip, setStadiumTip] = useState<StadiumTip | null>(null);
  const {
    schedule: todayGameSchedule,
    loading: todayGameScheduleLoading,
    error: todayGameScheduleError,
  } = useTodayGameSchedule(myTeam?.id);
  const attendanceRecords = useAttendanceRecords();
  const previousSeasonYear = today.getFullYear() - 1;
  const todayStr = getTodayDateString();
  const shouldFetchTodayGameDetails = Boolean(
    myTeam?.id && todayGameSchedule && todayGameSchedule.status !== 'cancelled'
  );
  const todayGameDetailTeamId = shouldFetchTodayGameDetails ? myTeam?.id : undefined;
  const { lineup } = useKboLineup(todayGameDetailTeamId, shouldFetchTodayGameDetails ? todayStr : '');
  const { roster } = useKboRoster(todayGameDetailTeamId);

  useEffect(() => {
    if (!todayGameSchedule?.stadium || todayGameSchedule.status === 'cancelled') {
      return;
    }

    let cancelled = false;
    const requestedStadium = todayGameSchedule.stadium;

    async function fetchStadiumTip() {
      try {
        const params = new URLSearchParams({ stadium: requestedStadium });
        const res = await fetch(`/api/stadium-tip?${params.toString()}`);
        const data = await res.json();

        if (!cancelled) {
          setStadiumTip(data.success ? { ...data.tip, sourceStadium: requestedStadium } : null);
        }
      } catch {
        if (!cancelled) {
          setStadiumTip(null);
        }
      }
    }

    void fetchStadiumTip();

    return () => {
      cancelled = true;
    };
  }, [todayGameSchedule?.stadium, todayGameSchedule?.status]);

  // 오늘 내 팀 경기 찾기
  const myTeamGame = todayGameSchedule;
  const opponentName = myTeamGame
    ? TEAM_NAME_TO_ID[myTeamGame.homeTeam] === myTeam?.id
      ? myTeamGame.awayTeam
      : myTeamGame.homeTeam
    : null;
  const opponentTeamId = opponentName ? TEAM_NAME_TO_ID[opponentName] : undefined;
  const opponentFullName = getTeamFullName(opponentName);
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
  const activeStadiumTip = stadiumTip?.sourceStadium === myTeamGame?.stadium ? stadiumTip : null;
  const todayStadiumDisplayName = activeStadiumTip?.stadiumName ?? getStadiumDisplayName(myTeamGame?.stadium);

  const awayTeam = myTeamGame ? KBO_TEAMS.find((t) => t.id === TEAM_NAME_TO_ID[myTeamGame.awayTeam]) : null;
  const homeTeam = myTeamGame ? KBO_TEAMS.find((t) => t.id === TEAM_NAME_TO_ID[myTeamGame.homeTeam]) : null;
  const isMyTeamHome = myTeamGame ? TEAM_NAME_TO_ID[myTeamGame.homeTeam] === myTeam.id : false;
  const opponentTeam = myTeamGame ? (isMyTeamHome ? awayTeam : homeTeam) : null;

  // 최근 전적 계산 (월초에도 5경기를 채우도록 전달 경기까지 포함)
  const myTeamResults = [...previousMonthSchedules, ...schedules]
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
          date: m.date,
          score: '취소',
        };
      }
      const myScore = isMyTeamHome ? m.homeScore! : m.awayScore!;
      const oppScore = isMyTeamHome ? m.awayScore! : m.homeScore!;
      return {
        result: myScore > oppScore ? '승' : myScore < oppScore ? '패' : '무',
        opponent,
        date: m.date,
        score: `${myScore}:${oppScore}`,
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
  const dashboardLoading = todayGameScheduleLoading;

  return (
    <div className="container">
      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '24px', color: myTeam.color }}>오늘의 {myTeam.fullName}</h2>
          <p style={{ color: 'var(--text-light)', fontSize: '14px' }}>{dateDisplay}</p>
        </div>
        <TeamLogo team={myTeam} size={40} />
      </header>

      {/* Loading State */}
      {dashboardLoading && <DashboardLoadingState />}

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
            style={{
              background: '#FFFFFF',
              border: `1px solid ${myTeam.color}24`,
              boxShadow: '0 8px 24px rgba(15, 23, 42, 0.06)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                margin: '-4px -4px 16px',
                padding: '12px',
                borderRadius: '16px',
                background: myTeam.bgSecondary,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px', fontWeight: 'bold', color: myTeam.color }}>
                  <MapPin size={16} />
                  <span>{myTeamGame.stadium}</span>
                </div>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', background: '#FFFFFF', padding: '4px 10px', borderRadius: '12px', fontWeight: 700 }}>
                {myTeamGame.day}
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) 56px minmax(0, 1fr)',
                alignItems: 'center',
                gap: '10px',
                margin: '20px 0',
              }}
            >
              <div style={{ textAlign: 'center', minWidth: 0 }}>
                <div style={{ height: '54px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
                  <TeamLogo team={myTeam} size={46} />
                </div>
                <div style={{ minHeight: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', lineHeight: 1.2, fontWeight: '800' }}>
                  {myTeam.fullName}
                </div>
                {isMyTeamHome ? (
                  <div style={{ fontSize: '12px', color: 'white', background: myTeam.color, padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold', display: 'inline-block', marginTop: '4px' }}>홈</div>
                ) : (
                  <div aria-hidden style={{ height: '22px', marginTop: '4px' }} />
                )}
              </div>
              <div style={{ textAlign: 'center', alignSelf: 'center', paddingBottom: '20px' }}>
                {isTodayGameCancelled ? (
                  <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--error)' }}>취소</div>
                ) : (
                  <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--border)' }}>VS</div>
                )}
              </div>
              <div style={{ textAlign: 'center', minWidth: 0 }}>
                <div style={{ height: '54px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
                  <TeamLogo team={opponentTeam} size={46} />
                </div>
                <div style={{ minHeight: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', lineHeight: 1.2, fontWeight: '800' }}>
                  {opponentTeam?.fullName ?? '-'}
                </div>
                {!isMyTeamHome ? (
                  <div style={{ fontSize: '12px', color: 'white', background: opponentTeam?.color ?? '#191F28', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold', display: 'inline-block', marginTop: '4px' }}>홈</div>
                ) : (
                  <div aria-hidden style={{ height: '22px', marginTop: '4px' }} />
                )}
              </div>
            </div>

            <div style={{ textAlign: 'center', background: 'var(--background)', padding: '10px', borderRadius: '14px', fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 700 }}>
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
              <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 20px' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 900, color: '#191F28', marginBottom: '4px' }}>오늘 직관 가시나요?</h3>
                  <p style={{ fontSize: '12px', fontWeight: 800, color: '#64748B' }}>체크하면 구장 꿀팁을 알려드려요!</p>
                </div>
                <button
                  onClick={() => {
                    if (!myTeamGame) return;
                    setAttendanceForGame(myTeam.id, todayFullDate, myTeamGame.stadium, !isGoingToday);
                  }}
                  style={{
                    width: '58px',
                    height: '32px',
                    background: isGoingToday ? '#E4365A' : '#E5E8EB',
                    borderRadius: '999px',
                    position: 'relative',
                    padding: '4px',
                    flexShrink: 0,
                  }}
                  aria-label={isGoingToday ? '직관 예정 취소' : '직관 예정 체크'}
                >
                  <motion.div
                    animate={{ x: isGoingToday ? 26 : 0 }}
                    style={{
                      width: '24px',
                      height: '24px',
                      background: 'white',
                      borderRadius: '50%',
                      boxShadow: '0 3px 8px rgba(15, 23, 42, 0.14)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isGoingToday ? '#E4365A' : '#94A3B8',
                    }}
                  >
                    {isGoingToday ? <Check size={15} strokeWidth={3} /> : null}
                  </motion.div>
                </button>
              </div>

              {isGoingToday && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  style={{ marginBottom: '16px' }}
                >
	                  <div
	                    style={{
	                      borderTop: '1px solid #E5E8EB',
	                      background: '#F6F2F3',
	                      padding: '18px 18px 16px',
	                      borderRadius: '0 0 20px 20px',
	                      marginTop: '-16px',
	                      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.5)',
	                    }}
	                  >
	                    <div style={{ fontSize: '15px', fontWeight: 900, color: '#E4365A', marginBottom: '16px' }}>
	                      ✨ {todayStadiumDisplayName} 직관 꿀팁 요약
	                    </div>

	                    <div style={{ display: 'grid', gap: '16px', marginBottom: '18px' }}>
	                      <div style={{ display: 'grid', gridTemplateColumns: '38px minmax(0, 1fr)', gap: '12px', alignItems: 'center' }}>
	                        <div
	                          style={{
	                            width: '36px',
	                            height: '36px',
	                            borderRadius: '999px',
                            background: '#E7F0FF',
                            color: '#3182F6',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
	                          }}
	                        >
	                          <BusFront size={18} />
	                        </div>
	                        <div style={{ minWidth: 0 }}>
	                          <div style={{ fontSize: '12px', fontWeight: 900, color: '#8B95A1', marginBottom: '4px' }}>빠른 이동</div>
	                          <div style={{ fontSize: '14px', lineHeight: 1.35, fontWeight: 900, color: '#1E293B' }}>
	                            {activeStadiumTip?.transport ?? '대중교통 정보를 확인 중이에요.'}
	                          </div>
	                        </div>
	                      </div>

	                      <div style={{ display: 'grid', gridTemplateColumns: '38px minmax(0, 1fr)', gap: '12px', alignItems: 'center' }}>
	                        <div
	                          style={{
	                            width: '36px',
	                            height: '36px',
	                            borderRadius: '999px',
                            background: '#FFF3DF',
                            color: '#F97316',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
	                          }}
	                        >
	                          <Utensils size={18} />
	                        </div>
	                        <div style={{ minWidth: 0 }}>
	                          <div style={{ fontSize: '12px', fontWeight: 900, color: '#8B95A1', marginBottom: '4px' }}>인기 맛도리 TOP 2</div>
	                          <div style={{ fontSize: '14px', lineHeight: 1.35, fontWeight: 900, color: '#1E293B' }}>
	                            {formatFoodSummary(activeStadiumTip?.foods ?? [])}
	                          </div>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => router.push('/stadiums')}
	                      style={{
	                        width: '100%',
	                        minHeight: '48px',
	                        borderRadius: '16px',
	                        border: '1.5px solid #F3B7C2',
                        background: 'rgba(255,255,255,0.24)',
                        color: '#E11D48',
                        display: 'flex',
                        alignItems: 'center',
	                        justifyContent: 'center',
	                        gap: '6px',
	                        fontSize: '14px',
	                        fontWeight: 900,
	                      }}
	                    >
	                      {todayStadiumDisplayName} 상세 정보 보기
	                      <ChevronRight size={18} strokeWidth={2.8} />
	                    </button>
                  </div>
                </motion.div>
              )}
            </>
          )}

          {/* Starting Lineup & Pitcher */}
          {lineup && myTeamGame.status !== 'cancelled' && (
            <MatchupLineupCard
              game={myTeamGame}
              leftTeam={myTeam}
              rightTeam={opponentTeam}
              lineup={lineup}
            />
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
          {opponentName && (
            <div className="card" style={{ padding: '22px 18px', marginBottom: myTeamResults.length > 0 ? '18px' : undefined }}>
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: 900, color: myTeam.color, marginBottom: '5px' }}>
                  MATCHUP CHECK
                </div>
                <div style={{ fontSize: '21px', fontWeight: 900, color: '#191F28', marginBottom: '4px' }}>
                  상대팀 이길 수 있나요?
                </div>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#8B95A1' }}>
                  {opponentFullName}와의 지난 정규 시즌 성적
                </div>
              </div>

              {headToHeadLoading ? (
                <div style={{ padding: '22px 0', textAlign: 'center', color: '#8B95A1', fontSize: '14px', fontWeight: 800 }}>
                  상대 전적을 불러오고 있어요...
                </div>
              ) : lastSeasonHeadToHeadRecord && lastSeasonHeadToHeadRecord.total > 0 ? (
                <HeadToHeadSummary {...lastSeasonHeadToHeadRecord} />
              ) : (
                <div style={{ padding: '22px 0', textAlign: 'center', color: '#8B95A1', fontSize: '14px', fontWeight: 800 }}>
                  아직 저장된 지난 시즌 전적이 없습니다.
                </div>
              )}
            </div>
          )}

          {myTeamResults.length > 0 && (
            <div className="card" style={{ padding: '22px 18px' }}>
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: 900, color: myTeam.color, marginBottom: '5px' }}>
                  RECENT FORM
                </div>
                <div style={{ fontSize: '21px', fontWeight: 900, color: '#191F28', marginBottom: '4px' }}>
                  {myTeam.fullName} 이기고 있나요?
                </div>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#8B95A1' }}>
                  최근 {myTeamResults.length}경기 결과
                </div>
              </div>
              <ResultBadgeRow items={myTeamResults} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
