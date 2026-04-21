'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Star, X } from 'lucide-react';
import { KboMatch } from '@/lib/kboScraper';
import { FanDiaryRecord, getGameResultForTeam, saveDiaryRecord } from '@/lib/fanDiary';

interface DiaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  myTeamId: string;
  selectedGame: KboMatch | null;
  selectedDate: string;
  onDateChange: (date: string) => void;
  finishedGames: KboMatch[];
  currentRecord: FanDiaryRecord | null;
  attendanceLabel: '직관' | '중계';
  year: number;
}

export default function DiaryModal({
  isOpen,
  onClose,
  myTeamId,
  selectedGame,
  selectedDate,
  onDateChange,
  finishedGames,
  currentRecord,
  attendanceLabel,
  year,
}: DiaryModalProps) {
  const [reviewText, setReviewText] = useState(currentRecord?.review ?? '');
  const [rating, setRating] = useState(currentRecord?.rating ?? 0);

  const handleSave = () => {
    if (!selectedGame || rating === 0 || !reviewText.trim()) return;

    saveDiaryRecord({
      teamId: myTeamId,
      date: `${year}.${selectedGame.date}`,
      venue: selectedGame.stadium,
      isAttending: attendanceLabel === '직관',
      result: getGameResultForTeam(selectedGame, myTeamId),
      review: reviewText.trim(),
      rating,
    });

    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={onClose}
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
              boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '20px' }}>
                {currentRecord?.review ? '야구 일기 수정' : '야구 일기 쓰기'}
              </h3>
              <button onClick={onClose}>
                <X size={24} color="var(--text-light)" />
              </button>
            </div>

            {finishedGames.length > 0 ? (
              <>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>날짜 선택</label>
                  <select
                    value={selectedDate}
                    onChange={(event) => onDateChange(event.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: 'var(--radius-sm)',
                      border: '2px solid var(--border)',
                      background: 'var(--background)',
                      color: 'var(--text)',
                      fontSize: '14px',
                      outline: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    {finishedGames.map((game) => (
                      <option key={`${game.date}-${game.homeTeam}-${game.awayTeam}`} value={game.date}>
                        {game.date} {game.dayOfWeek ? `(${game.dayOfWeek})` : ''} - {game.stadium}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedGame && (
                  <div className="card" style={{ background: 'var(--background)', margin: '0 0 16px 0', border: 'none', padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-light)' }}>
                        {year}.{selectedGame.date} @{selectedGame.stadium}
                      </span>
                      <div
                        style={{
                          background: 'white',
                          padding: '4px 10px',
                          borderRadius: '12px',
                          border: '1px solid var(--border)',
                          fontSize: '12px',
                          fontWeight: 800,
                          color: attendanceLabel === '직관' ? 'var(--primary)' : 'var(--text-light)',
                        }}
                      >
                        {attendanceLabel}
                      </div>
                    </div>
                    <div style={{ fontWeight: '800', fontSize: '18px', textAlign: 'center', letterSpacing: '-0.5px' }}>
                      {selectedGame.awayTeam} {selectedGame.awayScore ?? ''}
                      <span style={{ margin: '0 8px', color: 'var(--border)' }}>:</span>
                      {selectedGame.homeScore ?? ''} {selectedGame.homeTeam}
                    </div>
                  </div>
                )}

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>별점</label>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', margin: '8px 0' }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button key={star} onClick={() => setRating(star)}>
                        <Star
                          size={36}
                          fill={star <= rating ? 'var(--accent)' : 'none'}
                          color={star <= rating ? 'var(--accent)' : 'var(--border)'}
                          style={{ transition: 'all 0.2s' }}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>메모</label>
                  <textarea
                    value={reviewText}
                    onChange={(event) => setReviewText(event.target.value)}
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
                      transition: 'border-color 0.2s',
                    }}
                  />
                </div>

                <button
                  className="pill-button"
                  style={{ width: '100%', padding: '16px', fontSize: '16px' }}
                  onClick={handleSave}
                  disabled={rating === 0 || !reviewText.trim()}
                >
                  {currentRecord?.review ? '수정 저장하기' : '기록 저장하기'}
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
  );
}
