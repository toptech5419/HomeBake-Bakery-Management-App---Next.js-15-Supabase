'use client';

import React, { useState, useEffect } from 'react';
import { useShift } from '@/contexts/ShiftContext';
import { cn } from '@/lib/utils';
import { ModernCard } from './ModernCard';

interface EnhancedShiftToggleProps {
  className?: string;
  showProgress?: boolean;
  showRemarks?: boolean;
  userRole?: 'manager' | 'sales_rep';
}

const ClockIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={cn("h-5 w-5", className)} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const SunIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={cn("h-5 w-5", className)} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m8.66-12.66l-.7.7M4.04 19.96l-.7.7M21 12h-1M4 12H3m16.66-7.96l-.7.7M4.74 4.74l-.7.7m12.72 0l.7.7M4.04 4.04l.7.7" />
  </svg>
);

const MoonIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={cn("h-5 w-5", className)} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
  </svg>
);

const PlayIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={cn("h-4 w-4", className)} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const StopIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={cn("h-4 w-4", className)} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export function EnhancedShiftToggle({ 
  className, 
  showProgress = true, 
  showRemarks = false,
  userRole = 'sales_rep'
}: EnhancedShiftToggleProps) {
  const { currentShift, setCurrentShift, isAutoMode, setIsAutoMode } = useShift();
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [shiftStarted, setShiftStarted] = useState(false);
  const [remarks, setRemarks] = useState('');

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const getShiftProgress = () => {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      
      if (currentShift === 'morning') {
        // Morning shift: 8 AM - 6 PM (10 hours)
        const startHour = 8;
        const endHour = 18;
        
        if (currentHour < startHour) return 0;
        if (currentHour >= endHour) return 100;
        
        const totalMinutes = (endHour - startHour) * 60;
        const elapsedMinutes = (currentHour - startHour) * 60 + currentMinute;
        return Math.min((elapsedMinutes / totalMinutes) * 100, 100);
      } else {
        // Night shift: 8 PM - 7 AM (11 hours)
        const startHour = 20;
        const endHour = 7;
        
        if (currentHour >= startHour) {
          // After 8 PM
          const totalMinutes = (24 - startHour + endHour) * 60;
          const elapsedMinutes = (currentHour - startHour) * 60 + currentMinute;
          return Math.min((elapsedMinutes / totalMinutes) * 100, 100);
        } else if (currentHour < endHour) {
          // Before 7 AM
          const totalMinutes = (24 - startHour + endHour) * 60;
          const elapsedMinutes = (24 - startHour + currentHour) * 60 + currentMinute;
          return Math.min((elapsedMinutes / totalMinutes) * 100, 100);
        }
        return 0;
      }
    };
    
    setProgress(getShiftProgress());
  }, [currentTime, currentShift]);

  const getShiftTimes = (shift: 'morning' | 'night') => {
    return shift === 'morning' ? '8:00 AM - 6:00 PM' : '8:00 PM - 7:00 AM';
  };

  const getDetectedShift = () => {
    const hour = currentTime.getHours();
    return hour >= 8 && hour < 18 ? 'morning' : 'night';
  };

  const handleStartShift = () => {
    setShiftStarted(true);
    // Here you would typically make an API call to start the shift
  };

  const handleEndShift = () => {
    setShiftStarted(false);
    setRemarks('');
    // Here you would typically make an API call to end the shift with remarks
  };

  return (
    <ModernCard
      title="Shift Management"
      subtitle={`${userRole === 'manager' ? 'Production' : 'Sales'} shift tracking`}
      icon={<ClockIcon />}
      color="blue"
      className={className}
    >
      <div className="space-y-4">
        {/* Current Shift Status */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-2">
              {currentShift === 'morning' ? (
                <SunIcon className="text-orange-500" />
              ) : (
                <MoonIcon className="text-blue-500" />
              )}
              <span className="font-semibold text-gray-800 capitalize">
                {currentShift} Shift
              </span>
            </div>
            <span className={cn(
              'px-2 py-1 text-xs font-semibold rounded-full',
              shiftStarted 
                ? 'bg-green-100 text-green-800' 
                : 'bg-gray-100 text-gray-600'
            )}>
              {shiftStarted ? 'Active' : 'Inactive'}
            </span>
          </div>
          <p className="text-sm text-gray-600 mb-2">
            {getShiftTimes(currentShift)}
          </p>
          
          {showProgress && (
            <div>
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Progress</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Shift Toggle */}
        <div>
          <h4 className="font-semibold text-gray-700 mb-2">Switch Shift</h4>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setCurrentShift('morning')}
              className={cn(
                'flex items-center gap-2 p-3 rounded-lg border-2 transition-all text-left',
                currentShift === 'morning'
                  ? 'border-orange-500 bg-orange-50'
                  : 'border-gray-200 bg-white hover:bg-gray-50'
              )}
            >
              <SunIcon className={currentShift === 'morning' ? 'text-orange-500' : 'text-gray-400'} />
              <div>
                <p className="font-semibold text-sm">Morning</p>
                <p className="text-xs text-gray-500">8 AM - 6 PM</p>
              </div>
            </button>
            
            <button
              onClick={() => setCurrentShift('night')}
              className={cn(
                'flex items-center gap-2 p-3 rounded-lg border-2 transition-all text-left',
                currentShift === 'night'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white hover:bg-gray-50'
              )}
            >
              <MoonIcon className={currentShift === 'night' ? 'text-blue-500' : 'text-gray-400'} />
              <div>
                <p className="font-semibold text-sm">Night</p>
                <p className="text-xs text-gray-500">8 PM - 7 AM</p>
              </div>
            </button>
          </div>
        </div>

        {/* Shift Controls */}
        <div className="grid grid-cols-2 gap-2">
          {!shiftStarted ? (
            <button
              onClick={handleStartShift}
              className="flex items-center justify-center gap-2 py-2 px-3 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 transition-colors"
            >
              <PlayIcon />
              Start Shift
            </button>
          ) : (
            <button
              onClick={handleEndShift}
              className="flex items-center justify-center gap-2 py-2 px-3 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600 transition-colors"
            >
              <StopIcon />
              End Shift
            </button>
          )}
          
          <button
            onClick={() => setIsAutoMode(!isAutoMode)}
            className={cn(
              'py-2 px-3 font-semibold rounded-lg transition-colors',
              isAutoMode
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            )}
          >
            {isAutoMode ? 'Auto Mode' : 'Manual'}
          </button>
        </div>

        {/* Remarks Section for Manager */}
        {showRemarks && shiftStarted && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Shift Remarks
            </label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Add notes about production, quality, or issues..."
              className="w-full p-2 border border-gray-300 rounded-lg text-sm resize-none"
              rows={3}
            />
          </div>
        )}

        {/* Current Time & Detection */}
        <div className="text-center text-sm text-gray-500 border-t pt-3">
          <div className="flex items-center justify-center gap-2 mb-1">
            <ClockIcon className="h-4 w-4" />
            <span>Current: {currentTime.toLocaleTimeString()}</span>
          </div>
          <p className="text-xs">
            Detected shift: {getDetectedShift() === 'morning' ? 'Morning' : 'Night'}
            {isAutoMode && ' (Auto-detected)'}
          </p>
        </div>
      </div>
    </ModernCard>
  );
}
