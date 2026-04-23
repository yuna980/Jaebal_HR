'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useTeam } from '@/context/TeamContext';
import { motion } from 'framer-motion';
import { Ticket, History, TrendingUp, ShoppingBag, ExternalLink, Star, Trophy, Sparkles, ArrowUp } from 'lucide-react';
import { useState } from 'react';
import { useGameScheduleMonth } from '@/hooks/useGameScheduleMonth';
import { KboMatch, TEAM_NAME_TO_ID } from '@/lib/kboScraper';
import TeamLogo from '@/components/TeamLogo';
import DiaryModal from '@/components/DiaryModal';
import { findRecordForDate, formatDiaryDate, useFanDiaryRecords } from '@/lib/fanDiary';
import { findAttendanceRecord, useAttendanceRecords } from '@/lib/attendance';
import { Team } from '@/data/teams';
import { TeamStats, useTeamStats } from '@/hooks/useTeamStats';

function hexToRgb(hex: string) {
  const normalized = hex.replace('#', '');
  const value = Number.parseInt(normalized.length === 3
    ? normalized.split('').map((char) => char + char).join('')
    : normalized, 16);

  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function getTeamStatsTheme(team: Team) {
  const rgb = hexToRgb(team.color);
  const main = team.color;

  return {
    main,
    icon: main,
    appBg: team.bgSecondary,
    border: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.20)`,
    badgeText: main,
    badgeBorder: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.28)`,
    glow: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)`,
  };
}

function TeamStatsBanner({ team, stats, loading, error }: {
  team: Team;
  stats: TeamStats | null;
  loading: boolean;
  error: string | null;
}) {
  const theme = getTeamStatsTheme(team);
  const currentWinRate = stats?.currentWinRate ?? '-';
  const previousWinRate = stats?.previousWinRate ?? '-';
  const rank = stats?.rank ?? null;
  const deltaLabel = stats?.winRateDeltaLabel ?? '▲ 0.000';
  const deltaColor = (stats?.winRateDelta ?? 0) >= 0 ? '#22c55e' : '#ef4444';
  const badgeText = stats?.isPostseasonZone ? '포스트시즌 진출권' : '포스트시즌 추격권';

  return (
    <section
      style={{
        marginBottom: '24px',
        transition: 'background-color 500ms ease',
      }}
    >
        <h3
          style={{
            fontSize: '18px',
            lineHeight: 1.3,
            fontWeight: 800,
            color: '#1f2937',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '12px',
            transition: 'color 300ms ease',
          }}
        >
          <TrendingUp size={20} color={theme.icon} />
          우리 팀 성적
        </h3>

        <div
          className="card"
          style={{
            margin: 0,
            background: '#fff',
            border: `1.5px solid ${theme.border}`,
            borderRadius: 'var(--radius)',
            boxShadow: '0 6px 16px rgba(15, 23, 42, 0.04)',
            display: 'grid',
            gridTemplateColumns: '1fr 2px 1fr',
            alignItems: 'center',
            padding: '18px 16px',
            marginBottom: '12px',
            transition: 'border-color 300ms ease',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '15px', color: '#6b7280', fontWeight: 800, marginBottom: '6px' }}>
              현재 승률
            </div>
            <div style={{ fontSize: '2rem', lineHeight: 1, fontWeight: 950, color: theme.main }}>
              {loading ? '-' : currentWinRate}
            </div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                fontSize: '12px',
                color: deltaColor,
                fontWeight: 900,
                marginTop: '8px',
              }}
            >
              <ArrowUp size={13} />
              {loading ? '0.000' : deltaLabel.replace('▲ ', '').replace('▼ ', '')}
            </div>
          </div>

          <div style={{ width: '1px', height: '64px', background: theme.border }} />

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '15px', color: '#6b7280', fontWeight: 800, marginBottom: '6px' }}>
              작년 이맘때
            </div>
            <div style={{ fontSize: '2rem', lineHeight: 1, fontWeight: 950, color: '#6b7280' }}>
              {loading ? '-' : previousWinRate}
            </div>
            <div style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 800, marginTop: '8px' }}>
              {stats?.previousRank ? `리그 ${stats.previousRank}위` : '순위 정보 없음'}
            </div>
          </div>
        </div>

        <div
          className="card"
          style={{
            margin: 0,
            background: '#fff',
            border: `1.5px solid ${theme.border}`,
            borderRadius: 'var(--radius)',
            boxShadow: '0 6px 16px rgba(15, 23, 42, 0.04)',
            padding: '20px 18px',
            textAlign: 'center',
            transition: 'border-color 300ms ease',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '7px',
              color: '#6b7280',
              fontSize: '15px',
              fontWeight: 900,
              marginBottom: '8px',
            }}
          >
            <Trophy size={18} color={theme.icon} />
            현재 정규리그 순위
          </div>
          <div style={{ fontSize: '2rem', lineHeight: 1, fontWeight: 950, color: theme.main }}>
            {loading ? '-' : rank ? `${rank}위` : '-'}
          </div>

          <div style={{ position: 'relative', display: 'inline-flex', marginTop: '14px' }}>
            <div
              style={{
                position: 'absolute',
                inset: '-7px',
                background: theme.glow,
                filter: 'blur(12px)',
                borderRadius: '9999px',
              }}
            />
            <div
              style={{
                position: 'relative',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 13px',
                borderRadius: '9999px',
                color: theme.badgeText,
                border: `1.5px solid ${theme.badgeBorder}`,
                background: '#fff',
                fontSize: '13px',
                fontWeight: 900,
              }}
            >
              <Sparkles size={15} color={theme.icon} className="animate-pulse" />
              {error ? '성적 확인 중' : badgeText}
            </div>
          </div>
        </div>
    </section>
  );
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

interface QuickLink {
  name: string;
  description: string;
  url: string;
  background: string;
  textColor: string;
  borderColor: string;
  iconColor: string;
  featured: boolean;
  accentColor: string;
  logoSurface: string;
  descriptionColor: string;
  badgeText?: string;
  logoPath?: string;
  logoAlt?: string;
}

export default function ProfilePage() {
  const { myTeam } = useTeam();
  const records = useFanDiaryRecords();
  const attendanceRecords = useAttendanceRecords();
  const currentYear = new Date().getFullYear();
  const today = new Date();
  const { schedules } = useGameScheduleMonth(today.getFullYear(), today.getMonth() + 1);
  const { stats: teamStats, loading: teamStatsLoading, error: teamStatsError } = useTeamStats(
    myTeam?.id,
    currentYear
  );

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDiaryDate, setSelectedDiaryDate] = useState('');

  const ticketingSites = [
    { name: '인터파크 티켓', url: 'https://ticket.interpark.com' },
    { name: '티켓링크', url: 'https://www.ticketlink.co.kr' },
  ];

  if (!myTeam) return null;

  const quickLinks: QuickLink[] = [
    {
      name: `${myTeam.name} 공식 온라인 샵`,
      description: '유니폼, 모자, 응원용품 보러가기',
      url: 'https://landers.family.ssg.com/',
      background: '#FFFFFF',
      textColor: 'var(--text)',
      borderColor: `${myTeam.color}33`,
      iconColor: myTeam.color,
      featured: true,
      badgeText: myTeam.name,
      accentColor: myTeam.color,
      logoSurface: myTeam.color,
      descriptionColor: 'var(--text-light)',
    },
    {
      name: '네이버 스포츠 바로가기',
      description: '빠르게 경기 일정과 기록 확인',
      url: 'https://m.sports.naver.com/index',
      background: '#FFFFFF',
      textColor: 'var(--text)',
      borderColor: '#BBF7D0',
      iconColor: '#16A34A',
      featured: false,
      logoPath: '/brand-logos/naver-sports.svg',
      logoAlt: '네이버 스포츠 로고',
      accentColor: '#16A34A',
      logoSurface: '#F6FFF8',
      descriptionColor: 'var(--text-light)',
    },
    {
      name: '티빙으로 중계보기',
      description: '실시간 중계 화면으로 바로 이동',
      url: 'https://www.tving.com/sports/kbo',
      background: '#FFFFFF',
      textColor: 'var(--text)',
      borderColor: '#FECACA',
      iconColor: '#E11D48',
      featured: false,
      logoPath: '/brand-logos/tving.jpg',
      logoAlt: '티빙 로고',
      accentColor: '#E11D48',
      logoSurface: '#FFF5F5',
      descriptionColor: 'var(--text-light)',
    },
  ];

  // 종료된 내 팀 경기 찾기
  const finishedGames = schedules.filter(
    (m) =>
      m.status === 'finished' &&
      (TEAM_NAME_TO_ID[m.homeTeam] === myTeam.id || TEAM_NAME_TO_ID[m.awayTeam] === myTeam.id)
  );
  const history = records
    .filter((record) => record.teamId === myTeam.id && record.review.trim())
    .sort((left, right) => right.date.localeCompare(left.date));

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

  const selectedGame = finishedGames.find(g => g.date === selectedDiaryDate);
  const selectedRecord = findRecordForDate(records, myTeam.id, formatDiaryDate(currentYear, selectedDiaryDate));
  const selectedAttendanceRecord = findAttendanceRecord(
    attendanceRecords,
    myTeam.id,
    formatDiaryDate(currentYear, selectedDiaryDate)
  );

  return (
    <div className="container" style={{ position: 'relative' }}>
      <header style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{ 
          background: myTeam.bgSecondary, 
          width: '100px', 
          height: '100px', 
          borderRadius: '50%', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          margin: '0 auto 16px' 
        }}>
          <TeamLogo team={myTeam} size={64} rounded />
        </div>
        <h2 style={{ fontSize: '24px' }}>{myTeam.fullName} 야덕</h2>
        <p style={{ color: 'var(--text-light)', fontSize: '14px' }}>오늘도 야구볼래? 👋</p>
        <div style={{ marginTop: '10px' }}>
          <Link
            href="/teams"
            style={{
              fontSize: '13px',
              color: 'var(--text-light)',
              textDecoration: 'underline',
              textUnderlineOffset: '3px',
            }}
          >
            응원팀 변경하기
          </Link>
        </div>
      </header>

      <TeamStatsBanner team={myTeam} stats={teamStats} loading={teamStatsLoading} error={teamStatsError} />

      {/* Ticketing Sites */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '18px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Ticket size={20} color="var(--primary)" /> 예매 사이트
        </h3>
        <div style={{ display: 'flex', gap: '12px' }}>
          {ticketingSites.map((site) => (
            <a 
              key={site.name}
              href={site.url} 
              target="_blank" 
              className="card" 
              style={{ flex: 1, margin: 0, padding: '12px', textAlign: 'center', fontSize: '14px', fontWeight: 'bold' }}
            >
              {site.name}
            </a>
          ))}
        </div>
      </div>

      {/* Attendance History */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <History size={20} color="var(--primary)" /> 야구 일기
          </h3>
          <button onClick={openModal} style={{ color: 'var(--primary)', fontWeight: 'bold', fontSize: '14px' }}>+ 작성하기</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {history.map((record, i) => (
            (() => {
              const attendanceRecord = findAttendanceRecord(attendanceRecords, myTeam.id, record.date);
              const attendanceLabel = attendanceRecord?.isAttending ? '직관' : '중계';
              const gameSummary = getDiaryGameSummary(record.date, schedules, myTeam);

              return (
            <motion.div 
              key={i} 
              className="card" 
              onClick={() => openEditModal(record.date)}
              style={{
                margin: 0,
                padding: '16px',
                borderLeft: `6px solid ${record.result === 'W' ? 'var(--success)' : record.result === 'L' ? 'var(--error)' : 'var(--border)'}`,
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-light)' }}>{record.date} @{record.venue}</span>
              </div>
              {gameSummary && (
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    maxWidth: '100%',
                    color: 'var(--text-light)',
                    fontSize: '12px',
                    fontWeight: 800,
                    marginBottom: '7px',
                  }}
                >
                  <span
                    style={{
                      color: 'var(--text)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {myTeam.name}
                  </span>
                  {gameSummary.hasScore ? (
                    <span style={{ color: myTeam.color, fontWeight: 950, whiteSpace: 'nowrap' }}>
                      {gameSummary.myScore} : {gameSummary.opponentScore}
                    </span>
                  ) : (
                    <span style={{ color: myTeam.color, fontWeight: 950, whiteSpace: 'nowrap' }}>
                      {gameSummary.status === 'cancelled' ? '경기 취소' : '스코어 미정'}
                    </span>
                  )}
                  <span
                    style={{
                      color: 'var(--text)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {gameSummary.opponent}
                  </span>
                  <span
                    style={{
                      padding: '2px 7px',
                      borderRadius: '9999px',
                      background: 'var(--background)',
                      color: 'var(--text-light)',
                      fontSize: '10px',
                      fontWeight: 900,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {attendanceLabel}
                  </span>
                </div>
              )}
              <p style={{ fontSize: '14px', marginBottom: '8px' }}>{record.review}</p>
              <div style={{ display: 'flex', gap: '2px' }}>
                {[...Array(5)].map((_, j) => (
                  <Star key={j} size={14} fill={j < record.rating ? 'var(--accent)' : 'none'} color={j < record.rating ? 'var(--accent)' : 'var(--border)'} />
                ))}
              </div>
            </motion.div>
              );
            })()
          ))}
        </div>
      </div>

      {/* Quick Links */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '18px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShoppingBag size={20} color="var(--primary)" /> 바로가기
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {quickLinks.map((link) => (
            <a
              key={link.name}
              href={link.url}
              target="_blank"
              rel="noreferrer"
              className="card"
              style={{
                margin: 0,
                padding: link.featured ? '18px' : '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: link.background,
                color: link.textColor,
                borderColor: link.borderColor,
                borderWidth: '1.5px',
                boxShadow: link.featured ? '0 12px 24px rgba(15, 23, 42, 0.06)' : '0 6px 16px rgba(15, 23, 42, 0.04)',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: `linear-gradient(90deg, ${link.accentColor}10 0%, rgba(255,255,255,0) 45%)`,
                  pointerEvents: 'none',
                }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    width: link.featured ? '58px' : '72px',
                    height: link.featured ? '48px' : '42px',
                    borderRadius: '14px',
                    background: link.logoSurface,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '6px 10px',
                    flexShrink: 0,
                    overflow: 'hidden',
                    border: `1px solid ${link.borderColor}`,
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9)',
                    position: 'relative',
                    zIndex: 1,
                  }}
                >
                  {link.logoPath ? (
                    <Image
                      src={link.logoPath}
                      alt={link.logoAlt ?? link.name}
                      width={link.featured ? 58 : 72}
                      height={link.featured ? 48 : 42}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        display: 'block',
                      }}
                    />
                  ) : (
                    <span
                      style={{
                        fontSize: link.featured ? '15px' : '14px',
                        fontWeight: 900,
                        color: '#FFFFFF',
                        letterSpacing: '-0.02em',
                      }}
                    >
                      {link.badgeText}
                    </span>
                  )}
                </div>
                <div>
                  <div style={{ fontSize: link.featured ? '16px' : '15px', fontWeight: 800 }}>
                    {link.name}
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: link.descriptionColor,
                      marginTop: '2px',
                    }}
                  >
                    {link.description}
                  </div>
                </div>
              </div>

              <div
                style={{
                  width: link.featured ? '38px' : '34px',
                  height: link.featured ? '38px' : '34px',
                  borderRadius: '9999px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: `${link.accentColor}12`,
                  border: `1px solid ${link.accentColor}22`,
                  position: 'relative',
                  zIndex: 1,
                }}
              >
                <ExternalLink size={link.featured ? 20 : 18} color={link.iconColor} />
              </div>
            </a>
          ))}
        </div>
      </div>

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
