'use client';

import type { CalendarGamePreview } from '@/lib/scheduleCalendarView';

interface ScheduleCalendarCellProps {
  label: string;
  isCurrentMonth: boolean;
  isSelected: boolean;
  isToday: boolean;
  disabled: boolean;
  preview: CalendarGamePreview | null;
  accentColor: string;
  onClick: () => void;
}

const badgeStyles: Record<
  CalendarGamePreview['badge'],
  { color: string; background: string; textDecoration?: 'line-through'; fontWeight?: number }
> = {
  홈: { color: '#475569', background: 'transparent', fontWeight: 700 },
  원정: { color: '#EA580C', background: 'transparent', fontWeight: 800 },
  취소: { color: '#9CA3AF', background: '#F3F4F6', fontWeight: 700 },
  승: { color: '#2563EB', background: '#EFF6FF', fontWeight: 800 },
  패: { color: '#F43F5E', background: '#FFF1F2', fontWeight: 800 },
  무: { color: '#16A34A', background: '#F0FDF4', fontWeight: 800 },
};

export default function ScheduleCalendarCell({
  label,
  isCurrentMonth,
  isSelected,
  isToday,
  disabled,
  preview,
  accentColor,
  onClick,
}: ScheduleCalendarCellProps) {
  const badgeStyle = preview ? badgeStyles[preview.badge] : null;
  const dateColor = !isCurrentMonth
    ? 'transparent'
    : isSelected
      ? '#FFFFFF'
      : isToday
        ? '#111827'
        : '#D1D5DB';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: '100%',
        minWidth: 0,
        aspectRatio: '1 / 1.1',
        minHeight: '74px',
        borderRadius: '18px',
        padding: '6px 2px',
        background: 'transparent',
        border: 'none',
        opacity: isCurrentMonth ? 1 : 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: '6px',
        cursor: disabled ? 'default' : 'pointer',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <div style={{ minHeight: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '9999px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '15px',
            lineHeight: 1,
            fontWeight: isSelected ? 800 : 700,
            color: dateColor,
            background: isSelected ? accentColor : 'transparent',
          }}
        >
          {label}
        </span>
      </div>

      {preview ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', minWidth: 0, flex: 1 }}>
          <span
            style={{
              minWidth: preview.badge === '홈' || preview.badge === '원정' ? 'auto' : '26px',
              padding:
                preview.badge === '승' || preview.badge === '패' || preview.badge === '무'
                  ? '4px 8px'
                  : preview.badge === '취소'
                    ? '3px 8px'
                    : '0',
              borderRadius: '9999px',
              fontSize: preview.badge === '취소' ? '12px' : '12px',
              fontWeight: badgeStyle?.fontWeight ?? 800,
              background: badgeStyle?.background,
              color: badgeStyle?.color,
              lineHeight: 1.1,
              textAlign: 'center',
              textDecoration: badgeStyle?.textDecoration,
              letterSpacing: preview.badge === '홈' || preview.badge === '원정' ? '-0.01em' : 'normal',
              opacity: preview.badge === '취소' ? 1 : 1,
            }}
          >
            {preview.badge}
          </span>
        </div>
      ) : (
        <div style={{ flex: 1 }} />
      )}
    </button>
  );
}
