'use client';

import type { CSSProperties } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarDays, ChevronLeft, ChevronRight, Loader2, MapPin, X } from 'lucide-react';
import { useTeam } from '@/context/TeamContext';
import TeamLogo from '@/components/TeamLogo';
import { prefetchLineup, useKboLineup } from '@/hooks/useKboExtra';
import { useGameScheduleMonth } from '@/hooks/useGameScheduleMonth';
import { KboMatch, TEAM_NAME_TO_ID } from '@/lib/kboScraper';
import { KBO_TEAMS } from '@/data/teams';
import DiaryModal from '@/components/DiaryModal';
import { findRecordForDate, formatDiaryDate, useFanDiaryRecords } from '@/lib/fanDiary';
import { findAttendanceRecord, useAttendanceRecords } from '@/lib/attendance';
import { buildPitcherDisplay, buildResultSummary } from '@/lib/gameResultDisplay';
import { buildCalendarGamePreview } from '@/lib/scheduleCalendarView';
import ScheduleCalendarCell from '@/components/ScheduleCalendarCell';

interface CalendarCell {
  key: string;
  label: string;
  date: string | null;
  fullDate: string | null;
  isCurrentMonth: boolean;
  isSunday: boolean;
  games: KboMatch[];
}

function getMonthLabel(date: Date) {
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
}

function buildCalendarCells(baseDate: Date, schedules: KboMatch[]): CalendarCell[] {
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  const monthText = String(month + 1).padStart(2, '0');
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDay = firstDay.getDay();
  const totalCells = Math.ceil((startDay + daysInMonth) / 7) * 7;

  return Array.from({ length: totalCells }, (_, index) => {
    const dayNumber = index - startDay + 1;
    const isCurrentMonth = dayNumber >= 1 && dayNumber <= daysInMonth;
    const date = isCurrentMonth ? `${monthText}.${String(dayNumber).padStart(2, '0')}` : null;
    const fullDate = isCurrentMonth ? `${year}-${monthText}-${String(dayNumber).padStart(2, '0')}` : null;

    return {
      key: isCurrentMonth ? date! : `empty-${year}-${month}-${index}`,
      label: isCurrentMonth ? String(dayNumber) : '',
      date,
      fullDate,
      isCurrentMonth,
      isSunday: index % 7 === 0,
      games: date ? schedules.filter((game) => game.date === date) : [],
    };
  });
}

function getResultTone(result: '승' | '패' | '무' | null) {
  if (result === '승') {
    return {
      color: 'var(--success)',
      fontWeight: 800,
    };
  }

  if (result === '패') {
    return {
      color: 'var(--error)',
      fontWeight: 800,
    };
  }

  return {
    color: 'var(--text-light)',
    fontWeight: 700,
  };
}

function getCancelledMessage(game: KboMatch) {
  if (game.note?.includes('우천취소')) {
    return '해당 경기는 우천취소 되었습니다';
  }

  if (game.status === 'cancelled') {
    return `해당 경기는 ${game.note || '취소'} 되었습니다`;
  }

  return null;
}

function getGameKey(game: KboMatch) {
  return `${game.date}-${game.awayTeam}-${game.homeTeam}-${game.time}`;
}

function getTeamByName(name: string) {
  const teamId = TEAM_NAME_TO_ID[name];
  return KBO_TEAMS.find((team) => team.id === teamId) ?? null;
}

function getLineupColumns<T>(items: T[]) {
  const midpoint = Math.ceil(items.length / 2);
  return [items.slice(0, midpoint), items.slice(midpoint)];
}

function isPreRegularSeason(dateText: string) {
  return dateText < '03.28';
}

function formatModalHeadline(dateText: string, dayOfWeek: string) {
  const [month = '', day = ''] = dateText.split('.');
  return `${month}월 ${day}일 ${dayOfWeek}요일`;
}

const sectionDividerStyle: CSSProperties = {
  height: '1px',
  background: 'rgba(226, 232, 240, 0.9)',
  margin: '22px 0',
};

function getLineupEmptyMessage(status: KboMatch['status']) {
  if (status === 'finished') {
    return '과거 라인업 데이터가 아직 저장되지 않았어요.';
  }

  return '아직 라인업이 발표되지 않았어요.';
}

export default function SchedulePage() {
  const { myTeam } = useTeam();
  const today = new Date();
  const [visibleMonth, setVisibleMonth] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedGameKey, setSelectedGameKey] = useState<string | null>(null);
  const [isDiaryModalOpen, setIsDiaryModalOpen] = useState(false);
  const diaryRecords = useFanDiaryRecords();
  const attendanceRecords = useAttendanceRecords();

  const { schedules, loading, error } = useGameScheduleMonth(
    visibleMonth.getFullYear(),
    visibleMonth.getMonth() + 1
  );
  const todayFullDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const calendarCells = useMemo(
    () => buildCalendarCells(visibleMonth, schedules),
    [visibleMonth, schedules]
  );

  const selectedDateGames = useMemo(
    () => (selectedDate ? schedules.filter((game) => game.date === selectedDate) : []),
    [schedules, selectedDate]
  );

  const selectedGame = useMemo(
    () => selectedDateGames.find((game) => getGameKey(game) === selectedGameKey) ?? null,
    [selectedDateGames, selectedGameKey]
  );

  const isMyTeamGame = Boolean(
    selectedGame &&
      myTeam &&
      (TEAM_NAME_TO_ID[selectedGame.homeTeam] === myTeam.id ||
        TEAM_NAME_TO_ID[selectedGame.awayTeam] === myTeam.id)
  );

  const { lineup, loading: lineupLoading, loaded: lineupLoaded } = useKboLineup(
    isMyTeamGame ? myTeam?.id : undefined,
    selectedGame?.date ?? ''
  );

  const openDayModal = (date: string, games: KboMatch[]) => {
    if (games.length === 0) return;
    const myTeamId = myTeam?.id;

    const preferredGame =
      games.find(
        (game) =>
          TEAM_NAME_TO_ID[game.homeTeam] === myTeamId || TEAM_NAME_TO_ID[game.awayTeam] === myTeamId
      ) ?? games[0];

    setSelectedDate(date);
    setSelectedGameKey(getGameKey(preferredGame));
  };

  const handleDiaryDateChange = (date: string) => {
    const games = schedules.filter((game) => game.date === date);
    if (games.length === 0) return;
    const myTeamId = myTeam?.id;

    const preferredGame =
      games.find(
        (game) =>
          TEAM_NAME_TO_ID[game.homeTeam] === myTeamId || TEAM_NAME_TO_ID[game.awayTeam] === myTeamId
      ) ?? games[0];

    setSelectedDate(date);
    setSelectedGameKey(getGameKey(preferredGame));
  };

  const closeModal = () => {
    setSelectedDate(null);
    setSelectedGameKey(null);
  };

  const changeMonth = (offset: number) => {
    setVisibleMonth(
      new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + offset, 1)
    );
    closeModal();
  };

  const monthIsEmpty = !loading && schedules.length === 0;
  const monthlyMyTeamGames = useMemo(
    () =>
      schedules.filter(
        (game) => TEAM_NAME_TO_ID[game.homeTeam] === myTeam?.id || TEAM_NAME_TO_ID[game.awayTeam] === myTeam?.id
      ),
    [schedules, myTeam?.id]
  );
  useEffect(() => {
    if (!myTeam || monthlyMyTeamGames.length === 0) return;

    const uniqueDates = Array.from(new Set(monthlyMyTeamGames.map((game) => game.date)));
    uniqueDates.forEach((date) => {
      void prefetchLineup(myTeam.id, date);
    });
  }, [myTeam, monthlyMyTeamGames]);
  const selectedFullDate = selectedDate ? formatDiaryDate(visibleMonth.getFullYear(), selectedDate) : '';
  const selectedDiaryRecord =
    selectedDate && myTeam ? findRecordForDate(diaryRecords, myTeam.id, selectedFullDate) : null;
  const selectedAttendanceRecord =
    selectedDate && myTeam ? findAttendanceRecord(attendanceRecords, myTeam.id, selectedFullDate) : null;
  const attendanceLabel = selectedAttendanceRecord?.isAttending ? '직관' : '중계';

  if (!myTeam) return null;

  return (
    <div className="container">
      <header style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <CalendarDays size={22} color={myTeam.color} />
          <h2 style={{ fontSize: '24px' }}>{getMonthLabel(visibleMonth)} 대진표</h2>
        </div>
        <p style={{ color: 'var(--text-light)', fontSize: '14px' }}>
          이번달 우리 팀 경기를 한눈에 볼 수 있어요.
        </p>
      </header>

      <div className="card" style={{ padding: '14px', marginBottom: '16px', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <button
            onClick={() => changeMonth(-1)}
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '9999px',
              background: 'var(--background)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ChevronLeft size={18} />
          </button>

          <strong style={{ fontSize: '17px' }}>{getMonthLabel(visibleMonth)}</strong>

          <button
            onClick={() => changeMonth(1)}
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '9999px',
              background: 'var(--background)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
            gap: '6px',
            marginBottom: '8px',
          }}
        >
          {['일', '월', '화', '수', '목', '금', '토'].map((label) => (
            <div
              key={label}
              style={{
                textAlign: 'center',
                minWidth: 0,
                fontSize: '12px',
                fontWeight: 800,
                color: label === '일' ? '#FF6B6B' : 'var(--text-light)',
                padding: '4px 0',
              }}
            >
              {label}
            </div>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '42px 12px' }}>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              style={{ display: 'inline-block' }}
            >
              <Loader2 size={30} color="var(--primary)" />
            </motion.div>
            <p style={{ color: 'var(--text-light)', marginTop: '12px', fontSize: '14px' }}>
              월간 대진표를 불러오고 있어요...
            </p>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
              gap: '6px',
            }}
          >
            {calendarCells.map((cell) => {
              const myGame = cell.games.find(
                (game) =>
                  TEAM_NAME_TO_ID[game.homeTeam] === myTeam.id ||
                  TEAM_NAME_TO_ID[game.awayTeam] === myTeam.id
              );
              const hasGames = cell.games.length > 0;
              const preview = cell.isCurrentMonth && myGame
                ? buildCalendarGamePreview(myGame, myTeam.id)
                : null;
              const isToday = cell.fullDate === todayFullDate;

              return (
                <ScheduleCalendarCell
                  key={cell.key}
                  onClick={() => {
                    if (cell.date) openDayModal(cell.date, cell.games);
                  }}
                  disabled={!cell.isCurrentMonth || !hasGames}
                  label={cell.label}
                  isCurrentMonth={cell.isCurrentMonth}
                  isSelected={false}
                  isToday={isToday}
                  preview={preview}
                  accentColor={myTeam.color}
                />
              );
            })}
          </div>
        )}
      </div>

      {error && !loading && (
        <div className="card" style={{ textAlign: 'center', padding: '24px 20px' }}>
          <p style={{ color: 'var(--text-light)', fontSize: '14px' }}>{error}</p>
        </div>
      )}

      {monthIsEmpty && !error && (
        <div className="card" style={{ textAlign: 'center', padding: '28px 20px' }}>
          <p style={{ fontSize: '30px', marginBottom: '8px' }}>📅</p>
          <p style={{ fontWeight: 800, marginBottom: '6px' }}>아직 대진이 발표되지 않았습니다</p>
          <p style={{ color: 'var(--text-light)', fontSize: '14px' }}>
            다른 달로 이동해서 이미 발표된 대진표를 확인해보세요.
          </p>
        </div>
      )}

      <AnimatePresence>
        {selectedGame && selectedDate && (
          <>
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.38)',
                zIndex: 1100,
              }}
            />

            <div
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 1200,
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'center',
                overflowY: 'auto',
                padding: 'calc(env(safe-area-inset-top, 0px) + 12px) 16px calc(env(safe-area-inset-bottom, 0px) + 12px)',
                pointerEvents: 'none',
              }}
            >
              <motion.div
                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                style={{
                  width: 'min(640px, calc(100vw - 32px))',
                  maxHeight: 'calc(100dvh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - 24px)',
                  overflow: 'hidden',
                  background: 'white',
                  borderRadius: '24px',
                  boxShadow: '0 20px 48px rgba(15, 23, 42, 0.22)',
                  pointerEvents: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  margin: '0 auto',
                }}
              >
                {(() => {
                  const awayTeamInfo = getTeamByName(selectedGame.awayTeam);
                  const homeTeamInfo = getTeamByName(selectedGame.homeTeam);
                  const result = buildResultSummary(selectedGame);
                  const pitcherDisplay = buildPitcherDisplay(selectedGame);
                  const cancelledMessage = getCancelledMessage(selectedGame);
                  const awayResultTone = getResultTone(result?.away ?? null);
                  const homeResultTone = getResultTone(result?.home ?? null);

                  return (
                    <>
                      <div
                        style={{
                          position: 'sticky',
                          top: 0,
                          zIndex: 2,
                          background: 'rgba(255, 255, 255, 0.88)',
                          backdropFilter: 'blur(16px)',
                          WebkitBackdropFilter: 'blur(16px)',
                          padding: '16px 20px 14px',
                          borderBottom: '1px solid rgba(226, 232, 240, 0.9)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                          <p style={{ fontSize: '15px', color: 'var(--text-light)', fontWeight: 700 }}>
                            {formatModalHeadline(selectedGame.date, selectedGame.dayOfWeek)}
                          </p>
                          <button
                            onClick={closeModal}
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '9999px',
                              background: 'var(--background)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            <X size={18} />
                          </button>
                        </div>
                      </div>

                      <div style={{ overflowY: 'auto', padding: '18px 20px 28px' }}>
                        <section>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              marginBottom: '18px',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-light)', fontSize: '13px' }}>
                              <MapPin size={15} />
                              <span>{selectedGame.stadium}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {selectedAttendanceRecord?.isAttending && (
                                <span
                                  style={{
                                    fontSize: '12px',
                                    fontWeight: 800,
                                    padding: '5px 10px',
                                    borderRadius: '9999px',
                                    background: myTeam.bgSecondary,
                                    color: myTeam.color,
                                  }}
                                >
                                  직관
                                </span>
                              )}
                              <span
                                style={{
                                  fontSize: '12px',
                                  fontWeight: 700,
                                  padding: '5px 10px',
                                  borderRadius: '9999px',
                                  background: 'var(--background)',
                                }}
                              >
                                {selectedGame.status === 'finished'
                                  ? '경기 종료'
                                  : selectedGame.status === 'cancelled'
                                    ? (selectedGame.note || '경기 취소')
                                    : `${selectedGame.time} 예정`}
                              </span>
                            </div>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                            <div style={{ flex: 1, textAlign: 'center', minWidth: 0 }}>
                              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
                                <TeamLogo team={awayTeamInfo ?? null} size={56} />
                              </div>
                              <div style={{ fontSize: '18px', fontWeight: 800, marginBottom: '4px' }}>{selectedGame.awayTeam}</div>
                              {result && (
                                <div
                                  style={{
                                    fontSize: '14px',
                                    color: awayResultTone.color,
                                    fontWeight: awayResultTone.fontWeight,
                                    marginBottom: '6px',
                                  }}
                                >
                                  {result.away}
                                </div>
                              )}
                              {selectedGame.status === 'finished' && pitcherDisplay.mode === 'decision' && pitcherDisplay.away && (
                                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>
                                  {pitcherDisplay.away.name}
                                </div>
                              )}
                            </div>

                            <div style={{ minWidth: '112px', textAlign: 'center' }}>
                              {selectedGame.status === 'finished' ? (
                                <div style={{ fontSize: '44px', fontWeight: 900, lineHeight: 1 }}>
                                  <span>{selectedGame.awayScore}</span>
                                  <span style={{ color: 'var(--border)', margin: '0 6px' }}>:</span>
                                  <span>{selectedGame.homeScore}</span>
                                </div>
                              ) : selectedGame.status === 'cancelled' ? (
                                <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--error)' }}>
                                  취소
                                </div>
                              ) : (
                                <div style={{ fontSize: '32px', fontWeight: 900, color: 'var(--border)' }}>
                                  VS
                                </div>
                              )}
                            </div>

                            <div style={{ flex: 1, textAlign: 'center', minWidth: 0 }}>
                              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
                                <TeamLogo team={homeTeamInfo ?? null} size={56} />
                              </div>
                              <div style={{ fontSize: '18px', fontWeight: 800, marginBottom: '4px' }}>{selectedGame.homeTeam}</div>
                              {result && (
                                <div
                                  style={{
                                    fontSize: '14px',
                                    color: homeResultTone.color,
                                    fontWeight: homeResultTone.fontWeight,
                                    marginBottom: '6px',
                                  }}
                                >
                                  {result.home}
                                </div>
                              )}
                              {selectedGame.status === 'finished' && pitcherDisplay.mode === 'decision' && pitcherDisplay.home && (
                                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>
                                  {pitcherDisplay.home.name}
                                </div>
                              )}
                            </div>
                          </div>

                          {selectedGame.status === 'cancelled' && cancelledMessage && (
                            <div
                              style={{
                                marginTop: '18px',
                                padding: '12px 14px',
                                borderRadius: '14px',
                                background: '#FFF4F4',
                                color: 'var(--error)',
                                fontSize: '14px',
                                fontWeight: 700,
                                textAlign: 'center',
                              }}
                            >
                              {cancelledMessage}
                            </div>
                          )}

                          {selectedGame.status === 'finished' && pitcherDisplay.mode === 'draw' && (
                            <div
                              style={{
                                marginTop: '18px',
                                padding: '12px 14px',
                                borderRadius: '14px',
                                background: 'var(--background)',
                                fontSize: '13px',
                                fontWeight: 700,
                                color: 'var(--text-light)',
                                textAlign: 'center',
                              }}
                            >
                              <strong style={{ color: 'var(--text)' }}>{pitcherDisplay.summaryLabel}</strong>
                              <span> · {pitcherDisplay.summaryText}</span>
                            </div>
                          )}
                        </section>

                        {isMyTeamGame && selectedGame.status === 'finished' && (
                          <>
                            <div style={sectionDividerStyle} />
                            <button
                              onClick={() => setIsDiaryModalOpen(true)}
                              style={{
                                width: '100%',
                                textAlign: 'left',
                                padding: '16px 18px',
                                borderRadius: '18px',
                                background: '#FEF2F2',
                                color: '#BE123C',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '14px',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                                <div
                                  style={{
                                    width: '38px',
                                    height: '38px',
                                    borderRadius: '9999px',
                                    background: '#FFFFFF',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '18px',
                                    flexShrink: 0,
                                  }}
                                >
                                  ✍️
                                </div>
                                <div style={{ minWidth: 0 }}>
                                  <div style={{ fontSize: '15px', fontWeight: 800, marginBottom: '4px' }}>
                                    {selectedDiaryRecord?.review ? '내 일기 보러가기' : '야구 일기 작성하기'}
                                  </div>
                                  <div style={{ fontSize: '13px', color: '#9F1239', lineHeight: 1.45 }}>
                                    {selectedDiaryRecord?.review
                                      ? selectedDiaryRecord.review
                                      : '이 경기의 감동을 기록으로 남겨보세요.'}
                                  </div>
                                </div>
                              </div>
                              <ChevronRight size={18} color="#BE123C" />
                            </button>
                          </>
                        )}

                        {isMyTeamGame && selectedGame.status !== 'cancelled' && (
                          <>
                            <div style={sectionDividerStyle} />
                            <section>
                              <h4 style={{ fontSize: '18px', marginBottom: '14px' }}>내 팀 상세 정보</h4>

                              {lineupLoading && !lineupLoaded ? (
                                <p style={{ color: 'var(--text-light)', fontSize: '14px' }}>
                                  라인업 데이터를 불러오는 중이에요.
                                </p>
                              ) : (
                                <>
                                  {lineup?.startingPitcher && (
                                    <div style={{ padding: '14px 16px', borderRadius: '16px', background: 'var(--background)', marginBottom: '14px' }}>
                                      <div style={{ fontSize: '12px', color: 'var(--text-light)', marginBottom: '4px' }}>선발 투수</div>
                                      <div style={{ fontSize: '16px', fontWeight: 800 }}>{lineup.startingPitcher.name}</div>
                                    </div>
                                  )}

                                  {!lineup?.isLineupOut ? (
                                    <p style={{ color: 'var(--text-light)', fontSize: '14px' }}>
                                      {selectedGame.status === 'finished'
                                        ? getLineupEmptyMessage(selectedGame.status)
                                        : '선발 라인업은 경기 전 공개되면 여기에 보여드려요.'}
                                    </p>
                                  ) : lineup.battingOrder.length > 0 ? (
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 10px' }}>
                                      {getLineupColumns(lineup.battingOrder).map((column, columnIndex) => (
                                        <div key={columnIndex} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                          {column.map((batter) => (
                                            <div
                                              key={`${batter.order}-${batter.name}`}
                                              style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                padding: '8px 10px',
                                                borderRadius: '10px',
                                                background: 'var(--background)',
                                                fontSize: '13px',
                                              }}
                                            >
                                              <span style={{ fontWeight: 800, color: myTeam.color }}>{batter.order}</span>
                                              <span style={{ color: 'var(--text-light)', minWidth: '32px', fontSize: '12px' }}>{batter.position}</span>
                                              <span style={{ fontWeight: 700, fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {batter.name}
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p style={{ color: 'var(--text-light)', fontSize: '14px' }}>
                                      라인업 상세 데이터를 정리하는 중이에요.
                                    </p>
                                  )}
                                </>
                              )}
                            </section>
                          </>
                        )}

                        <div style={sectionDividerStyle} />
                        <section>
                          <h4 style={{ fontSize: '18px', marginBottom: '12px' }}>같은 날 다른 경기 결과</h4>

                          {isPreRegularSeason(selectedGame.date) && (
                            <div
                              style={{
                                marginBottom: '12px',
                                padding: '12px',
                                borderRadius: '12px',
                                background: 'var(--background)',
                                fontSize: '12px',
                                color: 'var(--text-light)',
                                lineHeight: 1.5,
                              }}
                            >
                              2026년 3월 28일 이전은 정규시즌 전 경기 구간이라, KBO 원본에서 선발 라인업과 승리/패전투수 상세 데이터가 같은 방식으로 안정적으로 제공되지 않을 수 있어요.
                            </div>
                          )}

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {selectedDateGames.map((game) => {
                              const resultInfo = buildResultSummary(game);
                              const pitcherDisplay = buildPitcherDisplay(game);
                              const isActive = getGameKey(game) === selectedGameKey;
                              const awayTone = getResultTone(resultInfo?.away ?? null);
                              const homeTone = getResultTone(resultInfo?.home ?? null);
                              const cancelledMessage = getCancelledMessage(game);

                              return (
                                <button
                                  key={getGameKey(game)}
                                  onClick={() => setSelectedGameKey(getGameKey(game))}
                                  style={{
                                    width: '100%',
                                    textAlign: 'left',
                                    padding: '12px 10px',
                                    borderRadius: '14px',
                                    background: isActive ? 'rgba(248, 250, 252, 1)' : 'transparent',
                                  }}
                                >
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                                    <div style={{ flex: 1 }}>
                                      <div style={{ fontSize: '14px', fontWeight: 800, marginBottom: '4px' }}>
                                        {game.awayTeam} VS {game.homeTeam}
                                      </div>
                                      <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>
                                        {game.stadium} · {game.status === 'finished'
                                          ? '종료'
                                          : game.status === 'cancelled'
                                            ? (game.note || '경기 취소')
                                            : `${game.time} 시작`}
                                      </div>
                                      {game.status === 'finished' && (
                                        <div style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '4px' }}>
                                          {pitcherDisplay.mode === 'draw'
                                            ? '무승부 · 승패투수 없음'
                                            : `${game.winningPitcherName || '정보 없음'} 승 · ${game.losingPitcherName || '정보 없음'} 패`}
                                        </div>
                                      )}
                                      {game.status === 'cancelled' && cancelledMessage && (
                                        <div style={{ fontSize: '11px', color: 'var(--error)', marginTop: '6px', fontWeight: 700 }}>
                                          {cancelledMessage}
                                        </div>
                                      )}
                                    </div>

                                    <div style={{ textAlign: 'right' }}>
                                      {game.status === 'finished' ? (
                                        <>
                                          <div style={{ fontSize: '18px', fontWeight: 900 }}>
                                            {game.awayScore} : {game.homeScore}
                                          </div>
                                          {resultInfo && (
                                            <div style={{ fontSize: '11px', marginTop: '2px' }}>
                                              <span style={{ color: awayTone.color, fontWeight: awayTone.fontWeight }}>
                                                {game.awayTeam} {resultInfo.away}
                                              </span>
                                              <span style={{ color: 'var(--text-light)' }}> · </span>
                                              <span style={{ color: homeTone.color, fontWeight: homeTone.fontWeight }}>
                                                {game.homeTeam} {resultInfo.home}
                                              </span>
                                            </div>
                                          )}
                                        </>
                                      ) : game.status === 'cancelled' ? (
                                        <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--error)' }}>
                                          취소
                                        </div>
                                      ) : (
                                        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-light)' }}>
                                          경기 전
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </section>
                      </div>
                    </>
                  );
                })()}
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      <DiaryModal
        isOpen={isDiaryModalOpen}
        onClose={() => setIsDiaryModalOpen(false)}
        myTeamId={myTeam.id}
        selectedGame={selectedGame}
        selectedDate={selectedDate ?? ''}
        onDateChange={handleDiaryDateChange}
        finishedGames={schedules.filter(
          (game) =>
            game.status === 'finished' &&
            (TEAM_NAME_TO_ID[game.homeTeam] === myTeam.id || TEAM_NAME_TO_ID[game.awayTeam] === myTeam.id)
        )}
        currentRecord={selectedDiaryRecord}
        attendanceLabel={attendanceLabel}
        year={visibleMonth.getFullYear()}
      />
    </div>
  );
}
