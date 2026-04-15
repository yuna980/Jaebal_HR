'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useTeam } from '@/context/TeamContext';
import { KBO_TEAMS } from '@/data/teams';
import { motion } from 'framer-motion';

export default function OnboardingPage() {
  const { myTeam, selectTeam } = useTeam();
  const router = useRouter();

  useEffect(() => {
    if (myTeam) {
      router.push('/dashboard');
    }
  }, [myTeam, router]);

  const handleSelect = (id: string) => {
    selectTeam(id);
    router.push('/dashboard');
  };

  return (
    <div className="container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ textAlign: 'center', marginBottom: '40px' }}
      >
        <div style={{ 
          fontSize: '64px', 
          marginBottom: '16px',
          background: 'var(--secondary)',
          width: '120px',
          height: '120px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto',
          boxShadow: '0 8px 0 var(--border)'
        }}>
          ⚾️
        </div>
        <h1 style={{ fontSize: '32px', marginBottom: '8px' }}>야구볼래?</h1>
        <p style={{ color: 'var(--text-light)', fontSize: '16px' }}>당신이 응원하는 팀을 알려주세요!</p>
      </motion.div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr', 
        gap: '12px',
        padding: '0 10px'
      }}>
        {KBO_TEAMS.map((team, index) => (
          <motion.button
            key={team.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => handleSelect(team.id)}
            style={{
              background: team.bgSecondary,
              padding: '20px 10px',
              borderRadius: 'var(--radius-md)',
              border: `2px solid ${team.color}20`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <span style={{ fontSize: '32px' }}>{team.logo}</span>
            <span style={{ fontWeight: '800', color: team.color }}>{team.name}</span>
            
            <div style={{ 
              position: 'absolute', 
              top: '-10px', 
              right: '-10px', 
              width: '40px', 
              height: '40px', 
              background: team.color, 
              opacity: 0.05, 
              borderRadius: '50%' 
            }} />
          </motion.button>
        ))}
      </div>
    </div>
  );
}
