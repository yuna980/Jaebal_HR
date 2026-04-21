'use client';

import { useTeam } from '@/context/TeamContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CloudRain, MapPin, Navigation, Info, ChevronRight, Loader2 } from 'lucide-react';
import { useKboSchedule, getTodayDateString } from '@/hooks/useKboSchedule';
import { useKboLineup, useKboRoster } from '@/hooks/useKboExtra';
import { KboMatch, TEAM_NAME_TO_ID } from '@/lib/kboScraper';
import { KBO_TEAMS } from '@/data/teams';

export default function Dashboard() {
  const { myTeam, isGoingToday, setIsGoingToday } = useTeam();
  const router = useRouter();
  const { schedules, loading, error } = useKboSchedule();
  
  const todayStr = getTodayDateString();
  const { lineup } = useKboLineup(myTeam?.id, todayStr);
  const { roster } = useKboRoster(myTeam?.id);

  useEffect(() => {
    if (!myTeam) {
      router.push('/');
    }
  }, [myTeam, router]);

  if (!myTeam) return null;

  // 오늘 내 팀 경기 찾기
  const myTeamGame = schedules.find(
    (m) =>
      m.date === todayStr &&
      (TEAM_NAME_TO_ID[m.homeTeam] === myTeam.id || TEAM_NAME_TO_ID[m.awayTeam] === myTeam.id)
  );

  // 상대 팀 정보 가져오기
  const opponentName = myTeamGame
    ? TEAM_NAME_TO_ID[myTeamGame.homeTeam] === myTeam.id
      ? myTeamGame.awayTeam
      : myTeamGame.homeTeam
    : null;

  const opponentId = opponentName ? TEAM_NAME_TO_ID[opponentName] : null;
  const opponentTeam = opponentId ? KBO_TEAMS.find((t) => t.id === opponentId) : null;

  // 내 팀이 홈인지 어웨이인지
  const isHome = myTeamGame ? TEAM_NAME_TO_ID[myTeamGame.homeTeam] === myTeam.id : false;

  // 최근 전적 계산 (이번 달 내 팀 경기 결과)
  const myTeamResults = schedules
    .filter(
      (m) =>
        m.status === 'finished' &&
        (TEAM_NAME_TO_ID[m.homeTeam] === myTeam.id || TEAM_NAME_TO_ID[m.awayTeam] === myTeam.id)
    )
    .slice(-5)
    .map((m) => {
      const isMyTeamHome = TEAM_NAME_TO_ID[m.homeTeam] === myTeam.id;
      const myScore = isMyTeamHome ? m.homeScore! : m.awayScore!;
      const oppScore = isMyTeamHome ? m.awayScore! : m.homeScore!;
      return myScore > oppScore ? '승' : myScore < oppScore ? '패' : '무';
    });

  // 오늘 날짜 포맷
  const today = new Date();
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const dateDisplay = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일 (${days[today.getDay()]})`;

  // vs 상대 최근 전적 계산
  const vsOpponentResults = opponentName
    ? schedules
        .filter(
          (m) =>
            m.status === 'finished' &&
            ((TEAM_NAME_TO_ID[m.homeTeam] === myTeam.id && m.awayTeam === opponentName) ||
              (TEAM_NAME_TO_ID[m.awayTeam] === myTeam.id && m.homeTeam === opponentName))
        )
        .slice(-5)
        .map((m) => {
          const isMyTeamHome = TEAM_NAME_TO_ID[m.homeTeam] === myTeam.id;
          const myScore = isMyTeamHome ? m.homeScore! : m.awayScore!;
          const oppScore = isMyTeamHome ? m.awayScore! : m.homeScore!;
          return myScore > oppScore ? '승' : myScore < oppScore ? '패' : '무';
        })
    : [];

  const wins = vsOpponentResults.filter((r) => r === '승').length;
  const losses = vsOpponentResults.filter((r) => r === '패').length;

  return (
    <div className="container">
      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '24px', color: myTeam.color }}>오늘의 {myTeam.name}</h2>
          <p style={{ color: 'var(--text-light)', fontSize: '14px' }}>{dateDisplay}</p>
        </div>
        <div style={{ fontSize: '32px' }}>{myTeam.logo}</div>
      </header>

      {/* Loading State */}
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
            경기 정보를 불러오고 있어요... ⚾
          </p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="card" style={{ textAlign: 'center', padding: '32px 20px' }}>
          <p style={{ fontSize: '16px', marginBottom: '8px' }}>😢</p>
          <p style={{ color: 'var(--text-light)', fontSize: '14px' }}>{error}</p>
        </div>
      )}

      {/* No Game Today */}
      {!loading && !error && !myTeamGame && (
        <div className="card" style={{ textAlign: 'center', padding: '32px 20px' }}>
          <p style={{ fontSize: '48px', marginBottom: '12px' }}>😴</p>
          <p style={{ fontWeight: '800', fontSize: '18px', marginBottom: '4px' }}>오늘은 경기가 없어요</p>
          <p style={{ color: 'var(--text-light)', fontSize: '14px' }}>대진표에서 다음 경기를 확인해보세요!</p>
        </div>
      )}

      {/* Today's Match Card */}
      {!loading && myTeamGame && (
        <>
          <motion.div
            className="card"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ background: `linear-gradient(135deg, ${myTeam.bgSecondary} 0%, #ffffff 100%)`, border: `2px solid ${myTeam.color}20` }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px', fontWeight: 'bold', color: myTeam.color }}>
                <MapPin size={16} />
                <span>{myTeamGame.stadium}</span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-light)', background: 'var(--border)', padding: '4px 10px', borderRadius: '12px', fontWeight: 600 }}>
                {myTeamGame.day}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', margin: '20px 0' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '40px', marginBottom: '8px' }}>
                  {isHome ? myTeam.logo : (opponentTeam?.logo || '🧢')}
                </div>
                <div style={{ fontWeight: '800' }}>{isHome ? myTeam.name : opponentName}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                {myTeamGame.status === 'finished' ? (
                  <div style={{ fontSize: '28px', fontWeight: '800' }}>
                    <span style={{ color: (myTeamGame.awayScore ?? 0) > (myTeamGame.homeScore ?? 0) ? 'var(--success)' : 'var(--text-light)' }}>
                      {myTeamGame.awayScore}
                    </span>
                    <span style={{ color: 'var(--border)', margin: '0 8px' }}>:</span>
                    <span style={{ color: (myTeamGame.homeScore ?? 0) > (myTeamGame.awayScore ?? 0) ? 'var(--success)' : 'var(--text-light)' }}>
                      {myTeamGame.homeScore}
                    </span>
                  </div>
                ) : (
                  <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--border)' }}>VS</div>
                )}
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '40px', marginBottom: '8px' }}>
                  {isHome ? (opponentTeam?.logo || '🧢') : myTeam.logo}
                </div>
                <div style={{ fontWeight: '800' }}>{isHome ? opponentName : myTeam.name}</div>
                <div style={{ fontSize: '12px', color: 'white', background: 'var(--primary)', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold', display: 'inline-block', marginTop: '4px' }}>홈</div>
              </div>
            </div>

            <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.5)', padding: '10px', borderRadius: 'var(--radius-sm)', fontSize: '14px' }}>
              {myTeamGame.status === 'finished' ? (
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
              ) : (
                <span>오늘 경기 <strong>{myTeamGame.time}</strong> 시작!</span>
              )}
            </div>
          </motion.div>

          {/* Attendance Toggle */}
          {myTeamGame.status === 'scheduled' && (
            <>
              <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: '16px' }}>오늘 직관 가시나요?</h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-light)' }}>체크하면 꿀팁을 알려드려요!</p>
                </div>
                <button
                  onClick={() => setIsGoingToday(!isGoingToday)}
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
          {lineup && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card" style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '16px' }}>오늘의 선발 라인업</h3>
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

      {/* Recent Match History (vs Opponent) */}
      {!loading && opponentName && vsOpponentResults.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '18px' }}>상대 전적 (vs {opponentName})</h3>
          </div>
          <div className="card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
              {vsOpponentResults.map((res, i) => (
                <div
                  key={i}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: res === '승' ? 'var(--success)' : res === '패' ? 'var(--error)' : 'var(--border)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    fontSize: '14px',
                  }}
                >
                  {res}
                </div>
              ))}
            </div>
            <p style={{ textAlign: 'center', marginTop: '12px', fontSize: '14px' }}>
              {wins > losses
                ? <>최근 전적 <strong>{wins}승 {losses}패</strong>로 앞서고 있어요! 🔥</>
                : wins < losses
                ? <>최근 전적 <strong>{wins}승 {losses}패</strong>... 오늘은 이기자! 💪</>
                : <>최근 전적 <strong>{wins}승 {losses}패</strong> 호각세! ⚡</>
              }
            </p>
          </div>
        </div>
      )}

      {/* My Team Recent Results */}
      {!loading && myTeamResults.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '18px' }}>{myTeam.name} 최근 전적</h3>
            <span style={{ fontSize: '12px', color: 'var(--text-light)' }}>최근 {myTeamResults.length}경기</span>
          </div>
          <div className="card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
              {myTeamResults.map((res, i) => (
                <div
                  key={i}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: res === '승' ? 'var(--success)' : res === '패' ? 'var(--error)' : 'var(--border)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    fontSize: '14px',
                  }}
                >
                  {res}
                </div>
              ))}
            </div>
          </div>
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
