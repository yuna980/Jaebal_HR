'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useTeam } from '@/context/TeamContext';
import { motion } from 'framer-motion';
import { Ticket, History, TrendingUp, ShoppingBag, ExternalLink, Star } from 'lucide-react';
import { useState } from 'react';
import { useKboSchedule } from '@/hooks/useKboSchedule';
import { TEAM_NAME_TO_ID } from '@/lib/kboScraper';
import TeamLogo from '@/components/TeamLogo';
import DiaryModal from '@/components/DiaryModal';
import { findRecordForDate, formatDiaryDate, useFanDiaryRecords } from '@/lib/fanDiary';

export default function ProfilePage() {
  const { myTeam } = useTeam();
  const { schedules } = useKboSchedule();
  const records = useFanDiaryRecords();
  const currentYear = new Date().getFullYear();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDiaryDate, setSelectedDiaryDate] = useState('');

  const ticketingSites = [
    { name: '인터파크 티켓', url: 'https://ticket.interpark.com' },
    { name: '티켓링크', url: 'https://www.ticketlink.co.kr' },
  ];

  if (!myTeam) return null;

  const quickLinks = [
    {
      name: `${myTeam.name} 공식 온라인 샵`,
      description: '유니폼, 모자, 응원용품 보러가기',
      url: 'https://landers.family.ssg.com/',
      background: '#FFFFFF',
      textColor: 'var(--text)',
      borderColor: `${myTeam.color}33`,
      iconColor: myTeam.color,
      featured: true,
      badgeText: myTeam.name,
      accentColor: myTeam.color,
      logoSurface: myTeam.color,
      descriptionColor: 'var(--text-light)',
    },
    {
      name: '네이버 스포츠 바로가기',
      description: '빠르게 경기 일정과 기록 확인',
      url: 'https://m.sports.naver.com/index',
      background: '#FFFFFF',
      textColor: 'var(--text)',
      borderColor: '#BBF7D0',
      iconColor: '#16A34A',
      featured: false,
      logoPath: '/brand-logos/naver-sports.svg',
      logoAlt: '네이버 스포츠 로고',
      accentColor: '#16A34A',
      logoSurface: '#F6FFF8',
      descriptionColor: 'var(--text-light)',
    },
    {
      name: '티빙으로 중계보기',
      description: '실시간 중계 화면으로 바로 이동',
      url: 'https://www.tving.com/sports/kbo',
      background: '#FFFFFF',
      textColor: 'var(--text)',
      borderColor: '#FECACA',
      iconColor: '#E11D48',
      featured: false,
      logoPath: '/brand-logos/tving.jpg',
      logoAlt: '티빙 로고',
      accentColor: '#E11D48',
      logoSurface: '#FFF5F5',
      descriptionColor: 'var(--text-light)',
    },
  ];

  // 종료된 내 팀 경기 찾기
  const finishedGames = schedules.filter(
    (m) =>
      m.status === 'finished' &&
      (TEAM_NAME_TO_ID[m.homeTeam] === myTeam.id || TEAM_NAME_TO_ID[m.awayTeam] === myTeam.id)
  );
  const history = records
    .filter((record) => record.teamId === myTeam.id && record.review.trim())
    .sort((left, right) => right.date.localeCompare(left.date));

  const handleDateChange = (dateStr: string) => {
    setSelectedDiaryDate(dateStr);
  };

  const openEditModal = (dateText: string) => {
    const normalizedDate = dateText.split('.').slice(-2).join('.');
    handleDateChange(normalizedDate);
    setIsModalOpen(true);
  };

  const openModal = () => {
    if (finishedGames.length > 0) {
      handleDateChange(finishedGames[finishedGames.length - 1].date);
    }
    setIsModalOpen(true);
  };

  const selectedGame = finishedGames.find(g => g.date === selectedDiaryDate);
  const selectedRecord = findRecordForDate(records, myTeam.id, formatDiaryDate(currentYear, selectedDiaryDate));

  return (
    <div className="container" style={{ position: 'relative' }}>
      <header style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{ 
          background: myTeam.bgSecondary, 
          width: '100px', 
          height: '100px', 
          borderRadius: '50%', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          margin: '0 auto 16px' 
        }}>
          <TeamLogo team={myTeam} size={64} rounded />
        </div>
        <h2 style={{ fontSize: '24px' }}>{myTeam.fullName} 야덕</h2>
        <p style={{ color: 'var(--text-light)', fontSize: '14px' }}>오늘도 야구볼래? 👋</p>
        <div style={{ marginTop: '10px' }}>
          <Link
            href="/teams"
            style={{
              fontSize: '13px',
              color: 'var(--text-light)',
              textDecoration: 'underline',
              textUnderlineOffset: '3px',
            }}
          >
            응원팀 변경하기
          </Link>
        </div>
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
              onClick={() => openEditModal(record.date)}
              style={{
                margin: 0,
                padding: '16px',
                borderLeft: `6px solid ${record.result === 'W' ? 'var(--success)' : record.result === 'L' ? 'var(--error)' : 'var(--border)'}`,
                cursor: 'pointer',
              }}
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
                  {record.isAttending ? '직관' : '중계'} {record.result === 'W' ? '승리' : record.result === 'L' ? '패배' : record.result === '-' ? '진행중' : '무승부'}
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

      {/* Quick Links */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '18px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShoppingBag size={20} color="var(--primary)" /> 바로가기
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {quickLinks.map((link) => (
            <a
              key={link.name}
              href={link.url}
              target="_blank"
              rel="noreferrer"
              className="card"
              style={{
                margin: 0,
                padding: link.featured ? '18px' : '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: link.background,
                color: link.textColor,
                borderColor: link.borderColor,
                borderWidth: '1.5px',
                boxShadow: link.featured ? '0 12px 24px rgba(15, 23, 42, 0.06)' : '0 6px 16px rgba(15, 23, 42, 0.04)',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: `linear-gradient(90deg, ${link.accentColor}10 0%, rgba(255,255,255,0) 45%)`,
                  pointerEvents: 'none',
                }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    width: link.featured ? '58px' : '72px',
                    height: link.featured ? '48px' : '42px',
                    borderRadius: '14px',
                    background: link.logoSurface,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '6px 10px',
                    flexShrink: 0,
                    overflow: 'hidden',
                    border: `1px solid ${link.borderColor}`,
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9)',
                    position: 'relative',
                    zIndex: 1,
                  }}
                >
                  {link.logoPath ? (
                    <Image
                      src={link.logoPath}
                      alt={link.logoAlt ?? link.name}
                      width={link.featured ? 58 : 72}
                      height={link.featured ? 48 : 42}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        display: 'block',
                      }}
                    />
                  ) : (
                    <span
                      style={{
                        fontSize: link.featured ? '15px' : '14px',
                        fontWeight: 900,
                        color: '#FFFFFF',
                        letterSpacing: '-0.02em',
                      }}
                    >
                      {link.badgeText}
                    </span>
                  )}
                </div>
                <div>
                  <div style={{ fontSize: link.featured ? '16px' : '15px', fontWeight: 800 }}>
                    {link.name}
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: link.descriptionColor,
                      marginTop: '2px',
                    }}
                  >
                    {link.description}
                  </div>
                </div>
              </div>

              <div
                style={{
                  width: link.featured ? '38px' : '34px',
                  height: link.featured ? '38px' : '34px',
                  borderRadius: '9999px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: `${link.accentColor}12`,
                  border: `1px solid ${link.accentColor}22`,
                  position: 'relative',
                  zIndex: 1,
                }}
              >
                <ExternalLink size={link.featured ? 20 : 18} color={link.iconColor} />
              </div>
            </a>
          ))}
        </div>
      </div>

      <DiaryModal
        key={`profile-${selectedDiaryDate}-${selectedRecord?.review ?? ''}-${selectedRecord?.rating ?? 0}`}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        myTeamId={myTeam.id}
        selectedGame={selectedGame ?? null}
        selectedDate={selectedDiaryDate}
        onDateChange={handleDateChange}
        finishedGames={finishedGames}
        currentRecord={selectedRecord}
        attendanceLabel={selectedRecord?.isAttending ? '직관' : '중계'}
        year={currentYear}
      />
    </div>
  );
}
