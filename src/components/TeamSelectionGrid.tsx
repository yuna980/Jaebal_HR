'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { KBO_TEAMS, Team } from '@/data/teams';
import { useTeam } from '@/context/TeamContext';
import TeamLogo from '@/components/TeamLogo';

interface TeamSelectionGridProps {
  title?: string;
  description?: string;
  redirectTo?: string;
  userId?: string | null;
}

type TeamCardTheme = {
  gradient: string;
  glow: string;
  lightBg: string;
  initial: string;
};

const TEAM_CARD_THEMES: Record<string, TeamCardTheme> = {
  lg: {
    gradient: 'linear-gradient(135deg, #E11D48 0%, #9F1239 100%)',
    glow: 'rgba(225, 29, 72, 0.32)',
    lightBg: '#FFF1F4',
    initial: 'L',
  },
  kt: {
    gradient: 'linear-gradient(135deg, #111827 0%, #3F3F46 100%)',
    glow: 'rgba(17, 24, 39, 0.28)',
    lightBg: '#F4F4F5',
    initial: 'K',
  },
  ssg: {
    gradient: 'linear-gradient(135deg, #F43F5E 0%, #BE123C 100%)',
    glow: 'rgba(244, 63, 94, 0.32)',
    lightBg: '#FFF1F2',
    initial: 'S',
  },
  nc: {
    gradient: 'linear-gradient(135deg, #2563EB 0%, #1E3A8A 100%)',
    glow: 'rgba(37, 99, 235, 0.32)',
    lightBg: '#EFF6FF',
    initial: 'N',
  },
  doosan: {
    gradient: 'linear-gradient(135deg, #1E293B 0%, #020617 100%)',
    glow: 'rgba(15, 23, 42, 0.3)',
    lightBg: '#F1F5F9',
    initial: 'D',
  },
  kia: {
    gradient: 'linear-gradient(135deg, #EF4444 0%, #B91C1C 100%)',
    glow: 'rgba(239, 68, 68, 0.32)',
    lightBg: '#FEF2F2',
    initial: 'K',
  },
  lotte: {
    gradient: 'linear-gradient(135deg, #1D4ED8 0%, #0F172A 100%)',
    glow: 'rgba(29, 78, 216, 0.3)',
    lightBg: '#EFF6FF',
    initial: 'L',
  },
  samsung: {
    gradient: 'linear-gradient(135deg, #0EA5E9 0%, #1D4ED8 100%)',
    glow: 'rgba(14, 165, 233, 0.32)',
    lightBg: '#E0F2FE',
    initial: 'S',
  },
  hanwha: {
    gradient: 'linear-gradient(135deg, #FB923C 0%, #EA580C 100%)',
    glow: 'rgba(251, 146, 60, 0.34)',
    lightBg: '#FFF7ED',
    initial: 'H',
  },
  kiwoom: {
    gradient: 'linear-gradient(135deg, #BE123C 0%, #581C32 100%)',
    glow: 'rgba(190, 18, 60, 0.32)',
    lightBg: '#FFF1F2',
    initial: 'K',
  },
};

function getTeamTheme(team: Team) {
  return TEAM_CARD_THEMES[team.id] ?? {
    gradient: `linear-gradient(135deg, ${team.color} 0%, #111827 100%)`,
    glow: `${team.color}55`,
    lightBg: team.bgSecondary,
    initial: team.name.slice(0, 1),
  };
}

function hasFinalConsonant(value: string) {
  const lastChar = value.trim().at(-1);
  if (!lastChar) return false;

  const code = lastChar.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return false;

  return (code - 0xac00) % 28 !== 0;
}

function getStartButtonText(team: Team) {
  const josa = hasFinalConsonant(team.fullName) ? '과' : '와';
  return `${team.fullName}${josa} 함께 시작하기`;
}

export default function TeamSelectionGrid({
  title = '나의 팀을 선택해요',
  description = '올 시즌 함께 웃고 울 팀을 골라주세요',
  redirectTo = '/dashboard',
  userId = null,
}: TeamSelectionGridProps) {
  const { myTeam, selectTeam } = useTeam();
  const router = useRouter();
  const [selectedTeamId, setSelectedTeamId] = useState(myTeam?.id ?? '');
  const [isSaving, setIsSaving] = useState(false);

  const selectedTeam = useMemo(
    () => KBO_TEAMS.find((team) => team.id === selectedTeamId) ?? null,
    [selectedTeamId]
  );
  const selectedTheme = selectedTeam ? getTeamTheme(selectedTeam) : null;

  const handleStart = async () => {
    if (!selectedTeam || isSaving) return;

    setIsSaving(true);
    await selectTeam(selectedTeam.id, userId);
    router.replace(redirectTo);
    router.refresh();
  };

  return (
    <main
      style={{
        minHeight: '100vh',
        position: 'relative',
        overflow: 'hidden',
        background: 'linear-gradient(180deg, #F8FAFC 0%, #F1F5F9 52%, #EEF2F7 100%)',
      }}
    >
      <div
        aria-hidden
        style={{
          position: 'absolute',
          width: '220px',
          height: '220px',
          borderRadius: '999px',
          top: '-78px',
          left: '-82px',
          background: '#FDA4AF',
          filter: 'blur(56px)',
          opacity: 0.42,
          mixBlendMode: 'multiply',
        }}
      />
      <div
        aria-hidden
        style={{
          position: 'absolute',
          width: '240px',
          height: '240px',
          borderRadius: '999px',
          top: '-70px',
          right: '-92px',
          background: '#93C5FD',
          filter: 'blur(60px)',
          opacity: 0.46,
          mixBlendMode: 'multiply',
        }}
      />

      <div
        className="container"
        style={{
          position: 'relative',
          zIndex: 1,
          minHeight: '100vh',
          paddingBottom: 'calc(122px + var(--safe-area-inset-bottom))',
        }}
      >
        <motion.header
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
          style={{ paddingTop: '22px', marginBottom: '28px' }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              borderRadius: '999px',
              background: 'rgba(255,255,255,0.72)',
              border: '1px solid rgba(226,232,240,0.92)',
              boxShadow: '0 10px 28px rgba(15, 23, 42, 0.06)',
              color: '#64748B',
              fontSize: '12px',
              fontWeight: 900,
              marginBottom: '14px',
            }}
          >
            <span style={{ color: '#F59E0B' }}>⚾</span>
            MY KBO CLUB
          </div>
          <h1
            style={{
              fontSize: '34px',
              lineHeight: 1.08,
              letterSpacing: 0,
              color: '#0F172A',
              marginBottom: '10px',
            }}
          >
            {title}
          </h1>
          <p style={{ color: '#64748B', fontSize: '15px', fontWeight: 700, lineHeight: 1.48 }}>
            {description}
          </p>
        </motion.header>

        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: '13px',
          }}
        >
          {KBO_TEAMS.map((team, index) => {
            const theme = getTeamTheme(team);
            const isSelected = selectedTeamId === team.id;

            return (
              <motion.button
                type="button"
                key={team.id}
                className="team-choice-card"
                initial={{ opacity: 0, y: 18, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: isSelected ? 1.05 : 1 }}
                whileHover={{ y: -3 }}
                whileTap={{ scale: isSelected ? 1.02 : 0.98 }}
                transition={{
                  delay: index * 0.035,
                  duration: 0.34,
                  ease: [0.22, 1, 0.36, 1],
                }}
                onClick={() => setSelectedTeamId(team.id)}
                aria-pressed={isSelected}
                style={{
                  minHeight: '124px',
                  position: 'relative',
                  overflow: 'hidden',
                  borderRadius: '20px',
                  padding: '16px 14px',
                  textAlign: 'left',
                  border: isSelected ? '1px solid rgba(255,255,255,0.72)' : '1px solid #E2E8F0',
                  background: isSelected ? theme.gradient : '#FFFFFF',
                  boxShadow: isSelected
                    ? `0 18px 38px ${theme.glow}`
                    : '0 10px 24px rgba(15, 23, 42, 0.055)',
                  color: isSelected ? '#FFFFFF' : '#0F172A',
                }}
              >
                <div
                  aria-hidden
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: isSelected
                      ? 'radial-gradient(circle at 18% 12%, rgba(255,255,255,0.35), transparent 34%)'
                      : theme.lightBg,
                    opacity: isSelected ? 1 : 0,
                    transition: 'opacity 0.25s ease',
                  }}
                />
                <div
                  aria-hidden
                  style={{
                    position: 'absolute',
                    right: '-8px',
                    bottom: '-26px',
                    color: isSelected ? '#FFFFFF' : '#0F172A',
                    opacity: isSelected ? 0.1 : 0.03,
                    fontSize: '90px',
                    lineHeight: 1,
                    fontWeight: 900,
                  }}
                >
                  {theme.initial}
                </div>

                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                    <div
                      style={{
                        width: '54px',
                        height: '54px',
                        borderRadius: '18px',
                        background: isSelected ? 'rgba(255,255,255,0.18)' : '#F8FAFC',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: isSelected ? 'inset 0 0 0 1px rgba(255,255,255,0.22)' : 'inset 0 0 0 1px #EEF2F7',
                      }}
                    >
                      <TeamLogo team={team} size={42} />
                    </div>

                    <motion.div
                      initial={false}
                      animate={{ scale: isSelected ? 1 : 0, opacity: isSelected ? 1 : 0 }}
                      transition={{ duration: 0.18 }}
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '999px',
                        background: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: team.color,
                        boxShadow: '0 8px 18px rgba(15,23,42,0.14)',
                        flexShrink: 0,
                      }}
                    >
                      <Check size={17} strokeWidth={3.2} />
                    </motion.div>
                  </div>

                  <div style={{ marginTop: '15px' }}>
                    <div
                      style={{
                        fontSize: '18px',
                        fontWeight: 900,
                        color: isSelected ? '#FFFFFF' : team.color,
                        lineHeight: 1.1,
                        marginBottom: '5px',
                      }}
                    >
                      {team.fullName}
                    </div>
                    <div
                      style={{
                        fontSize: '12px',
                        fontWeight: 800,
                        color: isSelected ? 'rgba(255,255,255,0.76)' : '#94A3B8',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {team.stadium}
                    </div>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </section>
      </div>

      <div
        style={{
          position: 'fixed',
          left: '50%',
          bottom: 0,
          transform: 'translateX(-50%)',
          width: '100%',
          maxWidth: '480px',
          zIndex: 20,
          padding: '14px 20px calc(14px + var(--safe-area-inset-bottom))',
          background: 'rgba(255, 255, 255, 0.72)',
          backdropFilter: 'blur(18px)',
          borderTop: '1px solid rgba(226, 232, 240, 0.78)',
          boxShadow: '0 -16px 38px rgba(15, 23, 42, 0.08)',
        }}
      >
        <button
          type="button"
          className="team-choice-cta"
          disabled={!selectedTeam || isSaving}
          onClick={handleStart}
          style={{
            width: '100%',
            minHeight: '58px',
            borderRadius: '18px',
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            background: selectedTeam && selectedTheme ? selectedTheme.gradient : '#E2E8F0',
            color: selectedTeam ? '#FFFFFF' : '#94A3B8',
            fontSize: '16px',
            fontWeight: 900,
            boxShadow: selectedTeam && selectedTheme ? `0 14px 30px ${selectedTheme.glow}` : 'none',
            cursor: selectedTeam && !isSaving ? 'pointer' : 'default',
            opacity: isSaving ? 0.78 : 1,
          }}
        >
          {selectedTeam && (
            <span
              aria-hidden
              className="team-choice-cta-shimmer"
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: '-45%',
                width: '34%',
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.46), transparent)',
                transform: 'skewX(-18deg)',
              }}
            />
          )}
          <span style={{ position: 'relative', zIndex: 1 }}>
            {isSaving ? '응원팀 저장 중' : selectedTeam ? getStartButtonText(selectedTeam) : '팀을 먼저 선택해주세요'}
          </span>
          {selectedTeam && (
            <ChevronRight
              className="team-choice-chevron"
              size={19}
              strokeWidth={3}
              style={{ position: 'relative', zIndex: 1 }}
            />
          )}
        </button>
      </div>
    </main>
  );
}
