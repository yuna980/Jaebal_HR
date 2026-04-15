'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, MapPin, User, Calendar } from 'lucide-react';

export default function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { name: '홈', href: '/dashboard', icon: Home },
    { name: '대진표', href: '/schedule', icon: Calendar },
    { name: '구장정보', href: '/stadiums', icon: MapPin },
    { name: '마이', href: '/profile', icon: User },
  ];

  if (pathname === '/') return null;

  return (
    <nav className="bottom-nav">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;
        return (
          <Link key={item.href} href={item.href} className={`nav-item ${isActive ? 'active' : ''}`}>
            <Icon size={24} color={isActive ? 'var(--primary)' : 'var(--text-light)'} />
            <span>{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}
