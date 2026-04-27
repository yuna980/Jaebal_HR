'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronRight, PencilLine, Star } from 'lucide-react';
import DiaryModal from '@/components/DiaryModal';
import TeamLogo from '@/components/TeamLogo';
import { Team } from '@/data/teams';
import { useTeam } from '@/context/TeamContext';
import { findAttendanceRecord, useAttendanceRecords } from '@/lib/attendance';
import { findRecordForDate, formatDiaryDate, useFanDiaryRecords } from '@/lib/fanDiary';
import { KboMatch, TEAM_NAME_TO_ID } from '@/lib/kboScraper';
import { useGameScheduleMonth } from '@/hooks/useGameScheduleMonth';
import { TeamStats, useTeamStats } from '@/hooks/useTeamStats';

function hexToRgb(hex: string) {
  const normalized = hex.replace('#', '');
  const value = Number.parseInt(
    normalized.length === 3 ? normalized.split('').map((char) => char + char).join('') : normalized,
    16
  );

  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function getDiaryGameSummary(recordDate: string, matches: KboMatch[], team: Team) {
  const shortDate = recordDate.split('.').slice(-2).join('.');
  const match = matches.find(
    (game) =>
      game.date === shortDate &&
      (TEAM_NAME_TO_ID[game.homeTeam] === team.id || TEAM_NAME_TO_ID[game.awayTeam] === team.id)
  );

  if (!match) return null;

  const isHomeTeam = TEAM_NAME_TO_ID[match.homeTeam] === team.id;
  const opponent = isHomeTeam ? match.awayTeam : match.homeTeam;
  const myScore = isHomeTeam ? match.homeScore : match.awayScore;
  const opponentScore = isHomeTeam ? match.awayScore : match.homeScore;
  const hasScore = typeof myScore === 'number' && typeof opponentScore === 'number';

  return {
    opponent,
    myScore,
    opponentScore,
    hasScore,
    status: match.status,
  };
}

function getTrendMeta(stats: TeamStats | null) {
  if (!stats) {
    return {
      label: '비교 데이터 없음',
      color: '#8B95A1',
      icon: null as 'up' | 'down' | null,
    };
  }

  if (stats.winRateDelta > 0) {
    return {
      label: `작년보다 ${stats.winRateDeltaLabel.replace('▲ ', '')} 상승`,
      color: '#E11D48',
      icon: 'up' as const,
    };
  }

  if (stats.winRateDelta < 0) {
    return {
      label: `작년보다 ${stats.winRateDeltaLabel.replace('▼ ', '')} 하락`,
      color: '#2563EB',
      icon: 'down' as const,
    };
  }

  return {
    label: '작년과 동일',
    color: '#8B95A1',
    icon: null,
  };
}

function formatDiaryCardPreview(review: string) {
  const normalizedReview = review.trim();
  const [firstLine = '', ...restLines] = normalizedReview.split(/\r?\n/);
  const hasMoreLines = restLines.some((line) => line.trim().length > 0);

  return hasMoreLines ? `${firstLine.trimEnd()}...` : firstLine;
}

function TeamStatsDashboard({
  team,
  stats,
  loading,
  error,
}: {
  team: Team;
  stats: TeamStats | null;
  loading: boolean;
  error: string | null;
}) {
  const rgb = hexToRgb(team.color);
  const softBorder = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.18)`;
  const trend = getTrendMeta(stats);

  return (
    <section style={{ marginBottom: '28px' }}>
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '24px',
          padding: '24px 20px',
          boxShadow: '0 12px 28px rgba(15, 23, 42, 0.05)',
          border: `1px solid ${softBorder}`,
          position: 'relative',
        }}
      >
        <div style={{ position: 'relative' }}>
          <div
            style={{
              fontSize: '14px',
              fontWeight: 700,
              color: '#8B95A1',
              marginBottom: '8px',
            }}
          >
            내 팀 성적
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: '8px',
              flexWrap: 'wrap',
              fontWeight: 900,
              letterSpacing: '-0.03em',
              marginBottom: '18px',
            }}
          >
            <span style={{ fontSize: '18px', lineHeight: 1.2, color: '#4E5968' }}>{team.fullName}</span>
            <span style={{ color: team.color, fontSize: '38px', lineHeight: 0.9 }}>{loading ? '-' : stats?.rank ?? '-'}</span>
            <span style={{ fontSize: '20px', lineHeight: 1, color: '#191F28' }}>위</span>
          </div>

          <div style={{ height: '1px', background: '#EEF2F6', marginBottom: '18px' }} />

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
              gap: '14px',
            }}
          >
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#8B95A1', marginBottom: '6px' }}>
                시즌 승률
              </div>
              <div style={{ fontSize: '26px', lineHeight: 1, fontWeight: 900, color: '#191F28', marginBottom: '8px' }}>
                {loading ? '-' : stats?.currentWinRate ?? '-'}
              </div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#6B7684' }}>
                {error ? '성적을 불러오는 중 문제가 있어요.' : `${stats?.win ?? 0}승 ${stats?.loss ?? 0}패 ${stats?.draw ?? 0}무`}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#8B95A1', marginBottom: '6px' }}>
                작년 이맘때 대비
              </div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '21px',
                  lineHeight: 1,
                  fontWeight: 900,
                  color: trend.color,
                  marginBottom: '8px',
                }}
              >
                {trend.icon === 'up' ? <ArrowUp size={20} /> : null}
                {trend.icon === 'down' ? <ArrowDown size={20} /> : null}
                <span>{loading ? '-' : stats?.winRateDeltaLabel.replace(/[▲▼]\s*/, '') ?? '-'}</span>
              </div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: trend.color }}>{trend.label}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

type DiaryCardData = {
  date: string;
  venue: string;
  review: string;
  result: string;
  rating: number;
  opponent: string | null;
  scoreLabel: string | null;
  attendanceLabel: '직관' | '중계';
};

function DiaryCarousel({
  team,
  items,
  onWrite,
  onOpen,
}: {
  team: Team;
  items: DiaryCardData[];
  onWrite: () => void;
  onOpen: (dateText: string) => void;
}) {
  return (
    <section style={{ marginBottom: '28px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <h3 style={{ fontSize: '18px', lineHeight: 1.25, color: '#191F28' }}>나의 야구 일기</h3>
        <button
          onClick={onWrite}
          style={{
            color: '#9AA4AF',
            fontSize: '12px',
            fontWeight: 800,
            padding: '4px 0',
          }}
        >
          전체보기
        </button>
      </div>

      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '28px',
          padding: '18px',
          boxShadow: '0 12px 28px rgba(15, 23, 42, 0.05)',
          overflow: 'hidden',
        }}
      >
        {items.length ? (
          <div
            className="hide-scrollbar"
            style={{
              display: 'grid',
              gridAutoFlow: 'column',
              gridAutoColumns: '76%',
              gap: '14px',
              overflowX: 'auto',
              WebkitOverflowScrolling: 'touch',
              scrollSnapType: 'x proximity',
              touchAction: 'pan-x',
              overscrollBehaviorX: 'contain',
              paddingBottom: '6px',
              marginRight: '-18px',
              paddingRight: '18px',
            }}
          >
            {items.map((item) => (
              <div
                key={item.date}
                role="button"
                tabIndex={0}
                onClick={() => onOpen(item.date)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onOpen(item.date);
                  }
                }}
                style={{
                  scrollSnapAlign: 'start',
                  background: '#F6F8FB',
                  borderRadius: '26px',
                  padding: '18px',
                  border: '1px solid #E8EDF3',
                  textAlign: 'left',
                  minWidth: '0',
                  maxWidth: '320px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginBottom: '18px' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    <span
                      style={{
                        borderRadius: '12px',
                        minWidth: '52px',
                        padding: '9px 12px',
                        fontSize: '12px',
                        lineHeight: 1,
                        textAlign: 'center',
                        fontWeight: 900,
                        background: item.result === 'W' ? '#3B82F6' : item.result === 'L' ? '#EF4444' : '#6B7684',
                        color: '#FFFFFF',
                      }}
                    >
                      {item.result === 'W' ? '승' : item.result === 'L' ? '패' : '무'}
                    </span>
                    <span
                      style={{
                        borderRadius: '12px',
                        padding: '9px 12px',
                        fontSize: '12px',
                        lineHeight: 1,
                        fontWeight: 800,
                        background: '#ECEFF3',
                        color: '#4E5968',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <span style={{ fontSize: '13px' }}>{item.attendanceLabel === '직관' ? '🏟️' : '📺'}</span>
                      {item.attendanceLabel}
                    </span>
                  </div>

                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      fontSize: '13px',
                      fontWeight: 900,
                      color: '#4E5968',
                      flexShrink: 0,
                    }}
                  >
                    <Star size={15} fill="#FFC83D" color="#FFC83D" />
                    {item.rating.toFixed(1)}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap', marginBottom: '12px' }}>
                  <div style={{ fontSize: '16px', fontWeight: 900, color: '#191F28' }}>
                    {item.opponent ? `vs ${item.opponent}` : `${team.name} 경기`}
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#9AA4AF' }}>
                    {item.date.split('.').slice(-2).join('월 ')}일
                  </div>
                </div>

                <div
                  style={{
                    fontSize: '14px',
                    lineHeight: 1.45,
                    fontWeight: 700,
                    color: '#4E5968',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    width: '100%',
                  }}
                >
                  {formatDiaryCardPreview(item.review)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div
            style={{
              minHeight: '124px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              padding: '8px',
            }}
          >
            <div
              style={{
                fontSize: '18px',
                fontWeight: 900,
                color: '#191F28',
              }}
            >
                아직 작성한 야구일기가 없어요
            </div>
          </div>
        )}

        <button
          onClick={onWrite}
          style={{
            width: '100%',
            marginTop: '16px',
            borderRadius: '22px',
            background: '#EEF2F6',
            color: '#4E5968',
            padding: '18px 20px',
            fontSize: '14px',
            fontWeight: 900,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
          }}
        >
          <PencilLine size={22} />
          새 야구 일기 쓰기
        </button>
      </div>
    </section>
  );
}

type QuickLinkItem = {
  label: string;
  description: string;
  url: string;
  emoji: string;
};

function QuickLinksSection({
  ticketLinks,
  serviceLinks,
}: {
  ticketLinks: QuickLinkItem[];
  serviceLinks: QuickLinkItem[];
}) {
  const renderItem = (item: QuickLinkItem) => (
    <a
      key={item.label}
      href={item.url}
      target="_blank"
      rel="noreferrer"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        background: '#FFFFFF',
        borderRadius: '20px',
        padding: '16px 18px',
        boxShadow: '0 10px 24px rgba(15, 23, 42, 0.04)',
        border: '1px solid rgba(139, 149, 161, 0.1)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
        <div
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '14px',
            background: '#F2F4F6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
            flexShrink: 0,
          }}
        >
          {item.emoji}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: '15px', fontWeight: 800, color: '#191F28', marginBottom: '2px' }}>{item.label}</div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#8B95A1' }}>{item.description}</div>
        </div>
      </div>
      <ChevronRight size={18} color="#9AA4AF" />
    </a>
  );

  return (
    <section>
      <h3 style={{ fontSize: '18px', lineHeight: 1.25, color: '#191F28', marginBottom: '14px' }}>바로가기</h3>

      <div style={{ marginBottom: '18px' }}>
        <div style={{ fontSize: '13px', fontWeight: 800, color: '#8B95A1', marginBottom: '10px' }}>티켓 예매</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>{ticketLinks.map(renderItem)}</div>
      </div>

      <div>
        <div style={{ fontSize: '13px', fontWeight: 800, color: '#8B95A1', marginBottom: '10px' }}>팬 서비스</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>{serviceLinks.map(renderItem)}</div>
      </div>
    </section>
  );
}

export default function ProfilePage() {
  const { myTeam } = useTeam();
  const records = useFanDiaryRecords();
  const attendanceRecords = useAttendanceRecords();
  const currentYear = new Date().getFullYear();
  const today = new Date();
  const { schedules } = useGameScheduleMonth(today.getFullYear(), today.getMonth() + 1);
  const { stats: teamStats, loading: teamStatsLoading, error: teamStatsError } = useTeamStats(myTeam?.id, currentYear);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDiaryDate, setSelectedDiaryDate] = useState('');

  const finishedGames = (myTeam
    ? schedules.filter(
    (game) =>
      game.status === 'finished' &&
      (TEAM_NAME_TO_ID[game.homeTeam] === myTeam.id || TEAM_NAME_TO_ID[game.awayTeam] === myTeam.id)
    )
    : []) as typeof schedules;

  const history = records
    .filter((record) => record.teamId === myTeam?.id && record.review.trim())
    .sort((left, right) => right.date.localeCompare(left.date));

  const diaryItems = useMemo<DiaryCardData[]>(
    () =>
      !myTeam
        ? []
        : history.slice(0, 5).map((record) => {
        const attendanceRecord = findAttendanceRecord(attendanceRecords, myTeam.id, record.date);
        const gameSummary = getDiaryGameSummary(record.date, schedules, myTeam);

        let scoreLabel: string | null = null;
        if (gameSummary) {
          if (gameSummary.hasScore) {
            scoreLabel = `${myTeam.name} ${gameSummary.myScore} : ${gameSummary.opponentScore} ${gameSummary.opponent}`;
          } else {
            scoreLabel = gameSummary.status === 'cancelled' ? '경기 취소' : '스코어 미정';
          }
        }

        return {
          date: record.date,
          venue: record.venue,
          review: record.review,
          result: record.result,
          rating: record.rating,
          opponent: gameSummary?.opponent ?? null,
          scoreLabel,
          attendanceLabel: attendanceRecord?.isAttending ? '직관' : '중계',
        };
      }),
    [attendanceRecords, history, myTeam, schedules]
  );

  if (!myTeam) return null;

  const handleDateChange = (dateStr: string) => {
    setSelectedDiaryDate(dateStr);
  };

  const openEditModal = (dateText: string) => {
    const normalizedDate = dateText.split('.').slice(-2).join('.');
    handleDateChange(normalizedDate);
    setIsModalOpen(true);
  };

  const openModal = () => {
    if (finishedGames.length > 0) {
      handleDateChange(finishedGames[finishedGames.length - 1].date);
    }
    setIsModalOpen(true);
  };

  const selectedGame = finishedGames.find((game) => game.date === selectedDiaryDate);
  const selectedRecord = findRecordForDate(records, myTeam.id, formatDiaryDate(currentYear, selectedDiaryDate));
  const selectedAttendanceRecord = findAttendanceRecord(
    attendanceRecords,
    myTeam.id,
    formatDiaryDate(currentYear, selectedDiaryDate)
  );

  const avatarLabel = myTeam.name.length <= 2 ? myTeam.name : myTeam.name.slice(0, 2);

  const ticketLinks: QuickLinkItem[] = [
    {
      label: '인터파크 티켓',
      description: '빠르게 경기 예매하러 가기',
      url: 'https://ticket.interpark.com',
      emoji: '🎟️',
    },
    {
      label: '티켓링크',
      description: '좌석 예매 가능한지 바로 확인',
      url: 'https://www.ticketlink.co.kr',
      emoji: '📱',
    },
  ];

  const teamShopById: Record<string, string> = {
    ssg: 'https://landers.family.ssg.com/',
  };

  const serviceLinks: QuickLinkItem[] = [
    {
      label: `${myTeam.fullName} 굿즈샵`,
      description: '유니폼, 모자, 응원용품 보러가기',
      url: teamShopById[myTeam.id] ?? 'https://m.sports.naver.com/index',
      emoji: '🛍️',
    },
    {
      label: '네이버 스포츠',
      description: '경기 일정과 기록 빠르게 확인',
      url: 'https://m.sports.naver.com/index',
      emoji: '📊',
    },
    {
      label: '티빙 중계 보기',
      description: '실시간 중계 화면으로 바로 이동',
      url: 'https://www.tving.com/sports/kbo',
      emoji: '📺',
    },
  ];

  return (
    <div className="container" style={{ background: '#F2F4F6', minHeight: '100vh' }}>
      <header style={{ marginBottom: '28px' }}>
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '28px',
            padding: '22px 20px',
            boxShadow: '0 12px 28px rgba(15, 23, 42, 0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '22px',
                background: myTeam.color,
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: `0 10px 24px ${myTeam.color}33`,
                flexShrink: 0,
              }}
            >
              <div style={{ position: 'absolute', inset: '0', opacity: 0.16 }}>
                <TeamLogo team={myTeam} size={64} rounded />
              </div>
              <span style={{ position: 'relative', fontSize: '18px', fontWeight: 900 }}>{avatarLabel}</span>
            </div>

            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#8B95A1', marginBottom: '4px' }}>{myTeam.fullName} 팬</div>
              <div style={{ fontSize: '24px', lineHeight: 1.15, fontWeight: 900, color: '#191F28' }}>야구팬 님</div>
            </div>
          </div>

          <Link
            href="/teams"
            style={{
              flexShrink: 0,
              borderRadius: '999px',
              background: '#F2F4F6',
              color: '#4E5968',
              padding: '10px 14px',
              fontSize: '13px',
              fontWeight: 800,
            }}
          >
            팀 변경
          </Link>
        </div>
      </header>

      <TeamStatsDashboard team={myTeam} stats={teamStats} loading={teamStatsLoading} error={teamStatsError} />

      <DiaryCarousel team={myTeam} items={diaryItems} onWrite={openModal} onOpen={openEditModal} />

      <QuickLinksSection ticketLinks={ticketLinks} serviceLinks={serviceLinks} />

      <DiaryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        myTeamId={myTeam.id}
        selectedGame={selectedGame ?? null}
        selectedDate={selectedDiaryDate}
        onDateChange={handleDateChange}
        finishedGames={finishedGames}
        currentRecord={selectedRecord}
        attendanceLabel={selectedAttendanceRecord?.isAttending ? '직관' : '중계'}
        year={currentYear}
      />
    </div>
  );
}
