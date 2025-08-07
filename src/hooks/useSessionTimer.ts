'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface SessionTimerState {
  elapsedTime: number;
  isRunning: boolean;
  isPaused: boolean;
  formattedTime: string;
}

interface SessionTimerControls {
  start: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  reset: () => void;
  addTime: (seconds: number) => void;
}

export function useSessionTimer(): [SessionTimerState, SessionTimerControls] {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const pausedTimeRef = useRef<number>(0);

  const formatTime = useCallback((seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const updateTimer = useCallback(() => {
    if (startTimeRef.current && !isPaused) {
      const currentTime = Math.floor((Date.now() - startTimeRef.current - pausedTimeRef.current) / 1000);
      setElapsedTime(currentTime);
    }
  }, [isPaused]);

  const start = useCallback(() => {
    if (!isRunning) {
      startTimeRef.current = Date.now();
      pausedTimeRef.current = 0;
      setIsRunning(true);
      setIsPaused(false);
      setElapsedTime(0);
    }
  }, [isRunning]);

  const pause = useCallback(() => {
    if (isRunning && !isPaused) {
      setIsPaused(true);
      const pauseStartTime = Date.now();
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      // Store when pause started for calculating total paused time
      const currentPausedTime = pausedTimeRef.current;
      pausedTimeRef.current = currentPausedTime;
    }
  }, [isRunning, isPaused]);

  const resume = useCallback(() => {
    if (isRunning && isPaused) {
      // Add the time that was paused to the total paused time
      const pauseDuration = Date.now() - (startTimeRef.current || 0) - elapsedTime * 1000;
      pausedTimeRef.current += pauseDuration;
      
      setIsPaused(false);
    }
  }, [isRunning, isPaused, elapsedTime]);

  const stop = useCallback(() => {
    setIsRunning(false);
    setIsPaused(false);
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    startTimeRef.current = null;
    pausedTimeRef.current = 0;
  }, []);

  const reset = useCallback(() => {
    stop();
    setElapsedTime(0);
  }, [stop]);

  const addTime = useCallback((seconds: number) => {
    setElapsedTime(prev => Math.max(0, prev + seconds));
    
    // Adjust the start time to reflect the added/subtracted time
    if (startTimeRef.current) {
      startTimeRef.current -= seconds * 1000;
    }
  }, []);

  // Effect to handle timer updates
  useEffect(() => {
    if (isRunning && !isPaused) {
      intervalRef.current = setInterval(updateTimer, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning, isPaused, updateTimer]);

  const state: SessionTimerState = {
    elapsedTime,
    isRunning,
    isPaused,
    formattedTime: formatTime(elapsedTime),
  };

  const controls: SessionTimerControls = {
    start,
    pause,
    resume,
    stop,
    reset,
    addTime,
  };

  return [state, controls];
}