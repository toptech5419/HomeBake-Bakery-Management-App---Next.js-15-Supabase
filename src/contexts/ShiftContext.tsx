"use client";
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useToast } from '@/components/ui/toast-provider';

export type ShiftType = 'morning' | 'night';

interface ShiftContextType {
  currentShift: ShiftType;
  setCurrentShift: (shift: ShiftType) => void;
  toggleShift: () => void;
}

const ShiftContext = createContext<ShiftContextType | undefined>(undefined);

const SHIFT_STORAGE_KEY = 'homebake-current-shift';

function getStoredShift(): ShiftType | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(SHIFT_STORAGE_KEY);
  if (stored === 'morning' || stored === 'night') return stored;
  return null;
}

function setStoredShift(shift: ShiftType) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SHIFT_STORAGE_KEY, shift);
}

export function ShiftProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  // Always provide a valid shift, default to 'morning' if not found
  const [currentShift, setCurrentShift] = useState<ShiftType>(() => {
    if (typeof window !== 'undefined') {
      const stored = getStoredShift();
      if (stored) return stored;
    }
    setStoredShift('morning');
    return 'morning';
  });

  // Keep localStorage in sync if shift changes and mark initial load as complete
  useEffect(() => {
    setStoredShift(currentShift);
    // Set initial load to false after first render
    if (isInitialLoad) {
      setTimeout(() => setIsInitialLoad(false), 100);
    }
  }, [currentShift, isInitialLoad]);

  const handleSetCurrentShift = (shift: ShiftType) => {
    setCurrentShift(shift);
    // Only show toast if not initial load to prevent showing notification on page load
    if (!isInitialLoad) {
      toast({
        title: `Shift switched to ${shift === 'morning' ? 'Morning' : 'Night'}`,
        variant: 'default',
      });
    }
  };

  const toggleShift = () => {
    const next = currentShift === 'morning' ? 'night' : 'morning';
    handleSetCurrentShift(next);
  };

  return (
    <ShiftContext.Provider value={{
      currentShift,
      setCurrentShift: handleSetCurrentShift,
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