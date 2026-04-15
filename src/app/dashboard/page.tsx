'use client';

import { useTeam } from '@/context/TeamContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CloudRain, MapPin, Navigation, Info, ChevronRight } from 'lucide-react';

export default function Dashboard() {
  const { myTeam } = useTeam();
  const router = useRouter();
  const [isGoing, setIsGoing] = useState(false);

  useEffect(() => {
    if (!myTeam) {
      router.push('/');
    }
  }, [myTeam, router]);

  if (!myTeam) return null;

  return (
    <div className="container">
      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '24px', color: myTeam.color }}>오늘의 {myTeam.name}</h2>
          <p style={{ color: 'var(--text-light)', fontSize: '14px' }}>2026년 4월 15일 (수)</p>
        </div>
        <div style={{ fontSize: '32px' }}>{myTeam.logo}</div>
      </header>

      {/* Today's Match Card */}
      <motion.div 
        className="card"
        whileHover={{ scale: 1.02 }}
        style={{ background: `linear-gradient(135deg, ${myTeam.bgSecondary} 0%, #ffffff 100%)`, border: `2px solid ${myTeam.color}20` }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px', fontWeight: 'bold', color: myTeam.color }}>
            <MapPin size={16} />
            <span>{myTeam.stadium}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px', color: 'var(--error)', fontWeight: 'bold' }}>
            <CloudRain size={16} />
            <span>강수확률 20%</span>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', margin: '20px 0' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '8px' }}>{myTeam.logo}</div>
            <div style={{ fontWeight: '800' }}>{myTeam.name}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>Home</div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--border)' }}>VS</div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '8px' }}>🦖</div>
            <div style={{ fontWeight: '800' }}>NC</div>
            <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>Away</div>
          </div>
        </div>

        <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.5)', padding: '10px', borderRadius: 'var(--radius-sm)', fontSize: '14px' }}>
          오늘 경기 <strong>18:30</strong> 시작!
        </div>
      </motion.div>

      {/* Attendance Toggle */}
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ fontSize: '16px' }}>오늘 직관 가시나요?</h3>
          <p style={{ fontSize: '12px', color: 'var(--text-light)' }}>체크하면 꿀팁을 알려드려요!</p>
        </div>
        <button 
          onClick={() => setIsGoing(!isGoing)}
          style={{ 
            width: '60px', 
            height: '32px', 
            background: isGoing ? 'var(--success)' : 'var(--border)', 
            borderRadius: '20px',
            position: 'relative',
            padding: '4px'
          }}
        >
          <motion.div 
            animate={{ x: isGoing ? 28 : 0 }}
            style={{ width: '24px', height: '24px', background: 'white', borderRadius: '50%', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
          />
        </button>
      </div>

      {isGoing && (
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
                <div style={{ fontSize: '14px', fontWeight: 'bold' }}>맛집 정보</div>
                <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>구장 주변</div>
              </div>
            </button>
          </div>
        </motion.div>
      )}

      {/* Recent Match History */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '18px' }}>상대 전적 (vs NC)</h3>
          <span style={{ fontSize: '12px', color: 'var(--text-light)' }}>최근 5경기</span>
        </div>
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
            {['W', 'W', 'L', 'W', 'W'].map((res, i) => (
              <div key={i} style={{ 
                width: '32px', 
                height: '32px', 
                borderRadius: '50%', 
                background: res === 'W' ? 'var(--success)' : 'var(--error)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                fontSize: '14px'
              }}>
                {res}
              </div>
            ))}
          </div>
          <p style={{ textAlign: 'center', marginTop: '12px', fontSize: '14px' }}>
            최근 전적 <strong>4승 1패</strong>로 앞서고 있어요! 🔥
          </p>
        </div>
      </div>

      {/* Quick Links */}
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ fontSize: '24px' }}>🧢</div>
          <div>
            <div style={{ fontWeight: 'bold' }}>라인업 확인하기</div>
            <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>선발 및 타선 정보</div>
          </div>
        </div>
        <ChevronRight size={20} color="var(--border)" />
      </div>

    </div>
  );
}
