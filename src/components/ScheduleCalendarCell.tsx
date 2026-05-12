'use client';

import type { CalendarGamePreview } from '@/lib/scheduleCalendarView';
import { MapPin } from 'lucide-react';

interface ScheduleCalendarCellProps {
  label: string;
  isCurrentMonth: boolean;
  isSelected: boolean;
  isToday: boolean;
  disabled: boolean;
  preview: CalendarGamePreview | null;
  onClick: () => void;
}

const badgeStyles: Record<
  CalendarGamePreview['badge'],
  { color: string; background: string; border: string; textDecoration?: 'line-through'; fontWeight?: number }
> = {
  홈: { color: '#94A3B8', background: 'transparent', border: 'transparent', fontWeight: 700 },
  원정: { color: '#94A3B8', background: 'transparent', border: 'transparent', fontWeight: 700 },
  취소: { color: '#64748B', background: '#F8FAFC', border: '#E2E8F0', fontWeight: 800 },
  확인중: { color: '#64748B', background: '#F8FAFC', border: '#E2E8F0', fontWeight: 800 },
  승: { color: '#059669', background: '#ECFDF5', border: '#A7F3D0', fontWeight: 900 },
  패: { color: '#E11D48', background: '#FFF1F2', border: '#FECDD3', fontWeight: 900 },
  무: { color: '#2563EB', background: '#EFF6FF', border: '#BFDBFE', fontWeight: 900 },
};

export default function ScheduleCalendarCell({
  label,
  isCurrentMonth,
  isSelected,
  isToday,
  disabled,
  preview,
  onClick,
}: ScheduleCalendarCellProps) {
  const badgeStyle = preview ? badgeStyles[preview.badge] : null;
  const dateColor = !isCurrentMonth ? 'transparent' : isToday ? '#111827' : '#94A3B8';
  const hasGame = Boolean(preview);
  const showHomeAway = preview && preview.tone === 'scheduled' && preview.isHome;
  const showResultBadge =
    preview &&
    (preview.badge === '승' ||
      preview.badge === '패' ||
      preview.badge === '무' ||
      preview.badge === '취소' ||
      preview.badge === '확인중');

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: '100%',
        minWidth: 0,
        aspectRatio: '4 / 5',
        minHeight: '70px',
        borderRadius: '12px',
        padding: '4px',
        background: !isCurrentMonth ? 'transparent' : hasGame ? '#FFFFFF' : 'transparent',
        border: !isCurrentMonth
          ? '1px solid transparent'
          : isSelected
            ? '1.5px solid #1E293B'
            : hasGame
              ? '1px solid rgba(226, 232, 240, 0.9)'
              : '1px solid transparent',
        opacity: isCurrentMonth ? 1 : 0,
        display: 'grid',
        gridTemplateRows: '18px 18px 18px 8px',
        rowGap: '3px',
        alignItems: 'center',
        cursor: disabled ? 'default' : 'pointer',
        boxShadow: isSelected ? '0 8px 18px rgba(15, 23, 42, 0.14)' : 'none',
        transform: isSelected ? 'scale(1.05)' : 'scale(1)',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <span
        style={{
          justifySelf: 'flex-start',
          minWidth: '18px',
          height: '18px',
          borderRadius: '999px',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '10px',
          lineHeight: 1,
          fontWeight: isToday ? 900 : 800,
          color: dateColor,
          background: isToday ? 'rgba(49, 130, 246, 0.1)' : 'transparent',
        }}
      >
        {label}
      </span>

      <div
        style={{
          minWidth: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {preview ? (
          <span
            style={{
              maxWidth: '100%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontSize: '13px',
              lineHeight: 1,
              fontWeight: 900,
              color: '#1E293B',
            }}
          >
            {preview.opponent}
          </span>
        ) : null}
      </div>

      <div
        style={{
          minWidth: 0,
          minHeight: '18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {showResultBadge ? (
          <span
            style={{
              minWidth: '24px',
              padding: '3px 6px',
              borderRadius: '6px',
              border: `1px solid ${badgeStyle?.border ?? '#E2E8F0'}`,
              fontSize: '9px',
              fontWeight: badgeStyle?.fontWeight ?? 900,
              background: badgeStyle?.background,
              color: badgeStyle?.color,
              lineHeight: 1,
              textAlign: 'center',
              textDecoration: badgeStyle?.textDecoration,
            }}
          >
            {preview?.badge}
          </span>
        ) : showHomeAway ? (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '2px',
              color: '#94A3B8',
              fontSize: '9px',
              fontWeight: 700,
              lineHeight: 1,
            }}
          >
            <MapPin size={8} />
            <span>홈</span>
          </span>
        ) : null}
      </div>

      <div
        style={{
          minHeight: '8px',
        }}
      />
    </button>
  );
}
