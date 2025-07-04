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

  // Update shift automatically - OPTIMIZED with less frequent polling
  useEffect(() => {
    if (!isAutoMode) return;

    const interval = setInterval(() => {
      const newShift = getAutoShift();
      // Only update if shift actually changed to prevent unnecessary re-renders
      setCurrentShift(prevShift => {
        return newShift !== prevShift ? newShift : prevShift;
      });
    }, 300000); // Check every 5 minutes instead of every minute

    return () => clearInterval(interval);
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