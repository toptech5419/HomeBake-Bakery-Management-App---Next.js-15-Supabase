"use client";

import { useState, useEffect } from 'react';
import type { ShiftType } from '@/types';

const SHIFT_KEY = 'homebake.selectedShift';

export function useShift() {
  const [shift, setShiftState] = useState<ShiftType>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem(SHIFT_KEY) as ShiftType) || 'morning';
    }
    return 'morning';
  });

  useEffect(() => {
    localStorage.setItem(SHIFT_KEY, shift);
  }, [shift]);

  const setShift = (newShift: ShiftType) => {
    setShiftState(newShift);
  };

  return { shift, setShift };
} 