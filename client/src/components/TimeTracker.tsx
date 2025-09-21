import React, { useState, useEffect } from 'react';
import { Play, Square, Clock } from 'lucide-react';

interface TimeEntry {
  id?: string;
  taskId: string;
  startTime: Date;
  endTime?: Date;
  duration: number;
  isActive: boolean;
}

interface TimeTrackerProps {
  taskId: string;
  onTimeUpdate?: (totalTime: number) => void;
}

export const TimeTracker: React.FC<TimeTrackerProps> = ({ taskId, onTimeUpdate }) => {
  const [isTracking, setIsTracking] = useState(false);
  const [currentEntry, setCurrentEntry] = useState<TimeEntry | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [totalTime, setTotalTime] = useState(0);

  useEffect(() => {
    fetchTotalTime();
  }, [taskId]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTracking && currentEntry) {
      interval = setInterval(() => {
        const now = Date.now();
        const elapsed = Math.floor((now - currentEntry.startTime.getTime()) / 1000);
        setElapsedTime(elapsed);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTracking, currentEntry]);

  const fetchTotalTime = async () => {
    try {
      const response = await fetch(`/api/getTaskTimeEntries.php?taskId=${taskId}`);
      const data = await response.json();
      const total = data.entries?.reduce((sum: number, entry: any) => sum + entry.duration, 0) || 0;
      setTotalTime(total);
      onTimeUpdate?.(total);
    } catch (error) {
      console.error('Error fetching time entries:', error);
    }
  };

  const startTimer = async () => {
    const now = new Date();
    const entry: TimeEntry = {
      taskId,
      startTime: now,
      duration: 0,
      isActive: true
    };

    try {
      const response = await fetch('/api/startTimeTracking.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId,
          startTime: now.toISOString()
        })
      });

      if (response.ok) {
        const data = await response.json();
        entry.id = data.id;
        setCurrentEntry(entry);
        setIsTracking(true);
        setElapsedTime(0);
      }
    } catch (error) {
      console.error('Error starting timer:', error);
    }
  };

  const stopTimer = async () => {
    if (!currentEntry) return;

    const now = new Date();
    const duration = Math.floor((now.getTime() - currentEntry.startTime.getTime()) / 1000);

    try {
      await fetch('/api/stopTimeTracking.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entryId: currentEntry.id,
          endTime: now.toISOString(),
          duration
        })
      });

      setTotalTime(prev => prev + duration);
      setCurrentEntry(null);
      setIsTracking(false);
      setElapsedTime(0);
      onTimeUpdate?.(totalTime + duration);
    } catch (error) {
      console.error('Error stopping timer:', error);
    }
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="time-tracker flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
      <Clock className="w-4 h-4 text-gray-500" />
      
      <div className="flex flex-col">
        <div className="text-sm font-mono text-gray-700 dark:text-gray-300">
          {isTracking ? formatTime(elapsedTime) : formatTime(totalTime)}
        </div>
        {totalTime > 0 && (
          <div className="text-xs text-gray-500">
            Total: {formatTime(totalTime)}
          </div>
        )}
      </div>

      <button
        onClick={isTracking ? stopTimer : startTimer}
        className={`flex items-center gap-1 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
          isTracking
            ? 'bg-red-500 hover:bg-red-600 text-white'
            : 'bg-green-500 hover:bg-green-600 text-white'
        }`}
      >
        {isTracking ? (
          <>
            <Square className="w-3 h-3" />
            Stop
          </>
        ) : (
          <>
            <Play className="w-3 h-3" />
            Start
          </>
        )}
      </button>
    </div>
  );
};
