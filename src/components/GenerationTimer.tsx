import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

interface Props {
  isRunning: boolean;
  isPaused: boolean;
}

export const GenerationTimer = ({ isRunning, isPaused }: Props) => {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!isRunning) {
      setElapsedSeconds(0);
      return;
    }

    if (isPaused) {
      return; // Don't increment while paused
    }

    // Use setInterval for consistent timing even in background tabs
    const interval = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, isPaused]);

  if (!isRunning) return null;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center justify-center gap-2 mb-3 text-sm text-muted-foreground animate-slide-up">
      <Clock className="w-4 h-4" />
      <span className="font-mono font-medium">
        {formatTime(elapsedSeconds)}
      </span>
      {isPaused && <span className="text-yellow-600 font-semibold">(Paused)</span>}
    </div>
  );
};
