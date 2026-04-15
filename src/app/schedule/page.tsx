'use client';

import { useTeam } from '@/context/TeamContext';
import { motion } from 'framer-motion';
import { CloudRain, MapPin, ChevronRight, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';

export default function SchedulePage() {
  const { myTeam } = useTeam();
  const [selectedDate, setSelectedDate] = useState(15); // Default to today (15th)

  const schedule = [
    { day: '월', date: 13, opponent: 'KIA', stadium: '광주', result: 'W 5:2', weather: '맑음', rain: '0%', status: 'none' },
    { day: '화', date: 14, opponent: 'KIA', stadium: '광주', result: 'L 1:4', weather: '흐림', rain: '10%', status: 'none' },
    { day: '수', date: 15, opponent: 'NC', stadium: '잠실', time: '18:30', weather: '비 예보', rain: '60%', status: 'none' },
    { day: '목', date: 16, opponent: 'NC', stadium: '잠실', time: '18:30', weather: '맑음', rain: '0%', status: 'none' },
    { day: '금', date: 17, opponent: '롯데', stadium: '사직', time: '18:30', weather: '맑음', rain: '0%', status: 'going' },
    { day: '토', date: 18, opponent: '롯데', stadium: '사직', time: '17:00', weather: '맑음', rain: '0%', status: 'none' },
    { day: '일', date: 19, opponent: '롯데', stadium: '사직', time: '14:00', weather: '맑음', rain: '0%', status: 'none' },
  ];

  if (!myTeam) return null;

  return (
    <div className="container">
      <header style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', marginBottom: '8px' }}>이번 주 스케줄 🗓️</h2>
        <p style={{ color: 'var(--text-light)', fontSize: '14px' }}>{myTeam.name}의 경기를 놓치지 마세요!</p>
      </header>

      {/* Week Calendar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', overflowX: 'auto', paddingBottom: '8px', gap: '8px' }}>
        {schedule.map((item) => (
          <button
            key={item.date}
            onClick={() => setSelectedDate(item.date)}
            style={{
              flex: '0 0 auto',
              width: '44px',
              padding: '12px 0',
              borderRadius: 'var(--radius-md)',
              background: selectedDate === item.date ? myTeam.color : 'white',
              color: selectedDate === item.date ? 'white' : 'var(--text)',
              border: `2px solid ${selectedDate === item.date ? myTeam.color : 'var(--border)'}`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <span style={{ fontSize: '10px', opacity: 0.8 }}>{item.day}</span>
            <span style={{ fontSize: '16px', fontWeight: '800' }}>{item.date}</span>
          </button>
        ))}
      </div>

      {/* Selected Day Info */}
      <motion.div 
        key={selectedDate}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="card"
        style={{ padding: '24px' }}
      >
        {(() => {
          const item = schedule.find(s => s.date === selectedDate);
          if (!item) return null;
          return (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-light)', fontSize: '14px' }}>
                  <MapPin size={16} />
                  <span>{item.stadium} 야구장</span>
                </div>
                {item.rain !== '0%' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--error)', fontSize: '14px', fontWeight: 'bold' }}>
                    <CloudRain size={16} />
                    <span>비 예보 ({item.rain})</span>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '32px', marginBottom: '24px' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '48px', marginBottom: '8px' }}>{myTeam.logo}</div>
                  <div style={{ fontWeight: '800' }}>{myTeam.name}</div>
                </div>
                <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--border)' }}>VS</div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '48px', marginBottom: '8px' }}>🧢</div>
                  <div style={{ fontWeight: '800' }}>{item.opponent}</div>
                </div>
              </div>

              <div style={{ textAlign: 'center', background: 'var(--background)', padding: '12px', borderRadius: 'var(--radius-sm)', marginBottom: '16px' }}>
                {item.result ? (
                  <div style={{ fontSize: '20px', fontWeight: '800', color: item.result.startsWith('W') ? 'var(--success)' : 'var(--error)' }}>{item.result}</div>
                ) : (
                  <div style={{ fontSize: '20px', fontWeight: '800' }}>{item.time} 경기 시작</div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button className="pill-button" style={{ flex: 1, margin: 0, background: 'var(--secondary)', boxShadow: '0 4px 0 #8BAED9' }}>전적 비교</button>
                <button className="pill-button" style={{ flex: 1, margin: 0, background: myTeam.color, boxShadow: `0 4px 0 ${myTeam.color}aa` }}>라인업</button>
              </div>

              {item.status === 'going' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '20px', color: 'var(--success)', fontSize: '14px', fontWeight: 'bold', justifyContent: 'center' }}>
                  <CheckCircle2 size={18} />
                  <span>이날 직관 가기로 했어요! 👋</span>
                </div>
              )}
            </>
          );
        })()}
      </motion.div>

      {/* Roster Moves (Brief) */}
      <div style={{ marginTop: '24px' }}>
        <h3 style={{ fontSize: '18px', marginBottom: '12px' }}>엔트리 변동 (오늘)</h3>
        <div className="card" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--success)', fontWeight: 'bold', marginBottom: '8px' }}>▲ 1군 등록</div>
            <div style={{ fontSize: '14px' }}>김철수 (투수)</div>
            <div style={{ fontSize: '14px' }}>이영희 (내야수)</div>
          </div>
          <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: '12px' }}>
            <div style={{ fontSize: '12px', color: 'var(--error)', fontWeight: 'bold', marginBottom: '8px' }}>▼ 2군 말소</div>
            <div style={{ fontSize: '14px' }}>박지훈 (외야수)</div>
          </div>
        </div>
      </div>
    </div>
  );
}
