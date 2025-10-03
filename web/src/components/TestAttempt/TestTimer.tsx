'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useI18n } from '@/contexts/LanguageContext';

interface TestTimerProps {
  timeLeftInSeconds: number;
  onTimeout: () => void;
}

export default function TestTimer({ timeLeftInSeconds, onTimeout }: TestTimerProps) {
  const { t } = useI18n();
  const [timeLeft, setTimeLeft] = useState(timeLeftInSeconds);
  const [initialTime, setInitialTime] = useState(Math.max(timeLeftInSeconds, 0));
  const timeoutTriggeredRef = useRef(false);
  const onTimeoutRef = useRef(onTimeout);

  useEffect(() => {
    onTimeoutRef.current = onTimeout;
  }, [onTimeout]);

  useEffect(() => {
    setTimeLeft(timeLeftInSeconds);
    if (timeLeftInSeconds > 0) {
      setInitialTime((prev) => Math.max(prev, Math.max(timeLeftInSeconds, 0)));
      timeoutTriggeredRef.current = false;
    }
  }, [timeLeftInSeconds]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0) {
          if (!timeoutTriggeredRef.current) {
            timeoutTriggeredRef.current = true;
            onTimeoutRef.current();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const formattedTime = useMemo(() => {
    const minutes = Math.floor(Math.max(timeLeft, 0) / 60);
    const seconds = Math.max(timeLeft, 0) % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, [timeLeft]);

  const progress = useMemo(() => {
    if (!initialTime || initialTime <= 0) return 0;
    return Math.max(0, Math.min(100, Math.round((timeLeft / initialTime) * 100)));
  }, [timeLeft, initialTime]);

  const urgencyClass = timeLeft <= 10 ? 'text-rose-300' : timeLeft <= 30 ? 'text-amber-300' : 'text-white';

  return (
    <div className="flex items-center gap-4 rounded-3xl border border-white/15 bg-white/10 px-6 py-5 shadow-lg shadow-indigo-500/10 backdrop-blur">
      <div className="relative h-16 w-16">
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `conic-gradient(#6366f1 ${progress}%, rgba(226,232,240,0.2) ${progress}% 100%)`
          }}
        />
        <div className="absolute inset-2 flex items-center justify-center rounded-full bg-slate-950 text-sm font-semibold text-slate-100">
          {Math.max(timeLeft, 0)}
        </div>
      </div>

      <div className="text-right">
        <p className="text-xs uppercase tracking-[0.3em] text-indigo-200">{t('timer.label')}</p>
        <p className={`mt-1 text-2xl font-semibold ${urgencyClass}`}>{formattedTime}</p>
        <p className="text-xs text-slate-200/80">{t('timer.autoSubmit')}</p>
      </div>
    </div>
  );
}
