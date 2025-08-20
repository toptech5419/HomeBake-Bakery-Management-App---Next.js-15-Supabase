"use client";
import React, { createContext, useContext, useState, useEffect, ReactNode, startTransition } from 'react';
import { toast } from 'sonner';
// Removed unreliable performance scheduler import

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
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isHydrated, setIsHydrated] = useState(false);
  
  // Start with default value for both server and client
  const [currentShift, setCurrentShift] = useState<ShiftType>('morning');

  // Hydration effect - runs only on client after mount
  useEffect(() => {
    const stored = getStoredShift();
    if (stored) {
      console.log('✅ Retrieved stored shift after hydration:', stored);
      setCurrentShift(stored);
    } else {
      console.log('🔄 No stored shift found, keeping morning default');
      setStoredShift('morning');
    }
    setIsHydrated(true);
// Simple timeout instead of complex scheduling
    setTimeout(() => setIsInitialLoad(false), 100);
  }, []);

  // Keep localStorage in sync when shift changes
  useEffect(() => {
    if (isHydrated) {
      setStoredShift(currentShift);
    }
  }, [currentShift, isHydrated]);

  const handleSetCurrentShift = (shift: ShiftType) => {
    console.log(`🔄 Setting shift from ${currentShift} to ${shift}`);
    
    // Use React 18 transition for non-urgent shift change UI updates
    startTransition(() => {
      setCurrentShift(shift);
    });
    
    // Immediately persist to localStorage (critical operation)
    setStoredShift(shift);
    console.log(`💾 Saved shift to localStorage: ${shift}`);
    
    // Simple toast notification
    if (!isInitialLoad) {
      setTimeout(() => {
        try {
          toast.success(`Shift switched to ${shift === 'morning' ? 'Morning' : 'Night'}`);
        } catch (error) {
          console.log(`Shift switched to ${shift === 'morning' ? 'Morning' : 'Night'}`);
        }
      }, 0);
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