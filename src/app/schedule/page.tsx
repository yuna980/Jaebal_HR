'use client';

import { useTeam } from '@/context/TeamContext';
import { motion } from 'framer-motion';
import { CloudRain, MapPin, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useKboSchedule, getThisWeekDates, getTodayDateString } from '@/hooks/useKboSchedule';
import { useKboLineup } from '@/hooks/useKboExtra';
import { KboMatch, TEAM_NAME_TO_ID } from '@/lib/kboScraper';
import { KBO_TEAMS } from '@/data/teams';

export default function SchedulePage() {
  const { myTeam } = useTeam();
  const { schedules, loading, error } = useKboSchedule();
  const thisWeek = getThisWeekDates();
  const todayStr = getTodayDateString();

  // 오늘 날짜를 기본 선택
  const todayIndex = thisWeek.findIndex((d) => d.isToday);
  const [selectedDate, setSelectedDate] = useState(todayStr);

  const { lineup } = useKboLineup(myTeam?.id, selectedDate);

  if (!myTeam) return null;

  // 이번 주 내 팀 경기 필터링
  const weekDates = new Set(thisWeek.map((d) => d.date));
  const myTeamWeekGames = schedules.filter(
    (m) =>
      weekDates.has(m.date) &&
      (TEAM_NAME_TO_ID[m.homeTeam] === myTeam.id || TEAM_NAME_TO_ID[m.awayTeam] === myTeam.id)
  );

  // 선택된 날의 내 팀 경기
  const selectedGame = myTeamWeekGames.find((m) => m.date === selectedDate);

  // 각 날짜에 경기가 있는지 표시
  const datesWithGame = new Set(myTeamWeekGames.map((m) => m.date));

  // 상대 팀 정보
  const getOpponentInfo = (game: KboMatch) => {
    const isMyHome = TEAM_NAME_TO_ID[game.homeTeam] === myTeam.id;
    const opponentName = isMyHome ? game.awayTeam : game.homeTeam;
    const opponentId = TEAM_NAME_TO_ID[opponentName];
    const opponentTeam = KBO_TEAMS.find((t) => t.id === opponentId);
    return { opponentName, opponentTeam, isMyHome };
  };

  // 경기 결과 텍스트
  const getResultText = (game: KboMatch) => {
    if (game.status !== 'finished') return null;
    const isMyHome = TEAM_NAME_TO_ID[game.homeTeam] === myTeam.id;
    const myScore = isMyHome ? game.homeScore! : game.awayScore!;
    const oppScore = isMyHome ? game.awayScore! : game.homeScore!;
    const result = myScore > oppScore ? 'W' : myScore < oppScore ? 'L' : 'D';
    return { result, myScore, oppScore };
  };

  return (
    <div className="container">
      <header style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', marginBottom: '8px' }}>이번 주 스케줄 🗓️</h2>
        <p style={{ color: 'var(--text-light)', fontSize: '14px' }}>{myTeam.name}의 경기를 놓치지 마세요!</p>
      </header>

      {/* Week Calendar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', overflowX: 'auto', paddingBottom: '8px', gap: '4px' }}>
        {thisWeek.map((item) => (
          <button
            key={item.date}
            onClick={() => setSelectedDate(item.date)}
            style={{
              flex: '1',
              minWidth: '46px',
              padding: '12px 0',
              borderRadius: 'var(--radius-md)',
              background: selectedDate === item.date ? myTeam.color : 'white',
              color: selectedDate === item.date ? 'white' : 'var(--text)',
              border: `2px solid ${selectedDate === item.date ? myTeam.color : 'var(--border)'}`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              position: 'relative',
            }}
          >
            <span style={{ fontSize: '10px', opacity: 0.8 }}>{item.dayOfWeek}</span>
            <span style={{ fontSize: '16px', fontWeight: '800' }}>{item.dateNum}</span>
            {/* 경기 있는 날 표시 점 */}
            {datesWithGame.has(item.date) && selectedDate !== item.date && (
              <div style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: myTeam.color,
                position: 'absolute',
                bottom: '6px',
              }} />
            )}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            style={{ display: 'inline-block' }}
          >
            <Loader2 size={32} color="var(--primary)" />
          </motion.div>
          <p style={{ color: 'var(--text-light)', marginTop: '12px', fontSize: '14px' }}>
            일정을 불러오고 있어요...
          </p>
        </div>
      )}

      {/* Selected Day Info */}
      {!loading && (
        <motion.div
          key={selectedDate}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="card"
          style={{ padding: '24px' }}
        >
          {!selectedGame ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <p style={{ fontSize: '32px', marginBottom: '8px' }}>😴</p>
              <p style={{ color: 'var(--text-light)', fontSize: '14px' }}>이 날은 {myTeam.name} 경기가 없어요</p>
            </div>
          ) : (
            (() => {
              const { opponentName, opponentTeam, isMyHome } = getOpponentInfo(selectedGame);
              const resultInfo = getResultText(selectedGame);
              return (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-light)', fontSize: '14px' }}>
                      <MapPin size={16} />
                      <span>{selectedGame.stadium} 야구장</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '32px', marginBottom: '24px' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '48px', marginBottom: '8px' }}>
                        {isMyHome ? (opponentTeam?.logo || '🧢') : myTeam.logo}
                      </div>
                      <div style={{ fontWeight: '800' }}>{isMyHome ? opponentName : myTeam.name}</div>
                    </div>

                    <div style={{ textAlign: 'center' }}>
                      {resultInfo ? (
                        <div style={{ fontSize: '28px', fontWeight: '800' }}>
                          <span style={{ color: resultInfo.myScore > resultInfo.oppScore ? 'var(--success)' : 'var(--text-light)' }}>
                            {isMyHome ? resultInfo.oppScore : resultInfo.myScore}
                          </span>
                          <span style={{ color: 'var(--border)', margin: '0 6px' }}>:</span>
                          <span style={{ color: resultInfo.oppScore > resultInfo.myScore ? 'var(--success)' : resultInfo.myScore > resultInfo.oppScore ? 'var(--text-light)' : 'var(--text)' }}>
                            {isMyHome ? resultInfo.myScore : resultInfo.oppScore}
                          </span>
                        </div>
                      ) : (
                        <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--border)' }}>VS</div>
                      )}
                    </div>

                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '48px', marginBottom: '8px' }}>
                        {isMyHome ? myTeam.logo : (opponentTeam?.logo || '🧢')}
                      </div>
                      <div style={{ fontWeight: '800' }}>{isMyHome ? myTeam.name : opponentName}</div>
                      <div style={{ fontSize: '11px', color: 'white', background: 'var(--primary)', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold', display: 'inline-block', marginTop: '4px' }}>홈</div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'center', background: 'var(--background)', padding: '12px', borderRadius: 'var(--radius-sm)', marginBottom: '16px' }}>
                    {resultInfo ? (
                      <div style={{ fontSize: '20px', fontWeight: '800', color: resultInfo.result === 'W' ? 'var(--success)' : resultInfo.result === 'L' ? 'var(--error)' : 'var(--text)' }}>
                        {resultInfo.result === 'W' ? `승리! (${resultInfo.myScore}:${resultInfo.oppScore})` :
                         resultInfo.result === 'L' ? `패배 (${resultInfo.myScore}:${resultInfo.oppScore})` :
                         `무승부 (${resultInfo.myScore}:${resultInfo.oppScore})`}
                      </div>
                    ) : (
                      <div style={{ fontSize: '20px', fontWeight: '800' }}>{selectedGame.time} 경기 시작</div>
                    )}
                  </div>

                  {lineup && (
                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '12px' }}>
                        <h3 style={{ fontSize: '16px' }}>선발 라인업</h3>
                      </div>
                      
                      {lineup.startingPitcher && (
                        <div style={{ background: 'var(--background)', borderRadius: 'var(--radius-sm)', padding: '12px', marginBottom: '16px' }}>
                          <div style={{ fontSize: '12px', color: 'var(--text-light)', marginBottom: '4px' }}>선발 투수</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '16px', fontWeight: 'bold' }}>{lineup.startingPitcher.name}</span>
                            <span style={{ fontSize: '12px', color: 'var(--text-light)' }}>
                              {lineup.startingPitcher.winLoss} / ERA {lineup.startingPitcher.era}
                            </span>
                          </div>
                        </div>
                      )}

                      {!lineup.isLineupOut ? (
                        <div style={{ textAlign: 'center', padding: '16px 0' }}>
                          <p style={{ fontSize: '24px', marginBottom: '4px' }}>🤫</p>
                          <p style={{ fontSize: '14px', color: 'var(--text-light)', fontWeight: 'bold' }}>아직 라인업이 발표되지 않았습니다.</p>
                        </div>
                      ) : lineup.battingOrder && lineup.battingOrder.length > 0 ? (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                          {lineup.battingOrder.map((batter) => (
                            <div key={batter.order} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                              <span style={{ color: 'var(--primary)', fontWeight: 'bold', width: '12px' }}>{batter.order}</span>
                              <span style={{ color: 'var(--text-light)', fontSize: '10px', width: '16px' }}>{batter.position}</span>
                              <span style={{ fontWeight: '600' }}>{batter.name}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ textAlign: 'center', padding: '16px 0' }}>
                          <p style={{ fontSize: '14px', color: 'var(--text-light)' }}>KBO에서 상세 타순 데이터를 불러오는 중입니다.</p>
                        </div>
                      )}
                    </div>
                  )}
                </>
              );
            })()
          )}
        </motion.div>
      )}

      {/* All games for selected date */}
      {!loading && (
        <div style={{ marginTop: '24px' }}>
          <h3 style={{ fontSize: '18px', marginBottom: '12px' }}>
            {thisWeek.find((d) => d.date === selectedDate)?.date.replace('.', '월 ').concat('일')} 전체 경기
          </h3>
          {schedules
            .filter((m) => m.date === selectedDate)
            .map((game, index) => {
              const awayId = TEAM_NAME_TO_ID[game.awayTeam];
              const homeId = TEAM_NAME_TO_ID[game.homeTeam];
              const awayTeamInfo = KBO_TEAMS.find((t) => t.id === awayId);
              const homeTeamInfo = KBO_TEAMS.find((t) => t.id === homeId);
              const isMyGame =
                TEAM_NAME_TO_ID[game.homeTeam] === myTeam.id || TEAM_NAME_TO_ID[game.awayTeam] === myTeam.id;

              return (
                <div
                  key={index}
                  className="card"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    border: isMyGame ? `2px solid ${myTeam.color}40` : undefined,
                    background: isMyGame ? `${myTeam.bgSecondary}` : undefined,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                    <span style={{ fontSize: '20px' }}>{awayTeamInfo?.logo || '🧢'}</span>
                    <span style={{ fontWeight: '700', fontSize: '14px', minWidth: '32px' }}>{game.awayTeam}</span>
                    {game.status === 'finished' ? (
                      <span style={{ fontWeight: '800', fontSize: '16px', color: 'var(--text)' }}>
                        {game.awayScore} : {game.homeScore}
                      </span>
                    ) : (
                      <span style={{ fontWeight: '600', fontSize: '13px', color: 'var(--text-light)' }}>
                        {game.time}
                      </span>
                    )}
                    <span style={{ fontWeight: '700', fontSize: '14px', minWidth: '32px' }}>{game.homeTeam}</span>
                    <span style={{ fontSize: '20px' }}>{homeTeamInfo?.logo || '🧢'}</span>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-light)' }}>{game.stadium}</span>
                </div>
              );
            })}
          {schedules.filter((m) => m.date === selectedDate).length === 0 && (
            <div className="card" style={{ textAlign: 'center', padding: '20px' }}>
              <p style={{ color: 'var(--text-light)', fontSize: '14px' }}>이 날은 KBO 경기가 없어요</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
