'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CSSProperties, PointerEvent } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ChevronLeft, RotateCcw } from 'lucide-react';
import {
  getHealingMood,
  getHealingProgress,
  getRandomHealingEmoji,
} from '@/lib/healingCenter';

type FloatingEmoji = {
  id: number;
  x: number;
  y: number;
  emoji: string;
};

const MOKTAK_VIBRATION_MS = 18;
const HEALING_COUNT_STORAGE_KEY = 'jaebal-healing-count';

function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getMillisecondsUntilNextDay() {
  const now = new Date();
  const nextDay = new Date(now);
  nextDay.setHours(24, 0, 0, 0);
  return nextDay.getTime() - now.getTime();
}

export default function HealingPage() {
  const router = useRouter();
  const [count, setCount] = useState(0);
  const [clicks, setClicks] = useState<FloatingEmoji[]>([]);
  const [isPressing, setIsPressing] = useState(false);
  const [isCountLoaded, setIsCountLoaded] = useState(false);
  const mood = useMemo(() => getHealingMood(count), [count]);
  const progress = getHealingProgress(count);

  useEffect(() => {
    try {
      const storedValue = window.localStorage.getItem(HEALING_COUNT_STORAGE_KEY);
      const storedData = storedValue ? JSON.parse(storedValue) : null;

      if (
        storedData?.date === getLocalDateKey() &&
        Number.isInteger(storedData.count) &&
        storedData.count >= 0
      ) {
        setCount(storedData.count);
      } else {
        window.localStorage.removeItem(HEALING_COUNT_STORAGE_KEY);
      }
    } catch {
      window.localStorage.removeItem(HEALING_COUNT_STORAGE_KEY);
    } finally {
      setIsCountLoaded(true);
    }

    let resetTimerId: number | undefined;
    const scheduleDailyReset = () => {
      resetTimerId = window.setTimeout(() => {
        setCount(0);
        try {
          window.localStorage.setItem(
            HEALING_COUNT_STORAGE_KEY,
            JSON.stringify({ date: getLocalDateKey(), count: 0 })
          );
        } catch {
          window.localStorage.removeItem(HEALING_COUNT_STORAGE_KEY);
        }
        scheduleDailyReset();
      }, getMillisecondsUntilNextDay() + 500);
    };

    scheduleDailyReset();

    return () => {
      if (resetTimerId !== undefined) {
        window.clearTimeout(resetTimerId);
      }
    };
  }, []);

  useEffect(() => {
    if (!isCountLoaded) return;

    try {
      window.localStorage.setItem(
        HEALING_COUNT_STORAGE_KEY,
        JSON.stringify({ date: getLocalDateKey(), count })
      );
    } catch {
      window.localStorage.removeItem(HEALING_COUNT_STORAGE_KEY);
    }
  }, [count, isCountLoaded]);

  const handleTap = useCallback(
    (event: PointerEvent<HTMLButtonElement>) => {
      if ('vibrate' in navigator) {
        navigator.vibrate(MOKTAK_VIBRATION_MS);
      }

      setIsPressing(true);
      setCount((current) => current + 1);

      const rect = event.currentTarget.getBoundingClientRect();
      const newClick = {
        id: Date.now() + Math.random(),
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
        emoji: getRandomHealingEmoji(mood),
      };

      setClicks((current) => [...current, newClick]);
      window.setTimeout(() => {
        setClicks((current) => current.filter((click) => click.id !== newClick.id));
      }, 1000);
    },
    [mood]
  );

  const handleBack = useCallback(() => {
    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push('/profile');
  }, [router]);

  return (
    <main className="healing-page" style={{ '--healing-accent': mood.accent, '--healing-accent-dark': mood.accentDark, '--healing-soft': mood.accentSoft, '--healing-ring': mood.ring } as CSSProperties}>
      <div className="healing-shell">
        <header className="healing-header">
          <button type="button" className="healing-back" onClick={handleBack} aria-label="이전 페이지로 돌아가기">
            <ChevronLeft size={22} />
          </button>
          <div>
            <p className="healing-eyebrow">야구로 고혈압 오기 전에 누르고 가세요</p>
            <h1>심신 안정을 위한 야구 목탁</h1>
          </div>
          <button type="button" className="healing-reset" onClick={() => setCount(0)} aria-label="터치 횟수 초기화">
            <RotateCcw size={18} />
          </button>
        </header>

        <section className="healing-card" aria-live="polite">
          <div className="healing-message-block">
            <p className="healing-message">{mood.message}</p>
          </div>

          <div className="healing-button-wrap">
            <div className="healing-glow" />
            <button
              type="button"
              className="healing-main-button"
              onPointerDown={handleTap}
              onPointerUp={() => setIsPressing(false)}
              onPointerCancel={() => setIsPressing(false)}
              onPointerLeave={() => setIsPressing(false)}
              aria-label="목탁 두드리기"
            >
              <span className="healing-moktak-stage" aria-hidden="true">
                <Image
                  className={`healing-moktak-image ${isPressing ? 'is-visible' : ''}`}
                  src="/healing/baseball_moktak_bottom.png"
                  alt=""
                  fill
                  sizes="260px"
                  draggable={false}
                />
                <Image
                  className={`healing-moktak-image ${isPressing ? '' : 'is-visible'}`}
                  src="/healing/baseball_moktak_top.png"
                  alt=""
                  fill
                  sizes="260px"
                  draggable={false}
                />
              </span>
              {clicks.map((click) => (
                <span
                  key={click.id}
                  className="healing-floating-emoji"
                  style={{ left: click.x, top: click.y }}
                  aria-hidden="true"
                >
                  {click.emoji}
                </span>
              ))}
            </button>
          </div>

          <div className="healing-progress-block">
            <div className="healing-progress-top">
              <span>고혈압 치료 진행률</span>
              <strong>{progress}%</strong>
            </div>
            <div className="healing-progress-track">
              <div className="healing-progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <p>이렇게라도 화를 풀어내시길 바랍니다...</p>
          </div>
        </section>
      </div>
    </main>
  );
}
