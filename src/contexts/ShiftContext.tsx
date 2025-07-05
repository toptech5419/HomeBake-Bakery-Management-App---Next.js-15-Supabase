"use client";
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type ShiftType = 'morning' | 'night';

interface ShiftContextType {
  currentShift: ShiftType;
  setCurrentShift: (shift: ShiftType) => void;
  isAutoMode: boolean;
  setIsAutoMode: (auto: boolean) => void;
  toggleShift: () => void;
}

const ShiftContext = createContext<ShiftContextType | undefined>(undefined);

export function ShiftProvider({ children }: { children: ReactNode }) {
  // Auto-detect current shift based on time
  const getAutoShift = (): ShiftType => {
    const currentHour = new Date().getHours();
    return currentHour >= 6 && currentHour < 18 ? 'morning' : 'night';
  };

  const [isAutoMode, setIsAutoMode] = useState(true);
  const [currentShift, setCurrentShift] = useState<ShiftType>(getAutoShift());

  // Update shift automatically - OPTIMIZED with smart checking
  useEffect(() => {
    if (!isAutoMode) return;

    // Calculate time until next shift change
    const calculateTimeUntilShiftChange = () => {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinutes = now.getMinutes();
      const currentSeconds = now.getSeconds();
      
      let hoursUntilChange: number;
      
      if (currentHour >= 6 && currentHour < 18) {
        // Currently morning shift, calculate time until 6 PM
        hoursUntilChange = 18 - currentHour - 1;
      } else {
        // Currently night shift, calculate time until 6 AM
        if (currentHour >= 18) {
          hoursUntilChange = (24 - currentHour) + 6 - 1;
        } else {
          hoursUntilChange = 6 - currentHour - 1;
        }
      }
      
      const minutesUntilChange = 60 - currentMinutes;
      const secondsUntilChange = 60 - currentSeconds;
      
      return (hoursUntilChange * 60 * 60 + minutesUntilChange * 60 + secondsUntilChange) * 1000;
    };

    // Set a timeout for the exact time of shift change
    const timeUntilChange = calculateTimeUntilShiftChange();
    
    const timeout = setTimeout(() => {
      setCurrentShift(getAutoShift());
      
      // After the shift change, set up regular checking every 12 hours
      const interval = setInterval(() => {
        setCurrentShift(getAutoShift());
      }, 12 * 60 * 60 * 1000); // Check every 12 hours
      
      // Store interval ID for cleanup
      (window as any).__shiftInterval = interval;
    }, timeUntilChange);

    return () => {
      clearTimeout(timeout);
      if ((window as any).__shiftInterval) {
        clearInterval((window as any).__shiftInterval);
        delete (window as any).__shiftInterval;
      }
    };
  }, [isAutoMode]);

  // Set shift to auto-detected value when switching to auto mode
  useEffect(() => {
    if (isAutoMode) {
      setCurrentShift(getAutoShift());
    }
  }, [isAutoMode]);

  const toggleShift = () => {
    if (isAutoMode) {
      setIsAutoMode(false);
    }
    setCurrentShift(currentShift === 'morning' ? 'night' : 'morning');
  };

  const handleSetCurrentShift = (shift: ShiftType) => {
    setIsAutoMode(false);
    setCurrentShift(shift);
  };

  return (
    <ShiftContext.Provider value={{
      currentShift,
      setCurrentShift: handleSetCurrentShift,
      isAutoMode,
      setIsAutoMode,
      toggleShift
    }}>
      {children}
    </ShiftContext.Provider>
  );
}

export function useShift() {
  const context = useContext(ShiftContext);
  if (context === undefined) {
    throw new Error('useShift must be used within a ShiftProvider');
  }
  return context;
}