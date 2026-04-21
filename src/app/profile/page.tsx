'use client';

import { useTeam } from '@/context/TeamContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Ticket, History, TrendingUp, ShoppingBag, ExternalLink, Star, X } from 'lucide-react';
import { useState } from 'react';
import { useKboSchedule } from '@/hooks/useKboSchedule';
import { TEAM_NAME_TO_ID } from '@/lib/kboScraper';

export default function ProfilePage() {
  const { myTeam } = useTeam();
  const { schedules } = useKboSchedule();
  
  const [history, setHistory] = useState([
    { date: '2026.04.12', venue: '수원', type: '중계', result: 'L', review: '역전패 실화냐...', rating: 2 },
    { date: '2026.04.10', venue: '잠실', type: '직관', result: 'W', review: '이닝 끝날 때 치킨 먹음 꿀맛!', rating: 5 },
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDiaryDate, setSelectedDiaryDate] = useState('');
  const [reviewText, setReviewText] = useState('');
  const [rating, setRating] = useState(0);
  const [goingType, setGoingType] = useState<'직관' | '중계'>('중계');

  const ticketingSites = [
    { name: '인터파크 티켓', url: 'https://ticket.interpark.com' },
    { name: '티켓링크', url: 'https://www.ticketlink.co.kr' },
  ];

  if (!myTeam) return null;

  // 종료된 내 팀 경기 찾기
  const finishedGames = schedules.filter(
    (m) =>
      m.status === 'finished' &&
      (TEAM_NAME_TO_ID[m.homeTeam] === myTeam.id || TEAM_NAME_TO_ID[m.awayTeam] === myTeam.id)
  );

  const handleDateChange = (dateStr: string) => {
    setSelectedDiaryDate(dateStr);
    const existingRecord = history.find(h => h.date === `2026.${dateStr}`);
    if (existingRecord) {
      setReviewText(existingRecord.review);
      setRating(existingRecord.rating);
      setGoingType(existingRecord.type === '직관' ? '직관' : '중계');
    } else {
      setReviewText('');
      setRating(0);
      setGoingType('중계');
    }
  };

  const openModal = () => {
    if (finishedGames.length > 0) {
      handleDateChange(finishedGames[finishedGames.length - 1].date);
    }
    setIsModalOpen(true);
  };

  const selectedGame = finishedGames.find(g => g.date === selectedDiaryDate);

  const handleSaveReview = () => {
    if (!selectedGame) return;
    
    const isMyHome = TEAM_NAME_TO_ID[selectedGame.homeTeam] === myTeam.id;
    const myScore = isMyHome ? selectedGame.homeScore! : selectedGame.awayScore!;
    const oppScore = isMyHome ? selectedGame.awayScore! : selectedGame.homeScore!;
    const result = myScore > oppScore ? 'W' : myScore < oppScore ? 'L' : 'D';

    const dateFull = `2026.${selectedDiaryDate}`;
    const newRecord = {
      date: dateFull,
      venue: selectedGame.stadium,
      type: goingType,
      result,
      review: reviewText,
      rating
    };

    const existingIndex = history.findIndex(h => h.date === dateFull);
    if (existingIndex >= 0) {
      const newHistory = [...history];
      newHistory[existingIndex] = newRecord;
      setHistory(newHistory);
    } else {
      // 날짜순 내림차순 정렬
      setHistory([newRecord, ...history].sort((a,b) => b.date.localeCompare(a.date)));
    }
    setIsModalOpen(false);
  };

  return (
    <div className="container" style={{ position: 'relative' }}>
      <header style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{ 
          fontSize: '48px', 
          background: myTeam.bgSecondary, 
          width: '100px', 
          height: '100px', 
          borderRadius: '50%', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          margin: '0 auto 16px' 
        }}>
          {myTeam.logo}
        </div>
        <h2 style={{ fontSize: '24px' }}>{myTeam.fullName} 야덕</h2>
        <p style={{ color: 'var(--text-light)', fontSize: '14px' }}>오늘도 야구볼래? 👋</p>
      </header>

      {/* Team Stats */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '18px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <TrendingUp size={20} color="var(--primary)" /> 우리 팀 성적
        </h3>
        <div className="card" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', textAlign: 'center' }}>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-light)', marginBottom: '4px' }}>현재 승률</div>
            <div style={{ fontSize: '24px', fontWeight: '800', color: myTeam.color }}>0.584</div>
            <div style={{ fontSize: '10px', color: 'var(--success)' }}>▲ 0.021</div>
          </div>
          <div style={{ borderLeft: '1px solid var(--border)' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-light)', marginBottom: '4px' }}>작년 이맘때</div>
            <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-light)' }}>0.512</div>
            <div style={{ fontSize: '10px', color: 'var(--text-light)' }}>리그 4위</div>
          </div>
        </div>
      </div>

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
            <motion.div 
              key={i} 
              className="card" 
              style={{ margin: 0, padding: '16px', borderLeft: `6px solid ${record.result === 'W' ? 'var(--success)' : record.result === 'L' ? 'var(--error)' : 'var(--border)'}` }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-light)' }}>{record.date} @{record.venue}</span>
                <span style={{ 
                  padding: '2px 8px', 
                  borderRadius: '10px', 
                  fontSize: '10px', 
                  background: 'var(--background)',
                  fontWeight: 'bold'
                }}>
                  {record.type} {record.result === 'W' ? '승리' : record.result === 'L' ? '패배' : record.result === '-' ? '진행중' : '무승부'}
                </span>
              </div>
              <p style={{ fontSize: '14px', marginBottom: '8px' }}>{record.review}</p>
              <div style={{ display: 'flex', gap: '2px' }}>
                {[...Array(5)].map((_, j) => (
                  <Star key={j} size={14} fill={j < record.rating ? 'var(--accent)' : 'none'} color={j < record.rating ? 'var(--accent)' : 'var(--border)'} />
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Goods Shop */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '18px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShoppingBag size={20} color="var(--primary)" /> 우리 팀 굿즈
        </h3>
        <a 
          href="#" 
          className="card" 
          style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            margin: 0, 
            background: myTeam.color, 
            color: 'white',
            borderColor: myTeam.color
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '24px' }}>📦</span>
            <div>
              <div style={{ fontWeight: 'bold' }}>{myTeam.name} 공식 온라인 샵</div>
              <div style={{ fontSize: '12px', opacity: 0.8 }}>유니폼, 모자 보러가기</div>
            </div>
          </div>
          <ExternalLink size={20} />
        </a>
      </div>

      {/* Modal Popup Overlay */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.6)',
              zIndex: 10000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px'
            }}
            onClick={() => setIsModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              style={{
                background: 'var(--card)',
                width: '100%',
                maxWidth: '400px',
                borderRadius: '24px',
                padding: '24px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '20px' }}>야구 일기 쓰기</h3>
                <button onClick={() => setIsModalOpen(false)}><X size={24} color="var(--text-light)" /></button>
              </div>

              {finishedGames.length > 0 ? (
                <>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>날짜 선택</label>
                    <select 
                      value={selectedDiaryDate}
                      onChange={(e) => handleDateChange(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: 'var(--radius-sm)',
                        border: '2px solid var(--border)',
                        background: 'var(--background)',
                        color: 'var(--text)',
                        fontSize: '14px',
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      {finishedGames.map((g) => (
                        <option key={g.date} value={g.date}>{g.date} {g.dayOfWeek ? `(${g.dayOfWeek})` : ''} - {g.stadium}</option>
                      ))}
                    </select>
                  </div>

                  {selectedGame && (
                    <div className="card" style={{ background: 'var(--background)', margin: '0 0 16px 0', border: 'none', padding: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                        <span style={{ fontSize: '12px', color: 'var(--text-light)' }}>2026.{selectedGame.date} @{selectedGame.stadium}</span>
                        <div style={{ display: 'flex', gap: '4px', background: 'white', padding: '2px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                          <button 
                            onClick={() => setGoingType('직관')}
                            style={{ 
                              padding: '4px 10px', 
                              borderRadius: '10px', 
                              fontSize: '12px', 
                              fontWeight: 'bold',
                              background: goingType === '직관' ? 'var(--primary)' : 'transparent',
                              color: goingType === '직관' ? 'white' : 'var(--text-light)'
                            }}
                          >직관</button>
                          <button 
                            onClick={() => setGoingType('중계')}
                            style={{ 
                              padding: '4px 10px', 
                              borderRadius: '10px', 
                              fontSize: '12px', 
                              fontWeight: 'bold',
                              background: goingType === '중계' ? 'var(--secondary)' : 'transparent',
                              color: goingType === '중계' ? 'white' : 'var(--text-light)'
                            }}
                          >중계</button>
                        </div>
                      </div>
                      <div style={{ fontWeight: '800', fontSize: '18px', textAlign: 'center', letterSpacing: '-0.5px' }}>
                        <span style={{ color: TEAM_NAME_TO_ID[selectedGame.awayTeam] === myTeam.id ? 'var(--text)' : 'var(--text-light)' }}>
                          {selectedGame.awayTeam} {selectedGame.awayScore ?? ''}
                        </span>
                        <span style={{ margin: '0 8px', color: 'var(--border)' }}>:</span>
                        <span style={{ color: TEAM_NAME_TO_ID[selectedGame.homeTeam] === myTeam.id ? 'var(--text)' : 'var(--text-light)' }}>
                          {selectedGame.homeScore ?? ''} {selectedGame.homeTeam}
                        </span>
                      </div>
                    </div>
                  )}

                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>별점</label>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', margin: '8px 0' }}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button key={star} onClick={() => setRating(star)}>
                          <Star size={36} fill={star <= rating ? 'var(--accent)' : 'none'} color={star <= rating ? 'var(--accent)' : 'var(--border)'} style={{ transition: 'all 0.2s' }} />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ marginBottom: '24px' }}>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>메모</label>
                    <textarea 
                      value={reviewText}
                      onChange={(e) => setReviewText(e.target.value)}
                      placeholder="기억에 남는 순간을 적어보세요!"
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '2px solid var(--border)',
                        borderRadius: 'var(--radius-sm)',
                        fontFamily: 'inherit',
                        fontSize: '14px',
                        minHeight: '100px',
                        resize: 'none',
                        outline: 'none',
                        transition: 'border-color 0.2s'
                      }}
                      onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                      onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                    />
                  </div>

                  <button 
                    className="pill-button" 
                    style={{ width: '100%', padding: '16px', fontSize: '16px' }}
                    onClick={handleSaveReview}
                    disabled={rating === 0 || !reviewText.trim()}
                  >
                    기록 저장하기
                  </button>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <p style={{ fontSize: '32px', marginBottom: '12px' }}>😢</p>
                  <p style={{ fontSize: '16px', color: 'var(--text-light)', fontWeight: 'bold' }}>아직 종료된 경기가 없습니다!</p>
                  <p style={{ fontSize: '12px', color: 'var(--text-light)', marginTop: '4px' }}>경기가 끝나면 일기를 남길 수 있어요.</p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
