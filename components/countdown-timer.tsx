"use client"

import { useEffect, useState } from 'react';

export type CountdownTimerProps = {
  targetDate: Date;
  className?: string;
  showLabels?: boolean;
  compact?: boolean;
};

export function CountdownTimer({ 
  targetDate, 
  className = "", 
  showLabels = true,
  compact = false
}: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isPast: false
  });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = targetDate.getTime() - new Date().getTime();
      const isPast = difference <= 0;
      
      if (isPast) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true };
      }
      
      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
        isPast: false
      };
    };

    // Initial calculation
    setTimeLeft(calculateTimeLeft());

    // Update every second
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  if (compact) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <span className="text-base font-bold">
          {timeLeft.isPast ? (
            "Event has passed"
          ) : (
            <>
              <span>{timeLeft.days}</span><span className="text-red-0">d</span>{" "}
              <span>{timeLeft.hours}</span><span className="text-red-0">h</span>{" "}
              <span>{timeLeft.minutes}</span><span className="text-red-0">m</span>{" "}
              <span>{timeLeft.seconds}</span><span className="text-red-0">s</span>
            </>
          )}
        </span>
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-4 gap-2 md:gap-4 ${className}`}>
      <CountdownItem value={timeLeft.days} label="Days" showLabel={showLabels} />
      <CountdownItem value={timeLeft.hours} label="Hours" showLabel={showLabels} />
      <CountdownItem value={timeLeft.minutes} label="Minutes" showLabel={showLabels} />
      <CountdownItem value={timeLeft.seconds} label="Seconds" showLabel={showLabels} />
    </div>
  );
}

function CountdownItem({ value, label, showLabel = true }: { value: number; label: string; showLabel?: boolean }) {
  return (
    <div className="bg-card rounded-lg p-2 md:p-4 shadow-sm border border-border text-center">
      <div className="text-xl md:text-3xl font-semibold mb-1 text-red-0">{value.toString().padStart(2, '0')}</div>
      {showLabel && <div className="text-xs md:text-sm text-muted-foreground">{label}</div>}
    </div>
  );
}