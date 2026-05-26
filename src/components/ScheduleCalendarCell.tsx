'use client';

import type { CalendarGamePreview } from '@/lib/scheduleCalendarView';

interface ScheduleCalendarCellProps {
  label: string;
  isCurrentMonth: boolean;
  isSelected: boolean;
  isToday: boolean;
  disabled: boolean;
  hasDiary: boolean;
  preview: CalendarGamePreview | null;
  onClick: () => void;
}

const badgeStyles: Record<
  CalendarGamePreview['badge'],
  { color: string; background: string; border: string; textDecoration?: 'line-through'; fontWeight?: number }
> = {
  홈: { color: '#94A3B8', background: 'transparent', border: 'transparent', fontWeight: 700 },
  원정: { color: '#94A3B8', background: 'transparent', border: 'transparent', fontWeight: 700 },
  취소: { color: '#64748B', background: '#F1F5F9', border: 'transparent', fontWeight: 800 },
  확인중: { color: '#64748B', background: '#F1F5F9', border: 'transparent', fontWeight: 800 },
  승: { color: '#059669', background: '#ECFDF5', border: 'transparent', fontWeight: 900 },
  패: { color: '#E11D48', background: '#FFF1F2', border: 'transparent', fontWeight: 900 },
  무: { color: '#64748B', background: '#F1F5F9', border: 'transparent', fontWeight: 900 },
};

export default function ScheduleCalendarCell({
  label,
  isCurrentMonth,
  isSelected,
  isToday,
  disabled,
  hasDiary,
  preview,
  onClick,
}: ScheduleCalendarCellProps) {
  const badgeStyle = preview ? badgeStyles[preview.badge] : null;
  const hasGame = Boolean(preview);
  const showHomeAway = preview && preview.tone === 'scheduled';
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
        aspectRatio: '5 / 6',
        minHeight: '72px',
        borderRadius: '17px',
        padding: '6px 5px',
        background: !isCurrentMonth ? 'transparent' : hasGame ? '#FFFFFF' : 'transparent',
        border: !isCurrentMonth
          ? '1px solid transparent'
          : isSelected
            ? '2px solid #FB7185'
            : hasGame
              ? '1px solid rgba(241, 245, 249, 0.7)'
              : '1px solid transparent',
        opacity: isCurrentMonth ? 1 : 0,
        display: 'grid',
        gridTemplateRows: '15px minmax(0, 1fr)',
        rowGap: '2px',
        alignItems: 'stretch',
        cursor: disabled ? 'default' : 'pointer',
        boxShadow: isSelected
          ? '0 8px 20px rgba(244, 63, 94, 0.2)'
          : hasGame
            ? '0 1px 4px rgba(15, 23, 42, 0.04)'
            : 'none',
        transform: isSelected ? 'scale(1.05)' : 'scale(1)',
        transition: 'transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease, background-color 180ms ease',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <span
        style={{
          justifySelf: 'flex-start',
          minWidth: '16px',
          height: '15px',
          borderRadius: '999px',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '3px',
          fontSize: '11px',
          lineHeight: 1,
          fontWeight: 800,
          color: isSelected ? '#F43F5E' : isToday ? '#111827' : '#64748B',
          background: 'transparent',
        }}
      >
        {label}
        {hasDiary && (
          <span
            aria-label="야구일기 작성됨"
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '999px',
              background: '#F59E0B',
              display: 'inline-block',
              flexShrink: 0,
            }}
          />
        )}
      </span>

      <div
        style={{
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          marginTop: '-3px',
        }}
      >
        {preview ? (
          <>
            <span
              style={{
                maxWidth: '100%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontSize: '12px',
                lineHeight: 1,
                fontWeight: 950,
                color: isSelected ? '#0F172A' : '#1E293B',
              }}
            >
              {preview.opponent}
            </span>

            {showResultBadge ? (
              <span
                style={{
                  minWidth: '25px',
                  padding: '3px 7px',
                  borderRadius: '999px',
                  border: `1px solid ${badgeStyle?.border ?? 'transparent'}`,
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
                  color: isSelected ? '#FB7185' : '#94A3B8',
                  fontSize: '9px',
                  fontWeight: 600,
                  lineHeight: 1,
                }}
              >
                {preview.isHome ? '홈' : '원정'}
              </span>
            ) : null}
          </>
        ) : null}
      </div>
    </button>
  );
}
