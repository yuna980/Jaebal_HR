'use client';

import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarDays, ChevronLeft, ChevronRight, Loader2, MapPin, X } from 'lucide-react';
import { useTeam } from '@/context/TeamContext';
import TeamLogo from '@/components/TeamLogo';
import { useKboLineup } from '@/hooks/useKboExtra';
import { useGameScheduleMonth } from '@/hooks/useGameScheduleMonth';
import { getTodayDateString } from '@/hooks/useKboSchedule';
import { KboMatch, TEAM_NAME_TO_ID } from '@/lib/kboScraper';
import { KBO_TEAMS } from '@/data/teams';
import DiaryModal from '@/components/DiaryModal';
import { findRecordForDate, formatDiaryDate, useFanDiaryRecords } from '@/lib/fanDiary';
import { findAttendanceRecord, useAttendanceRecords } from '@/lib/attendance';

interface CalendarCell {
  key: string;
  label: string;
  date: string | null;
  isCurrentMonth: boolean;
  isToday: boolean;
  games: KboMatch[];
}

function getMonthLabel(date: Date) {
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
}

function buildCalendarCells(baseDate: Date, schedules: KboMatch[], todayStr: string): CalendarCell[] {
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

    return {
      key: isCurrentMonth ? date! : `empty-${year}-${month}-${index}`,
      label: isCurrentMonth ? String(dayNumber) : '',
      date,
      isCurrentMonth,
      isToday: date === todayStr,
      games: date ? schedules.filter((game) => game.date === date) : [],
    };
  });
}

type GameResultLabel = '승' | '패' | '무';

function getResultLabel(game: KboMatch): { away: GameResultLabel; home: GameResultLabel } | null {
  if (game.status !== 'finished') return null;

  const awayScore = game.awayScore ?? 0;
  const homeScore = game.homeScore ?? 0;

  return {
    away: awayScore > homeScore ? '승' : awayScore < homeScore ? '패' : '무',
    home: homeScore > awayScore ? '승' : homeScore < awayScore ? '패' : '무',
  };
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

function getPitcherLabel(teamResult: '승' | '패' | '무' | null) {
  if (teamResult === '승') return '승';
  if (teamResult === '패') return '패';
  return null;
}

function getPitcherName(game: KboMatch, teamResult: '승' | '패' | '무' | null) {
  if (teamResult === '승') return game.winningPitcherName || '정보 없음';
  if (teamResult === '패') return game.losingPitcherName || '정보 없음';
  return null;
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
  const todayStr = getTodayDateString();

  const calendarCells = useMemo(
    () => buildCalendarCells(visibleMonth, schedules, todayStr),
    [visibleMonth, schedules, todayStr]
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

  const { lineup } = useKboLineup(isMyTeamGame ? myTeam?.id : undefined, selectedGame?.date ?? '');

  if (!myTeam) return null;

  const openDayModal = (date: string, games: KboMatch[]) => {
    if (games.length === 0) return;

    const preferredGame =
      games.find(
        (game) =>
          TEAM_NAME_TO_ID[game.homeTeam] === myTeam.id || TEAM_NAME_TO_ID[game.awayTeam] === myTeam.id
      ) ?? games[0];

    setSelectedDate(date);
    setSelectedGameKey(getGameKey(preferredGame));
  };

  const handleDiaryDateChange = (date: string) => {
    const games = schedules.filter((game) => game.date === date);
    if (games.length === 0) return;

    const preferredGame =
      games.find(
        (game) =>
          TEAM_NAME_TO_ID[game.homeTeam] === myTeam.id || TEAM_NAME_TO_ID[game.awayTeam] === myTeam.id
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
  const selectedFullDate = selectedDate ? formatDiaryDate(visibleMonth.getFullYear(), selectedDate) : '';
  const selectedDiaryRecord =
    selectedDate && myTeam ? findRecordForDate(diaryRecords, myTeam.id, selectedFullDate) : null;
  const selectedAttendanceRecord =
    selectedDate && myTeam ? findAttendanceRecord(attendanceRecords, myTeam.id, selectedFullDate) : null;
  const attendanceLabel = selectedAttendanceRecord?.isAttending ? '직관' : '중계';

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

      <div className="card" style={{ padding: '14px', marginBottom: '16px' }}>
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
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '6px',
            marginBottom: '8px',
          }}
        >
          {['일', '월', '화', '수', '목', '금', '토'].map((label) => (
            <div
              key={label}
              style={{
                textAlign: 'center',
                fontSize: '12px',
                fontWeight: 800,
                color: 'var(--text-light)',
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
              gridTemplateColumns: 'repeat(7, 1fr)',
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

              return (
                <button
                  key={cell.key}
                  onClick={() => cell.date && openDayModal(cell.date, cell.games)}
                  disabled={!cell.isCurrentMonth || !hasGames}
                  style={{
                    minHeight: '98px',
                    borderRadius: '14px',
                    padding: '8px',
                    background: cell.isCurrentMonth
                      ? cell.isToday
                        ? myTeam.bgSecondary
                        : 'white'
                      : 'rgba(255,255,255,0.45)',
                    border: cell.isToday
                      ? `1.5px solid ${myTeam.color}`
                      : '1px solid var(--border)',
                    opacity: cell.isCurrentMonth ? 1 : 0.45,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'stretch',
                    gap: '6px',
                    cursor: !cell.isCurrentMonth || !hasGames ? 'default' : 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span
                      style={{
                        fontSize: '13px',
                        fontWeight: cell.isToday ? 800 : 700,
                        color: cell.isToday ? myTeam.color : 'var(--text)',
                      }}
                    >
                      {cell.label}
                    </span>
                    {hasGames && cell.isCurrentMonth ? (
                      <span
                        style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '9999px',
                          background: myGame ? myTeam.color : 'var(--text-light)',
                          opacity: 0.5,
                        }}
                      />
                    ) : null}
                  </div>

                  {cell.isCurrentMonth && myGame ? (
                    <div
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '6px 8px',
                        borderRadius: '10px',
                        background: myTeam.bgSecondary,
                        border: `1px solid ${myTeam.color}25`,
                        color: 'var(--text)',
                        fontSize: '11px',
                        fontWeight: 700,
                        lineHeight: 1.25,
                      }}
                    >
                      {myGame.awayTeam} VS {myGame.homeTeam}
                    </div>
                  ) : (
                    <div style={{ flex: 1 }} />
                  )}
                </button>
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
                alignItems: 'center',
                justifyContent: 'center',
                padding: '16px',
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
                  maxHeight: '82vh',
                  overflowY: 'auto',
                  background: 'white',
                  borderRadius: '24px',
                  padding: '20px 20px 28px',
                  boxShadow: '0 20px 48px rgba(15, 23, 42, 0.22)',
                  pointerEvents: 'auto',
                }}
              >
                {(() => {
                  const awayTeamInfo = getTeamByName(selectedGame.awayTeam);
                  const homeTeamInfo = getTeamByName(selectedGame.homeTeam);
                  const result = getResultLabel(selectedGame);
                  const cancelledMessage = getCancelledMessage(selectedGame);
                  const awayPitcherLabel = getPitcherLabel(result?.away ?? null);
                  const homePitcherLabel = getPitcherLabel(result?.home ?? null);
                  const awayPitcherName = getPitcherName(selectedGame, result?.away ?? null);
                  const homePitcherName = getPitcherName(selectedGame, result?.home ?? null);
                  const awayResultTone = getResultTone(result?.away ?? null);
                  const homeResultTone = getResultTone(result?.home ?? null);

                  return (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
                        <div>
                          <p style={{ fontSize: '13px', color: 'var(--text-light)', marginBottom: '6px' }}>
                            {selectedGame.date} · {selectedGame.dayOfWeek}요일
                          </p>
                          <h3 style={{ fontSize: '22px' }}>
                            {selectedGame.awayTeam} VS {selectedGame.homeTeam}
                          </h3>
                        </div>
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
                          }}
                        >
                          <X size={18} />
                        </button>
                      </div>

                      <div
                        style={{
                          background: 'linear-gradient(135deg, #FAFBFC 0%, #FFFFFF 100%)',
                          border: '1px solid var(--border)',
                          borderRadius: '20px',
                          padding: '18px',
                          marginBottom: '16px',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: '14px',
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
                                  : `${selectedGame.time} 시작`}
                            </span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                          <div style={{ flex: 1, textAlign: 'center' }}>
                            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
                              <TeamLogo team={awayTeamInfo ?? null} size={52} />
                            </div>
                            <div style={{ fontSize: '16px', fontWeight: 800 }}>{selectedGame.awayTeam}</div>
                            {result && (
                              <div
                                style={{
                                  marginTop: '6px',
                                  fontSize: '14px',
                                  color: awayResultTone.color,
                                  fontWeight: awayResultTone.fontWeight,
                                }}
                              >
                                {result.away}
                              </div>
                            )}
                          </div>

                          <div style={{ minWidth: '84px', textAlign: 'center' }}>
                            {selectedGame.status === 'finished' ? (
                              <div style={{ fontSize: '28px', fontWeight: 800 }}>
                                <span>{selectedGame.awayScore}</span>
                                <span style={{ color: 'var(--border)', margin: '0 6px' }}>:</span>
                                <span>{selectedGame.homeScore}</span>
                              </div>
                            ) : selectedGame.status === 'cancelled' ? (
                              <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--error)' }}>
                                취소
                              </div>
                            ) : (
                              <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--border)' }}>VS</div>
                            )}
                          </div>

                          <div style={{ flex: 1, textAlign: 'center' }}>
                            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
                              <TeamLogo team={homeTeamInfo ?? null} size={52} />
                            </div>
                            <div style={{ fontSize: '16px', fontWeight: 800 }}>{selectedGame.homeTeam}</div>
                            {result && (
                              <div
                                style={{
                                  marginTop: '6px',
                                  fontSize: '14px',
                                  color: homeResultTone.color,
                                  fontWeight: homeResultTone.fontWeight,
                                }}
                              >
                                {result.home}
                              </div>
                            )}
                          </div>
                        </div>

                        {selectedGame.status === 'cancelled' && cancelledMessage && (
                          <div
                            style={{
                              marginTop: '14px',
                              paddingTop: '14px',
                              borderTop: '1px solid var(--border)',
                            }}
                          >
                            <div
                              style={{
                                padding: '12px 14px',
                                borderRadius: '12px',
                                background: '#FFF4F4',
                                color: 'var(--error)',
                                fontSize: '14px',
                                fontWeight: 700,
                                textAlign: 'center',
                              }}
                            >
                              {cancelledMessage}
                            </div>
                          </div>
                        )}

                        {selectedGame.status === 'finished' && (
                          <div
                            style={{
                              marginTop: '14px',
                              paddingTop: '14px',
                              borderTop: '1px solid var(--border)',
                              display: 'grid',
                              gridTemplateColumns: '1fr 1fr',
                              gap: '10px',
                            }}
                          >
                            <div style={{ padding: '10px 12px', borderRadius: '12px', background: 'var(--background)' }}>
                              <div
                                style={{
                                  fontSize: '12px',
                                  color: awayResultTone.color,
                                  fontWeight: awayResultTone.fontWeight,
                                  marginBottom: '4px',
                                }}
                              >
                                {awayPitcherLabel ?? '-'}
                              </div>
                              <div style={{ fontSize: '14px', fontWeight: 800 }}>
                                {awayPitcherName ?? '정보 없음'}
                              </div>
                            </div>
                            <div style={{ padding: '10px 12px', borderRadius: '12px', background: 'var(--background)' }}>
                              <div
                                style={{
                                  fontSize: '12px',
                                  color: homeResultTone.color,
                                  fontWeight: homeResultTone.fontWeight,
                                  marginBottom: '4px',
                                }}
                              >
                                {homePitcherLabel ?? '-'}
                              </div>
                              <div style={{ fontSize: '14px', fontWeight: 800 }}>
                                {homePitcherName ?? '정보 없음'}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {isMyTeamGame && selectedGame.status === 'finished' && (
                        <div className="card" style={{ marginBottom: '16px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                            <h4 style={{ fontSize: '16px' }}>야구 일기</h4>
                          </div>

                          {selectedDiaryRecord?.review ? (
                            <>
                              <div
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  padding: '5px 10px',
                                  borderRadius: '9999px',
                                  background: 'var(--background)',
                                  fontSize: '12px',
                                  fontWeight: 800,
                                  color: selectedAttendanceRecord?.isAttending ? myTeam.color : 'var(--text-light)',
                                  marginBottom: '10px',
                                }}
                              >
                                {attendanceLabel}
                              </div>
                              <div
                                onClick={() => setIsDiaryModalOpen(true)}
                                style={{
                                  padding: '14px',
                                  borderRadius: '14px',
                                  background: 'var(--background)',
                                  cursor: 'pointer',
                                }}
                              >
                                <div style={{ fontSize: '14px', lineHeight: 1.6, marginBottom: '8px' }}>
                                  {selectedDiaryRecord.review}
                                </div>
                                <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>
                                  평점 {selectedDiaryRecord.rating}점 · 눌러서 수정하기
                                </div>
                              </div>
                            </>
                          ) : (
                            <div
                              style={{
                                padding: '14px',
                                borderRadius: '14px',
                                background: 'var(--background)',
                                fontSize: '14px',
                                color: 'var(--text-light)',
                              }}
                            >
                              <div style={{ marginBottom: '10px' }}>
                                아직 이 경기 야구일기를 작성하지 않았어요.
                              </div>
                              <button
                                onClick={() => setIsDiaryModalOpen(true)}
                                style={{
                                  fontSize: '13px',
                                  fontWeight: 800,
                                  color: myTeam.color,
                                }}
                              >
                                야구일기 작성하기
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {isMyTeamGame && selectedGame.status !== 'cancelled' && (
                        <div className="card" style={{ marginBottom: '16px' }}>
                        <h4 style={{ fontSize: '16px', marginBottom: '12px' }}>내 팀 상세 정보</h4>

                        {lineup?.startingPitcher && (
                          <div style={{ padding: '12px', borderRadius: '12px', background: 'var(--background)', marginBottom: '12px' }}>
                            <div style={{ fontSize: '12px', color: 'var(--text-light)', marginBottom: '4px' }}>선발 투수</div>
                            <div style={{ fontSize: '16px', fontWeight: 800 }}>{lineup.startingPitcher.name}</div>
                          </div>
                        )}

                        {!lineup?.isLineupOut ? (
                          <p style={{ color: 'var(--text-light)', fontSize: '14px' }}>
                            아직 라인업이 발표되지 않았어요.
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
                                    <span style={{ color: 'var(--text-light)', minWidth: '28px' }}>{batter.position}</span>
                                    <span style={{ fontWeight: 700 }}>{batter.name}</span>
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
                      </div>
                    )}

                      <div className="card" style={{ marginBottom: 0 }}>
                        <h4 style={{ fontSize: '16px', marginBottom: '12px' }}>같은 날 다른 경기 결과</h4>

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
                          const resultInfo = getResultLabel(game);
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
                                padding: '12px',
                                borderRadius: '14px',
                                border: isActive ? `1.5px solid ${myTeam.color}` : '1px solid var(--border)',
                                background: isActive ? myTeam.bgSecondary : 'white',
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
                                    <div style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '6px' }}>
                                      {game.winningPitcherName || '정보 없음'} 승 · {game.losingPitcherName || '정보 없음'} 패
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
                                      <div style={{ fontSize: '16px', fontWeight: 800 }}>
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
        key={`schedule-${isDiaryModalOpen ? 'open' : 'closed'}-${selectedDate ?? ''}-${selectedDiaryRecord?.review ?? ''}-${selectedDiaryRecord?.rating ?? 0}-${selectedAttendanceRecord?.isAttending ? 'attend' : 'watch'}`}
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
