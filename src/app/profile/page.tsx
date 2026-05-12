'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Bell,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  LogOut,
  PencilLine,
  Plane,
  Star,
  Ticket,
  X,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import DiaryModal from '@/components/DiaryModal';
import TeamLogo from '@/components/TeamLogo';
import { KBO_TEAMS, Team } from '@/data/teams';
import { useTeam } from '@/context/TeamContext';
import { findAttendanceRecord, useAttendanceRecords } from '@/lib/attendance';
import { findRecordForDate, formatDiaryDate, useFanDiaryRecords } from '@/lib/fanDiary';
import { KboMatch, TEAM_NAME_TO_ID } from '@/lib/kboScraper';
import { useGameScheduleMonth } from '@/hooks/useGameScheduleMonth';
import { TeamStats, useTeamStats } from '@/hooks/useTeamStats';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { clearAuthenticatedUserData } from '@/lib/supabase/auth';
import {
  fetchNotificationStatus,
  NotificationPreferences,
  NotificationStatus,
  saveNotificationPreferences,
  subscribeWebPush,
} from '@/lib/notifications/client';

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

function clampRgbValue(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function shadeHexColor(hex: string, amount: number) {
  const { r, g, b } = hexToRgb(hex);

  return `rgb(${clampRgbValue(r + amount)}, ${clampRgbValue(g + amount)}, ${clampRgbValue(b + amount)})`;
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

function formatDiaryShortDate(date: string) {
  const [, month = '', day = ''] = date.split('.');
  return `${Number(month)}. ${Number(day)}`;
}

function getDiaryMonthLabel(date: string) {
  const [year = '', month = ''] = date.split('.');
  return `${year}년 ${Number(month)}월`;
}

function getResultLabel(result: DiaryCardData['result']) {
  if (result === 'W') return '승';
  if (result === 'L') return '패';
  if (result === 'D') return '무';
  return '-';
}

function getResultColor(result: DiaryCardData['result']) {
  if (result === 'W') return '#3182F6';
  if (result === 'L') return '#EF4444';
  if (result === 'D') return '#10B981';
  return '#6B7684';
}

function getAttendanceIcon(attendanceLabel: DiaryCardData['attendanceLabel']) {
  return attendanceLabel === '직관' ? '🏟️' : '📺';
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

function NotificationSettingsModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [status, setStatus] = useState<NotificationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    async function loadStatus() {
      setLoading(true);
      setMessage('');

      try {
        const nextStatus = await fetchNotificationStatus();
        if (!cancelled) {
          setStatus(nextStatus);
        }
      } catch {
        if (!cancelled) {
          setMessage('알림 상태를 불러오지 못했습니다.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadStatus();

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const refreshStatus = async () => {
    const nextStatus = await fetchNotificationStatus();
    setStatus(nextStatus);
  };

  const handlePreferenceToggle = async (key: keyof NotificationPreferences) => {
    if (!status || saving) return;

    const isTurningOn = !status.preferences[key];
    const shouldSubscribeFirst = isTurningOn && !status.isSubscribed;
    const nextPreferences = {
      ...status.preferences,
      [key]: isTurningOn,
    };

    setStatus({
      ...status,
      preferences: nextPreferences,
    });
    setSaving(true);
    setMessage('');

    try {
      if (shouldSubscribeFirst) {
        await subscribeWebPush();
      }

      await saveNotificationPreferences(nextPreferences);
      await refreshStatus();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '알림 설정 저장에 실패했습니다.');
      try {
        await refreshStatus();
      } catch {
        return;
      }
    } finally {
      setSaving(false);
    }
  };

  const isUnsupported = status?.supported === false;

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 3900,
        background: 'rgba(15, 23, 42, 0.44)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="notification-settings-title"
        onClick={(event) => event.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '390px',
          background: '#FFFFFF',
          borderRadius: '24px',
          padding: '20px',
          boxShadow: '0 26px 70px rgba(15, 23, 42, 0.28)',
          border: '1px solid rgba(229, 232, 235, 0.9)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', marginBottom: '18px' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '13px', fontWeight: 900, color: '#3182F6', marginBottom: '6px' }}>알림 설정</div>
            <h3 id="notification-settings-title" style={{ fontSize: '20px', lineHeight: 1.25, fontWeight: 900, color: '#191F28', margin: 0 }}>
              경기 알림 받기
            </h3>
            <p style={{ fontSize: '13px', lineHeight: 1.5, fontWeight: 700, color: '#8B95A1', marginTop: '6px' }}>
              경기 30분 전과 직관 2시간 전에만 알려드립니다.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
            <button
              type="button"
              onClick={onClose}
              aria-label="알림 설정 닫기"
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '999px',
                background: '#F2F4F6',
                color: '#6B7684',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gap: '10px' }}>
          {[
            {
              key: 'gameReminderEnabled' as const,
              title: '경기 시작 30분 전',
              description: '오늘 야구 해요 / 오늘의 선발 라인업을 확인해보세요',
            },
            {
              key: 'attendanceTipEnabled' as const,
              title: '직관 체크 시 경기 2시간 전',
              description: '오늘 직관 가시는 군요! / 구장 꿀팁을 확인해보세요',
            },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => handlePreferenceToggle(item.key)}
              disabled={loading || saving || isUnsupported}
              style={{
                width: '100%',
                textAlign: 'left',
                borderRadius: '16px',
                background: '#F8FAFC',
                border: '1px solid #EEF2F6',
                padding: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                opacity: loading || saving || isUnsupported ? 0.58 : 1,
              }}
            >
              <span style={{ minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: '14px', fontWeight: 900, color: '#191F28', marginBottom: '4px' }}>
                  {item.title}
                </span>
                <span style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#8B95A1', lineHeight: 1.45 }}>
                  {item.description}
                </span>
              </span>
              <span
                style={{
                  width: '42px',
                  height: '26px',
                  borderRadius: '999px',
                  background: status?.preferences[item.key] ? '#3182F6' : '#DDE1E6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: status?.preferences[item.key] ? 'flex-end' : 'flex-start',
                  padding: '3px',
                  flexShrink: 0,
                }}
              >
                <span style={{ width: '20px', height: '20px', borderRadius: '999px', background: '#FFFFFF' }} />
              </span>
            </button>
          ))}
        </div>

        {isUnsupported ? (
          <div style={{ marginTop: '12px', fontSize: '12px', lineHeight: 1.45, fontWeight: 700, color: '#E11D48' }}>
            이 브라우저에서는 푸시 알림을 지원하지 않습니다.
          </div>
        ) : null}

        {message ? (
          <div style={{ marginTop: '12px', fontSize: '12px', lineHeight: 1.45, fontWeight: 700, color: '#E11D48' }}>
            {message}
          </div>
        ) : null}
      </section>
    </div>
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
  attendanceLabel: '직관' | '집관';
};

function DiaryCarousel({
  team,
  items,
  onWrite,
  onViewAll,
  onOpen,
}: {
  team: Team;
  items: DiaryCardData[];
  onWrite: () => void;
  onViewAll: () => void;
  onOpen: (dateText: string) => void;
}) {
  return (
    <section style={{ marginBottom: '28px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <h3 style={{ fontSize: '18px', lineHeight: 1.25, color: '#191F28' }}>나의 야구 일기</h3>
        <button
          onClick={onViewAll}
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
                      <span style={{ fontSize: '13px' }}>{getAttendanceIcon(item.attendanceLabel)}</span>
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

function DiaryListModal({
  isOpen,
  items,
  onClose,
  onOpenDiary,
}: {
  isOpen: boolean;
  items: DiaryCardData[];
  onClose: () => void;
  onOpenDiary: (dateText: string) => void;
}) {
  const [sortOrder, setSortOrder] = useState<'latest' | 'oldest' | 'rating-high' | 'rating-low'>('latest');
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);

  const sortOptions = [
    { value: 'latest' as const, label: '최신순' },
    { value: 'oldest' as const, label: '과거순' },
    { value: 'rating-high' as const, label: '평점 높은순' },
    { value: 'rating-low' as const, label: '평점 낮은순' },
  ];
  const selectedSortLabel = sortOptions.find((option) => option.value === sortOrder)?.label ?? '최신순';

  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  const sortedItems = useMemo(
    () =>
      [...items].sort((left, right) => {
        if (sortOrder === 'latest') {
          return right.date.localeCompare(left.date);
        }

        if (sortOrder === 'oldest') {
          return left.date.localeCompare(right.date);
        }

        if (sortOrder === 'rating-high') {
          return right.rating - left.rating || right.date.localeCompare(left.date);
        }

        return left.rating - right.rating || right.date.localeCompare(left.date);
      }),
    [items, sortOrder]
  );

  const groupedItems = useMemo(() => {
    const groups = new Map<string, DiaryCardData[]>();

    sortedItems.forEach((item) => {
      const monthLabel = getDiaryMonthLabel(item.date);
      const current = groups.get(monthLabel) ?? [];
      current.push(item);
      groups.set(monthLabel, current);
    });

    return Array.from(groups.entries());
  }, [sortedItems]);

  const attendanceItems = items.filter((item) => item.attendanceLabel === '직관');
  const winCount = attendanceItems.filter((item) => item.result === 'W').length;
  const lossCount = attendanceItems.filter((item) => item.result === 'L').length;
  const attendanceTotal = attendanceItems.length;
  const winRate = attendanceTotal > 0 ? Math.round((winCount / attendanceTotal) * 1000) / 10 : 0;

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 3000,
        background: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'calc(env(safe-area-inset-top, 0px) + 12px) 16px calc(env(safe-area-inset-bottom, 0px) + 12px)',
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="diary-list-title"
        onClick={(event) => event.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '440px',
          maxHeight: 'calc(100dvh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - 24px)',
          background: '#F2F4F6',
          borderRadius: '24px',
          boxShadow: '0 24px 60px rgba(15, 23, 42, 0.28)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <header
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            padding: '18px 20px',
            background: 'rgba(242, 244, 246, 0.86)',
            backdropFilter: 'blur(14px)',
            flexShrink: 0,
          }}
        >
          <h2 id="diary-list-title" style={{ fontSize: '19px', fontWeight: 900, color: '#191F28' }}>
            나의 야구 일기
          </h2>
          <button
            onClick={onClose}
            aria-label="야구 일기 전체보기 닫기"
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '999px',
              background: '#E5E8EB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#4E5968',
            }}
          >
            <X size={18} strokeWidth={2.5} />
          </button>
        </header>

        <div
          style={{
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            padding: '0 18px calc(20px + env(safe-area-inset-bottom, 0px))',
          }}
        >
          <section
            style={{
              background: '#FFFFFF',
              borderRadius: '24px',
              padding: '20px',
              boxShadow: '0 12px 28px rgba(15, 23, 42, 0.06)',
              marginBottom: '18px',
            }}
          >
            <div style={{ fontSize: '15px', fontWeight: 900, color: '#191F28', marginBottom: '14px' }}>
              나는 승리 요정일까? 🧚
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '12px' }}>
              <div style={{ borderRadius: '18px', background: '#F8F9FA', padding: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#8B95A1', marginBottom: '8px' }}>
                  직관 승률
                </div>
                <div style={{ fontSize: '30px', lineHeight: 1, fontWeight: 900, color: '#3182F6', marginBottom: '8px' }}>
                  {winRate}%
                </div>
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#6B7684' }}>
                  {winCount}승 {lossCount}패 (총 {attendanceTotal}회)
                </div>
              </div>
              <div style={{ position: 'relative', borderRadius: '18px', background: '#F8F9FA', padding: '16px', overflow: 'hidden' }}>
                <CalendarDays
                  size={52}
                  color="#DDE3EA"
                  style={{ position: 'absolute', right: '10px', bottom: '8px' }}
                />
                <div style={{ position: 'relative' }}>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#8B95A1', marginBottom: '8px' }}>
                    총 작성 일기
                  </div>
                  <div style={{ fontSize: '26px', lineHeight: 1.1, fontWeight: 900, color: '#191F28' }}>
                    {items.length} 경기
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '12px',
              }}
            >
              <h3 style={{ fontSize: '15px', fontWeight: 900, color: '#191F28' }}>전체 목록</h3>
              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => setIsSortMenuOpen((current) => !current)}
                  aria-haspopup="menu"
                  aria-expanded={isSortMenuOpen}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    borderRadius: '999px',
                    background: '#FFFFFF',
                    color: '#4E5968',
                    fontSize: '12px',
                    fontWeight: 900,
                    padding: '8px 10px',
                  }}
                >
                  {selectedSortLabel}
                  <ChevronDown size={14} />
                </button>

                {isSortMenuOpen ? (
                  <div
                    role="menu"
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 8px)',
                      right: 0,
                      zIndex: 4,
                      minWidth: '132px',
                      borderRadius: '16px',
                      background: '#FFFFFF',
                      padding: '6px',
                      boxShadow: '0 14px 32px rgba(15, 23, 42, 0.16)',
                      border: '1px solid rgba(139, 149, 161, 0.12)',
                    }}
                  >
                    {sortOptions.map((option) => {
                      const isSelected = option.value === sortOrder;

                      return (
                        <button
                          key={option.value}
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setSortOrder(option.value);
                            setIsSortMenuOpen(false);
                          }}
                          style={{
                            width: '100%',
                            borderRadius: '12px',
                            background: isSelected ? '#F2F4F6' : '#FFFFFF',
                            color: isSelected ? '#191F28' : '#6B7684',
                            padding: '10px 11px',
                            textAlign: 'left',
                            fontSize: '12px',
                            fontWeight: 900,
                          }}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            </div>

            {items.length ? (
              <div style={{ display: 'grid', gap: '18px' }}>
                {groupedItems.map(([monthLabel, monthItems]) => (
                  <div key={monthLabel}>
                    <div style={{ fontSize: '13px', fontWeight: 900, color: '#8B95A1', marginBottom: '8px' }}>
                      {monthLabel}
                    </div>
                    <div style={{ display: 'grid', gap: '10px' }}>
                      {monthItems.map((item) => (
                        <button
                          key={item.date}
                          onClick={() => {
                            onOpenDiary(item.date);
                          }}
                          style={{
                            width: '100%',
                            borderRadius: '20px',
                            background: '#FFFFFF',
                            padding: '16px',
                            textAlign: 'left',
                            boxShadow: '0 10px 22px rgba(15, 23, 42, 0.04)',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '12px' }}>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                              <span
                                style={{
                                  borderRadius: '10px',
                                  background: getResultColor(item.result),
                                  color: '#FFFFFF',
                                  fontSize: '12px',
                                  fontWeight: 900,
                                  lineHeight: 1,
                                  padding: '7px 10px',
                                }}
                              >
                                {getResultLabel(item.result)}
                              </span>
                              <span
                                style={{
                                  borderRadius: '10px',
                                  background: '#F2F4F6',
                                  color: '#4E5968',
                                  fontSize: '12px',
                                  fontWeight: 900,
                                  lineHeight: 1,
                                  padding: '7px 10px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                }}
                              >
                                <span style={{ fontSize: '12px' }}>{getAttendanceIcon(item.attendanceLabel)}</span>
                                {item.attendanceLabel}
                              </span>
                            </div>
                            <div style={{ flexShrink: 0, color: '#8B95A1', fontSize: '12px', fontWeight: 800 }}>
                              {formatDiaryShortDate(item.date)}
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                            <div style={{ minWidth: 0, flex: '1 1 auto', fontSize: '17px', fontWeight: 900, color: '#191F28', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {item.opponent ? `vs ${item.opponent}` : item.venue}
                            </div>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', flexShrink: 0, fontSize: '13px', fontWeight: 900, color: '#4E5968' }}>
                              <Star size={14} fill="#FFC83D" color="#FFC83D" />
                              {item.rating.toFixed(1)}
                            </div>
                          </div>

                          <div
                            style={{
                              borderRadius: '14px',
                              background: '#F8F9FA',
                              padding: '12px',
                              color: '#4E5968',
                              fontSize: '13px',
                              fontWeight: 700,
                              lineHeight: 1.45,
                              whiteSpace: 'pre-line',
                              overflow: 'hidden',
                              display: '-webkit-box',
                              WebkitLineClamp: 3,
                              WebkitBoxOrient: 'vertical',
                            }}
                          >
                            {item.review}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div
                style={{
                  background: '#FFFFFF',
                  borderRadius: '20px',
                  padding: '28px 18px',
                  textAlign: 'center',
                  color: '#4E5968',
                  fontSize: '14px',
                  fontWeight: 800,
                  lineHeight: 1.45,
                }}
              >
                아직 작성된 일기가 없어요!<br />
                첫 직관의 추억을 기록해 보세요.
              </div>
            )}
          </section>
        </div>
      </section>
    </div>
  );
}

type QuickLinkItem = {
  label: string;
  description: string;
  url: string;
  emoji: string;
};

type TicketPlatform = {
  name: string;
  color: string;
  background: string;
  teamIds: string[];
};

type TeamTicketInfo = {
  platform: string;
  url: string;
  opensApp?: boolean;
};

const SSG_LANDERS_IOS_INSTALL_URL = 'https://apps.apple.com/kr/app/ssg-landers/id972556231';
const SSG_LANDERS_ANDROID_INSTALL_URL = 'https://play.google.com/store/apps/details?id=com.skt.ilbs.skwyverns.app&hl=ko';
const SSG_LANDERS_INSTALL_URL = 'https://www.ssglanders.com/contact';

const TEAM_TICKET_INFO: Record<string, TeamTicketInfo> = {
  lg: { platform: '티켓링크', url: 'https://www.ticketlink.co.kr/sports' },
  hanwha: { platform: '티켓링크', url: 'https://www.ticketlink.co.kr/sports' },
  samsung: { platform: '티켓링크', url: 'https://www.ticketlink.co.kr/sports' },
  kt: { platform: '티켓링크', url: 'https://www.ticketlink.co.kr/sports' },
  kia: { platform: '티켓링크', url: 'https://www.ticketlink.co.kr/sports' },
  doosan: { platform: '인터파크 티켓', url: 'https://ticket.interpark.com/Contents/Sports/Bridge/baseball' },
  kiwoom: { platform: '인터파크 티켓', url: 'https://ticket.interpark.com/Contents/Sports/Bridge/baseball' },
  ssg: { platform: 'SSG 랜더스 앱', url: SSG_LANDERS_INSTALL_URL, opensApp: true },
  lotte: { platform: '롯데 자이언츠 앱/웹', url: 'https://ticket.giantsclub.com/loginForm.do' },
  nc: { platform: 'NC 다이노스 앱/웹', url: 'https://ticket.ncdinos.com/games' },
};

const TICKET_PLATFORMS: TicketPlatform[] = [
  {
    name: '티켓링크',
    color: '#2563EB',
    background: '#EFF6FF',
    teamIds: ['lg', 'hanwha', 'samsung', 'kt', 'kia'],
  },
  {
    name: '인터파크 티켓',
    color: '#E11D48',
    background: '#FFF1F2',
    teamIds: ['doosan', 'kiwoom'],
  },
  {
    name: '구단 자체 앱/웹',
    color: '#475569',
    background: '#F1F5F9',
    teamIds: ['ssg', 'lotte', 'nc'],
  },
];

function openExternalUrl(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer');
}

function getSsgLandersInstallUrl() {
  const userAgent = navigator.userAgent.toLowerCase();

  if (/iphone|ipad|ipod/.test(userAgent)) return SSG_LANDERS_IOS_INSTALL_URL;
  if (/android/.test(userAgent)) return SSG_LANDERS_ANDROID_INSTALL_URL;

  return SSG_LANDERS_INSTALL_URL;
}

function openSsgLandersAppOrInstall() {
  openExternalUrl(getSsgLandersInstallUrl());
}

function openTicketInfo(ticket: TeamTicketInfo) {
  if (ticket.opensApp) {
    openSsgLandersAppOrInstall();
    return;
  }

  openExternalUrl(ticket.url);
}

function getTicketInfo(team: Team) {
  return TEAM_TICKET_INFO[team.id] ?? { platform: '구단 예매처', url: 'https://www.koreabaseball.com/kbo/league/map.aspx' };
}

function TicketReservationSection({ team }: { team: Team }) {
  const [isAwaySheetOpen, setIsAwaySheetOpen] = useState(false);
  const homeTicket = getTicketInfo(team);
  const gradient = `linear-gradient(135deg, ${shadeHexColor(team.color, 34)} 0%, ${team.color} 52%, ${shadeHexColor(team.color, -42)} 100%)`;
  const awayGroups = TICKET_PLATFORMS.map((platform) => ({
    ...platform,
    teams: platform.teamIds
      .map((teamId) => KBO_TEAMS.find((item) => item.id === teamId))
      .filter((item): item is Team => Boolean(item))
      .filter((item) => item.id !== team.id),
  })).filter((platform) => platform.teams.length > 0);

  return (
    <section style={{ marginBottom: '18px' }}>
      <h3 style={{ fontSize: '18px', lineHeight: 1.25, color: '#191F28', marginBottom: '14px' }}>티켓 예매</h3>

      <button
        type="button"
        onClick={() => openTicketInfo(homeTicket)}
        style={{
          width: '100%',
          minHeight: '112px',
          borderRadius: '20px',
          background: gradient,
          color: '#FFFFFF',
          padding: '18px',
          boxShadow: `0 14px 28px ${team.color}24`,
          position: 'relative',
          overflow: 'hidden',
          textAlign: 'left',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        <Ticket
          size={92}
          strokeWidth={1.6}
          style={{
            position: 'absolute',
            right: '-14px',
            bottom: '-20px',
            opacity: 0.18,
            transform: 'rotate(12deg)',
          }}
        />
        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: '11px', fontWeight: 900, opacity: 0.82, marginBottom: '6px' }}>응원팀 홈경기 예매</div>
          <div style={{ fontSize: '19px', lineHeight: 1.18, fontWeight: 900, maxWidth: '240px' }}>
            {team.fullName} 홈 예매
          </div>
          {homeTicket.opensApp ? (
            <div style={{ fontSize: '12px', fontWeight: 800, opacity: 0.82, marginTop: '6px' }}>
              랜더스 앱으로 열기
            </div>
          ) : null}
        </div>
      </button>

      <button
        type="button"
        onClick={() => setIsAwaySheetOpen(true)}
        style={{
          width: '100%',
          marginTop: '8px',
          borderRadius: '16px',
          background: '#FFFFFF',
          color: '#191F28',
          padding: '13px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          border: '1px solid rgba(139, 149, 161, 0.12)',
          boxShadow: '0 10px 24px rgba(15, 23, 42, 0.04)',
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 900 }}>
          <Plane size={17} color={team.color} />
          원정 경기 직관 가시나요?
        </span>
        <ChevronRight size={18} color="#9AA4AF" />
      </button>

      <div
        onClick={() => setIsAwaySheetOpen(false)}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 3500,
          background: 'rgba(15, 23, 42, 0.58)',
          backdropFilter: 'blur(6px)',
          opacity: isAwaySheetOpen ? 1 : 0,
          pointerEvents: isAwaySheetOpen ? 'auto' : 'none',
          transition: 'opacity 300ms ease',
        }}
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="away-ticket-title"
        onClick={(event) => event.stopPropagation()}
        style={{
          position: 'fixed',
          left: '50%',
          bottom: 0,
          zIndex: 3600,
          width: '100%',
          maxWidth: '480px',
          maxHeight: '84dvh',
          background: '#FFFFFF',
          borderRadius: '28px 28px 0 0',
          boxShadow: '0 -26px 70px rgba(15, 23, 42, 0.25)',
          transform: `translate(-50%, ${isAwaySheetOpen ? '0' : '100%'})`,
          transition: 'transform 500ms cubic-bezier(0.32,0.72,0,1)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          pointerEvents: isAwaySheetOpen ? 'auto' : 'none',
        }}
      >
        <div
          style={{
            padding: '12px 20px 18px',
            borderBottom: '1px solid #EEF2F6',
            flexShrink: 0,
          }}
        >
          <div style={{ width: '42px', height: '4px', borderRadius: '999px', background: '#D1D6DB', margin: '0 auto 18px' }} />
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '14px' }}>
            <div>
              <h4 id="away-ticket-title" style={{ fontSize: '20px', lineHeight: 1.25, fontWeight: 900, color: '#191F28', marginBottom: '5px' }}>
                원정 경기 예매처
              </h4>
              <p style={{ fontSize: '13px', lineHeight: 1.45, fontWeight: 700, color: '#8B95A1' }}>
                구단마다 다른 예매처를 플랫폼별로 모았어요.
              </p>
            </div>
            <button
              type="button"
              aria-label="원정 예매처 닫기"
              onClick={() => setIsAwaySheetOpen(false)}
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '14px',
                background: '#F2F4F6',
                color: '#4E5968',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div style={{ overflowY: 'auto', padding: '18px 20px calc(26px + var(--safe-area-inset-bottom))' }}>
          <div
            onClick={() => openTicketInfo(homeTicket)}
            style={{
              borderRadius: '20px',
              background: team.bgSecondary,
              border: `1px solid ${team.color}1F`,
              padding: '16px',
              marginBottom: '18px',
              cursor: 'pointer',
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 900, color: team.color, marginBottom: '7px' }}>나의 홈 구장</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '15px', fontWeight: 900, color: '#191F28', marginBottom: '3px' }}>{team.fullName}</div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#6B7684' }}>
                  {homeTicket.opensApp ? '랜더스 앱으로 예매하기' : team.stadium}
                </div>
              </div>
              <ExternalLink size={16} color={team.color} style={{ flexShrink: 0 }} />
            </div>
          </div>

          {awayGroups.map((platform) => (
            <div key={platform.name} style={{ marginBottom: '18px' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  borderRadius: '999px',
                  background: platform.background,
                  color: platform.color,
                  padding: '7px 10px',
                  fontSize: '12px',
                  fontWeight: 900,
                  marginBottom: '8px',
                }}
              >
                {platform.name}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {platform.teams.map((awayTeam) => {
                  const ticket = getTicketInfo(awayTeam);

                  return (
                    <button
                      key={awayTeam.id}
                      type="button"
                      onClick={() => openTicketInfo(ticket)}
                      style={{
                        width: '100%',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '11px 10px',
                        borderRadius: '14px',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <div>
                        <span style={{ display: 'block', fontSize: '14px', fontWeight: 900, color: '#334155' }}>{awayTeam.fullName}</span>
                        <span style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#94A3B8', marginTop: '3px' }}>
                          {awayTeam.stadium}
                        </span>
                      </div>
                      <ExternalLink size={14} color="#CBD5E1" />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}

function QuickLinksSection({
  team,
  serviceLinks,
}: {
  team: Team;
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

      <TicketReservationSection team={team} />

      <div>
        <div style={{ fontSize: '13px', fontWeight: 800, color: '#8B95A1', marginBottom: '10px' }}>팬 서비스</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>{serviceLinks.map(renderItem)}</div>
      </div>
    </section>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const { myTeam } = useTeam();
  const records = useFanDiaryRecords();
  const attendanceRecords = useAttendanceRecords();
  const currentYear = new Date().getFullYear();
  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const { schedules } = useGameScheduleMonth(currentYear, currentMonth);
  const { stats: teamStats, loading: teamStatsLoading, error: teamStatsError } = useTeamStats(myTeam?.id, currentYear);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [diaryModalMode, setDiaryModalMode] = useState<'create' | 'edit'>('create');
  const [isDiaryListOpen, setIsDiaryListOpen] = useState(false);
  const [selectedDiaryDate, setSelectedDiaryDate] = useState('');
  const [seasonSchedules, setSeasonSchedules] = useState<KboMatch[]>([]);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isNotificationSettingsOpen, setIsNotificationSettingsOpen] = useState(false);
  const [isDeleteAccountOpen, setIsDeleteAccountOpen] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteAccountError, setDeleteAccountError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function fetchSeasonSchedules() {
      const months = Array.from({ length: currentMonth }, (_, index) => index + 1);

      try {
        const monthSchedules = await Promise.all(
          months.map(async (month) => {
            const params = new URLSearchParams({
              year: String(currentYear),
              month: String(month),
            });
            const response = await fetch(`/api/game-schedules/month?${params.toString()}`);
            const data = await response.json();

            return data.success ? (data.schedules as KboMatch[]) : [];
          })
        );

        if (!cancelled) {
          setSeasonSchedules(monthSchedules.flat());
        }
      } catch {
        if (!cancelled) {
          setSeasonSchedules(schedules);
        }
      }
    }

    void fetchSeasonSchedules();

    return () => {
      cancelled = true;
    };
  }, [currentMonth, currentYear, schedules]);

  const diaryCandidateSchedules = seasonSchedules.length > 0 ? seasonSchedules : schedules;

  const finishedGames = (myTeam
    ? diaryCandidateSchedules.filter(
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
        : history.map((record) => {
        const attendanceRecord = findAttendanceRecord(attendanceRecords, myTeam.id, record.date);
        const gameSummary = getDiaryGameSummary(record.date, diaryCandidateSchedules, myTeam);

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
          attendanceLabel: attendanceRecord?.isAttending ? '직관' : '집관',
        };
      }),
    [attendanceRecords, diaryCandidateSchedules, history, myTeam]
  );

  if (!myTeam) return null;

  const handleDateChange = (dateStr: string) => {
    setSelectedDiaryDate(dateStr);
  };

  const openEditModal = (dateText: string) => {
    const normalizedDate = dateText.split('.').slice(-2).join('.');
    setDiaryModalMode('edit');
    handleDateChange(normalizedDate);
    setIsModalOpen(true);
  };

  const openModal = () => {
    setDiaryModalMode('create');
    if (finishedGames.length > 0) {
      handleDateChange(finishedGames[finishedGames.length - 1].date);
    }
    setIsModalOpen(true);
  };

  const openDiaryList = () => {
    setIsDiaryListOpen(true);
  };

  const handleSignOut = async () => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    setIsSigningOut(true);
    await supabase.auth.signOut();
    clearAuthenticatedUserData();
    router.replace('/login');
    router.refresh();
  };

  const handleDeleteAccount = async () => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    setIsDeletingAccount(true);
    setDeleteAccountError('');

    const { error } = await supabase.rpc('delete_current_user');

    if (error) {
      setDeleteAccountError('탈퇴 처리에 실패했어요. 잠시 후 다시 시도해 주세요.');
      setIsDeletingAccount(false);
      return;
    }

    await supabase.auth.signOut();
    clearAuthenticatedUserData();
    router.replace('/login');
    router.refresh();
  };

  const selectedGame = finishedGames.find((game) => game.date === selectedDiaryDate);
  const selectedRecord = findRecordForDate(records, myTeam.id, formatDiaryDate(currentYear, selectedDiaryDate));
  const selectedAttendanceRecord = findAttendanceRecord(
    attendanceRecords,
    myTeam.id,
    formatDiaryDate(currentYear, selectedDiaryDate)
  );

  const avatarLabel = myTeam.name.length <= 2 ? myTeam.name : myTeam.name.slice(0, 2);

  const teamShopById: Record<string, string> = {
    lg: 'https://www.lgtwins.com/shop',
    hanwha: 'https://www.hanwhaeagles.co.kr/SH/PCSH01.do',
    samsung: 'https://www.samsunglions.com/shop/shopping.asp',
    kt: 'https://www.ktwizstore.co.kr/',
    kia: 'https://teamstore.tigers.co.kr/',
    ssg: 'https://landers.family.ssg.com/',
    kiwoom: 'https://interparkmdshop.com/category/%ED%82%A4%EC%9B%80%ED%9E%88%EC%96%B4%EB%A1%9C%EC%A6%88/29/',
    doosan: 'https://www.doosanbears.com/shop',
    lotte: 'https://www.lotteon.com/p/display/seller/sellerShop/lottegiants?ch_no=101509&ch_dtl_no=1049592',
    nc: 'https://store.ncdinos.com/',
  };

  const serviceLinks: QuickLinkItem[] = [
    {
      label: `${myTeam.fullName} 굿즈샵`,
      description: '유니폼, 모자, 응원용품 보러가기',
      url: teamShopById[myTeam.id] ?? 'https://m.sports.naver.com/kbaseball/index',
      emoji: '🛍️',
    },
    {
      label: '네이버 스포츠',
      description: '경기 일정과 기록 빠르게 확인',
      url: 'https://m.sports.naver.com/kbaseball/index',
      emoji: '⚾',
    },
    {
      label: '티빙 중계 보기',
      description: '실시간 중계 화면으로 바로 이동',
      url: 'https://www.tving.com/sports/kbo?&utm_source=google&utm_medium=searchad&utm_campaign=PM_google_sa_conv_2026kbo&utm_content=2026kbo_non&utm_term=%ED%8B%B0%EB%B9%99%EC%95%BC%EA%B5%AC%EC%A4%91%EA%B3%84&gad_source=1&gad_campaignid=23624522798&gbraid=0AAAAAC1p3XRUM-_qajC-t_7_LbRwuFGw_&gclid=Cj0KCQjw8PDPBhCeARIsAOJwmWWrgFwDFRtVVq8iJKPAhDYrd5wRNHoWCsJ08F5ojpVN0Sog7J1h_rkaAoiMEALw_wcB',
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
            flexWrap: 'wrap',
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

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => setIsNotificationSettingsOpen(true)}
              style={{
                borderRadius: '999px',
                background: '#E8F3FF',
                color: '#1B64DA',
                padding: '10px 12px',
                fontSize: '13px',
                fontWeight: 900,
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <Bell size={14} />
              알림설정
            </button>

            <Link
              href="/teams"
              style={{
                borderRadius: '999px',
                background: '#F2F4F6',
                color: '#4E5968',
                padding: '10px 12px',
                fontSize: '13px',
                fontWeight: 800,
                whiteSpace: 'nowrap',
              }}
            >
              팀 변경
            </Link>
          </div>
        </div>
      </header>

      <TeamStatsDashboard team={myTeam} stats={teamStats} loading={teamStatsLoading} error={teamStatsError} />

      <DiaryCarousel team={myTeam} items={diaryItems.slice(0, 5)} onWrite={openModal} onViewAll={openDiaryList} onOpen={openEditModal} />

      <QuickLinksSection team={myTeam} serviceLinks={serviceLinks} />

      <button
        type="button"
        onClick={handleSignOut}
        disabled={isSigningOut}
        style={{
          width: '100%',
          marginTop: '18px',
          borderRadius: '20px',
          background: '#FFFFFF',
          color: '#E11D48',
          padding: '16px 18px',
          fontSize: '14px',
          fontWeight: 900,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          border: '1px solid rgba(225, 29, 72, 0.14)',
          boxShadow: '0 10px 24px rgba(15, 23, 42, 0.04)',
        }}
      >
        <LogOut size={18} />
        {isSigningOut ? '로그아웃 중' : '로그아웃'}
      </button>

      <button
        type="button"
        onClick={() => {
          setDeleteAccountError('');
          setIsDeleteAccountOpen(true);
        }}
        style={{
          display: 'block',
          width: 'fit-content',
          margin: '18px auto 0',
          color: '#8B95A1',
          fontSize: '13px',
          fontWeight: 800,
          textDecoration: 'underline',
          textUnderlineOffset: '3px',
        }}
      >
        탈퇴하기
      </button>

      <DiaryListModal
        isOpen={isDiaryListOpen}
        items={diaryItems}
        onClose={() => setIsDiaryListOpen(false)}
        onOpenDiary={openEditModal}
      />

      <NotificationSettingsModal
        isOpen={isNotificationSettingsOpen}
        onClose={() => setIsNotificationSettingsOpen(false)}
      />

      <DiaryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        mode={diaryModalMode}
        myTeamId={myTeam.id}
        selectedGame={selectedGame ?? null}
        selectedDate={selectedDiaryDate}
        onDateChange={handleDateChange}
        finishedGames={finishedGames}
        currentRecord={selectedRecord}
        attendanceLabel={selectedAttendanceRecord?.isAttending ? '직관' : '집관'}
        year={currentYear}
      />

      {isDeleteAccountOpen ? (
        <div
          onClick={() => {
            if (!isDeletingAccount) {
              setIsDeleteAccountOpen(false);
            }
          }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 4000,
            background: 'rgba(15, 23, 42, 0.44)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-account-title"
            onClick={(event) => event.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '390px',
              borderRadius: '24px',
              background: '#FFFFFF',
              boxShadow: '0 26px 70px rgba(15, 23, 42, 0.28)',
              padding: '24px 20px 20px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '54px',
                height: '54px',
                borderRadius: '18px',
                background: '#FFF1F2',
                color: '#E11D48',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <AlertTriangle size={26} strokeWidth={2.4} />
            </div>
            <h2 id="delete-account-title" style={{ fontSize: '21px', fontWeight: 900, color: '#191F28', marginBottom: '10px' }}>
              진짜 탈퇴하시겠어요?
            </h2>
            <p style={{ color: '#6B7684', fontSize: '14px', fontWeight: 700, lineHeight: 1.55, marginBottom: '18px' }}>
              탈퇴하면 계정과 응원팀, 야구일기, 직관기록이 모두 삭제돼요.
            </p>
            {deleteAccountError ? (
              <p
                style={{
                  borderRadius: '14px',
                  background: '#FFF1F2',
                  color: '#E11D48',
                  fontSize: '13px',
                  fontWeight: 800,
                  lineHeight: 1.45,
                  padding: '12px',
                  marginBottom: '14px',
                }}
              >
                {deleteAccountError}
              </p>
            ) : null}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.2fr)', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setIsDeleteAccountOpen(false)}
                disabled={isDeletingAccount}
                style={{
                  minHeight: '48px',
                  borderRadius: '16px',
                  background: '#F2F4F6',
                  color: '#4E5968',
                  fontSize: '14px',
                  fontWeight: 900,
                }}
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={isDeletingAccount}
                style={{
                  minHeight: '48px',
                  borderRadius: '16px',
                  background: '#E11D48',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  fontWeight: 900,
                  opacity: isDeletingAccount ? 0.72 : 1,
                }}
              >
                {isDeletingAccount ? '탈퇴 처리 중' : '진짜로 탈퇴하기'}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
