'use client';

import { useState, useEffect } from 'react';
import { Sun, Moon, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './Card';
import { cn } from '@/lib/utils';

interface ShiftToggleProps {
  onShiftChange?: (shift: 'morning' | 'night') => void;
  currentShift?: 'morning' | 'night';
}

export const ShiftToggle = ({ onShiftChange, currentShift }: ShiftToggleProps) => {
  const [shift, setShift] = useState<'morning' | 'night'>(currentShift || 'morning');
  const [currentTime, setCurrentTime] = useState(new Date());

  // Auto-detect shift based on time
  useEffect(() => {
    const hour = currentTime.getHours();
    const detectedShift = hour >= 6 && hour < 18 ? 'morning' : 'night';
    
    if (!currentShift) {
      setShift(detectedShift);
      onShiftChange?.(detectedShift);
    }
  }, [currentTime, currentShift, onShiftChange]);

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  const handleShiftChange = (newShift: 'morning' | 'night') => {
    setShift(newShift);
    onShiftChange?.(newShift);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getShiftProgress = () => {
    const hour = currentTime.getHours();
    if (shift === 'morning') {
      return Math.min(((hour - 6) / 12) * 100, 100);
    } else {
      return hour >= 18 ? Math.min(((hour - 18) / 12) * 100, 100) : Math.min((hour / 6) * 100, 100);
    }
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Shift Management
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">Current Time</span>
            <span className="font-mono text-lg font-semibold">
              {formatTime(currentTime)}
            </span>
          </div>

          <div className="flex rounded-lg bg-slate-100 p-1">
            <button
              onClick={() => handleShiftChange('morning')}
              className={cn(
                'flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all',
                shift === 'morning'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <Sun className="h-4 w-4" />
              Morning
            </button>
            <button
              onClick={() => handleShiftChange('night')}
              className={cn(
                'flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all',
                shift === 'night'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <Moon className="h-4 w-4" />
              Night
            </button>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-600">Shift Progress</span>
              <span className="text-sm font-medium">{Math.round(getShiftProgress())}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-200">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                style={{ width: `${getShiftProgress()}%` }}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
