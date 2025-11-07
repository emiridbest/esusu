"use client";

import React, { useState, useEffect } from 'react';

interface CountdownTimerProps {
  targetDate: Date;
  onComplete?: () => void;
  className?: string;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({ 
  targetDate, 
  onComplete, 
  className = "" 
}) => {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(null);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const target = targetDate.getTime();
      const difference = target - now;

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        return { days, hours, minutes, seconds };
      } else {
        return null;
      }
    };

    const updateTimer = () => {
      const timeLeft = calculateTimeLeft();
      setTimeLeft(timeLeft);
      
      if (!timeLeft && onComplete) {
        onComplete();
      }
    };

    // Update immediately
    updateTimer();

    // Update every second
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [targetDate, onComplete]);

  if (!timeLeft) {
    return (
      <div className={`text-center ${className}`}>
        <div className="text-2xl font-bold text-green-600">Group Started!</div>
        <div className="text-sm text-gray-500">Contributions are now open</div>
      </div>
    );
  }

  return (
    <div className={`text-center ${className}`}>
      <div className="text-lg font-semibold text-gray-700 mb-2">
        Group starts in:
      </div>
      <div className="grid grid-cols-4 gap-2 max-w-xs mx-auto">
        <div className="bg-blue-100 rounded-lg p-3">
          <div className="text-2xl font-bold text-blue-600">{timeLeft.days}</div>
          <div className="text-xs text-blue-500">Days</div>
        </div>
        <div className="bg-blue-100 rounded-lg p-3">
          <div className="text-2xl font-bold text-blue-600">{timeLeft.hours}</div>
          <div className="text-xs text-blue-500">Hours</div>
        </div>
        <div className="bg-blue-100 rounded-lg p-3">
          <div className="text-2xl font-bold text-blue-600">{timeLeft.minutes}</div>
          <div className="text-xs text-blue-500">Minutes</div>
        </div>
        <div className="bg-blue-100 rounded-lg p-3">
          <div className="text-2xl font-bold text-blue-600">{timeLeft.seconds}</div>
          <div className="text-xs text-blue-500">Seconds</div>
        </div>
      </div>
      <div className="text-sm text-gray-500 mt-2">
        Starting on {targetDate.toLocaleDateString()} at {targetDate.toLocaleTimeString()}
      </div>
    </div>
  );
};

export default CountdownTimer;
