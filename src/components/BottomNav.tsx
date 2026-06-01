'use client';

import Link from 'next/link';
import { useEffect, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Home, MapPin, User, Calendar } from 'lucide-react';
import { useTeam } from '@/context/TeamContext';
import { prefetchGameScheduleMonth } from '@/hooks/useGameScheduleMonth';
import { getTodayDateString } from '@/hooks/useKboSchedule';
import { prefetchTodayGameSchedule } from '@/hooks/useTodayGameSchedule';

const NAV_ITEMS = [
  { name: '홈', href: '/dashboard', icon: Home },
  { name: '대진표', href: '/schedule', icon: Calendar },
  { name: '구장정보', href: '/stadiums', icon: MapPin },
  { name: '마이', href: '/profile', icon: User },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { myTeam } = useTeam();
  const shouldHideNav =
    pathname === '/' ||
    pathname === '/teams' ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/auth');

  const prefetchDashboardData = useCallback(() => {
    const today = new Date();
    prefetchGameScheduleMonth(today.getFullYear(), today.getMonth() + 1);
    prefetchTodayGameSchedule(myTeam?.id, getTodayDateString());
  }, [myTeam?.id]);

  useEffect(() => {
    if (shouldHideNav || !myTeam) return;

    NAV_ITEMS.forEach((item) => router.prefetch(item.href));

    const timeoutId = window.setTimeout(prefetchDashboardData, 300);
    return () => window.clearTimeout(timeoutId);
  }, [myTeam, prefetchDashboardData, router, shouldHideNav]);

  if (shouldHideNav) return null;

  return (
    <nav className="bottom-nav">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-item ${isActive ? 'active' : ''}`}
            onPointerEnter={() => {
              router.prefetch(item.href);
              if (item.href === '/dashboard') prefetchDashboardData();
            }}
            onTouchStart={() => {
              router.prefetch(item.href);
              if (item.href === '/dashboard') prefetchDashboardData();
            }}
          >
            <Icon size={24} color={isActive ? 'var(--primary)' : 'var(--text-light)'} />
            <span>{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}
