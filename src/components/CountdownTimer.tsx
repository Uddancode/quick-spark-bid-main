import { useState, useEffect, useMemo } from 'react';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CountdownTimerProps {
  endTime: string;
  getServerTime: () => Date;
}

export function CountdownTimer({ endTime, getServerTime }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
    total: number;
  }>({ hours: 0, minutes: 0, seconds: 0, total: 0 });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const end = new Date(endTime).getTime();
      const now = getServerTime().getTime();
      const diff = Math.max(0, end - now);

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      return { hours, minutes, seconds, total: diff };
    };

    setTimeLeft(calculateTimeLeft());

    const interval = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(interval);
  }, [endTime, getServerTime]);

  const isUrgent = timeLeft.total < 5 * 60 * 1000; // Less than 5 minutes
  const isEnded = timeLeft.total === 0;

  const formatNumber = (num: number) => String(num).padStart(2, '0');

  if (isEnded) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Clock className="w-4 h-4" />
        <span className="font-mono text-sm">Ended</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex items-center gap-2 font-mono text-sm transition-colors',
        isUrgent ? 'countdown-urgent' : 'countdown-normal'
      )}
    >
      <Clock className={cn('w-4 h-4', isUrgent && 'animate-countdown-tick')} />
      <div className="flex gap-1">
        {timeLeft.hours > 0 && (
          <>
            <span className="tabular-nums">{formatNumber(timeLeft.hours)}</span>
            <span className="text-muted-foreground">:</span>
          </>
        )}
        <span className="tabular-nums">{formatNumber(timeLeft.minutes)}</span>
        <span className="text-muted-foreground">:</span>
        <span className="tabular-nums">{formatNumber(timeLeft.seconds)}</span>
      </div>
    </div>
  );
}
