"use client";

import React, { useState, useEffect } from 'react';

interface SlaCountdownProps {
  targetDate: string; // ISO 8601 string
  type: 'ack' | 'resolve';
  isBreached: boolean;
  isPaused?: boolean;
  pausedAt?: string | null; // ISO 8601 string
}

export default function SlaCountdown({ targetDate, type, isBreached, isPaused, pausedAt }: SlaCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    if (!targetDate) return;

    const targetTime = new Date(targetDate).getTime();

    const updateTimer = () => {
      const now = (isPaused && pausedAt) ? new Date(pausedAt).getTime() : new Date().getTime();
      const difference = targetTime - now;
      const isPast = difference < 0;

      const absDiff = Math.abs(difference);
      const hours = Math.floor(absDiff / (1000 * 60 * 60));
      const minutes = Math.floor((absDiff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((absDiff % (1000 * 60)) / 1000);

      const formatted = `${hours.toString().padStart(2, '0')}:${minutes
        .toString()
        .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

      if (isPast) {
        setTimeLeft(`-${formatted}`);
      } else {
        setTimeLeft(formatted);
      }
    };

    updateTimer();
    const intervalId = setInterval(updateTimer, 1000);

    return () => clearInterval(intervalId);
  }, [targetDate, isPaused, pausedAt]);

  if (!targetDate) return <span className="text-gray-500 font-mono text-xs">No SLA target</span>;

  return (
    <div className={`font-mono text-sm px-2 py-1 border-2 border-black font-bold flex flex-col items-center justify-center ${
      isBreached ? 'bg-red-600 text-white animate-pulse' : 'bg-[#e9e8e1] text-black'
    }`}>
      <span className="text-[10px] uppercase tracking-wider opacity-80 mb-0.5">
        {type === 'ack' ? 'ACK SLA' : 'RES SLA'}
      </span>
      <span>{timeLeft}</span>
    </div>
  );
}
