'use client';

import { useTeam } from '@/context/TeamContext';
import { motion } from 'framer-motion';
import { Ticket, History, TrendingUp, ShoppingBag, ExternalLink, Star } from 'lucide-react';
import { useState } from 'react';

export default function ProfilePage() {
  const { myTeam } = useTeam();
  const [history] = useState([
    { date: '2026.04.10', venue: '잠실', type: '직관', result: 'W', review: '이닝 끝날 때 치킨 먹음 꿀맛!', rating: 5 },
    { date: '2026.04.12', venue: '수원', type: '중계', result: 'L', review: '역전패 실화냐...', rating: 2 },
  ]);

  const ticketingSites = [
    { name: '인터파크 티켓', url: 'https://ticket.interpark.com' },
    { name: '티켓링크', url: 'https://www.ticketlink.co.kr' },
  ];

  if (!myTeam) return null;

  return (
    <div className="container">
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
            <History size={20} color="var(--primary)" /> 직관 일기
          </h3>
          <button style={{ color: 'var(--primary)', fontWeight: 'bold', fontSize: '14px' }}>+ 작성하기</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {history.map((record, i) => (
            <motion.div 
              key={i} 
              className="card" 
              style={{ margin: 0, padding: '16px', borderLeft: `6px solid ${record.result === 'W' ? 'var(--success)' : 'var(--error)'}` }}
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
                  {record.type} {record.result === 'W' ? '승리' : '패배'}
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
    </div>
  );
}
