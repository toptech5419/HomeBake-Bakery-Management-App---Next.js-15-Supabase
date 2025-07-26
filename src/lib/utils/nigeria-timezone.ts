/**
 * Nigeria timezone utilities for consistent shift handling
 * Nigeria is UTC+1, so we need to adjust all calculations accordingly
 */

export const NIGERIA_OFFSET = 1 * 60 * 60 * 1000; // UTC+1

export interface ShiftBoundaries {
  start: Date;
  end: Date;
  nigeriaStart: Date;
  nigeriaEnd: Date;
}

/**
 * Get Nigeria timezone boundaries for a given date and shift
 */
export function getNigeriaShiftBoundaries(date: string, shift: 'morning' | 'night'): ShiftBoundaries {
  const nigeriaDate = new Date(date + 'T00:00:00');
  nigeriaDate.setTime(nigeriaDate.getTime() + NIGERIA_OFFSET);
  
  const nigeriaShiftStart = new Date(nigeriaDate);
  const nigeriaShiftEnd = new Date(nigeriaDate);
  
  if (shift === 'morning') {
    // Morning shift: 10:00 AM - 10:00 PM Nigeria
    nigeriaShiftStart.setUTCHours(10, 0, 0, 0);
    nigeriaShiftEnd.setUTCHours(22, 0, 0, 0);
  } else {
    // Night shift: 10:00 PM - 10:00 AM Nigeria (spans midnight)
    nigeriaShiftStart.setUTCDate(nigeriaShiftStart.getUTCDate() - 1);
    nigeriaShiftStart.setUTCHours(22, 0, 0, 0);
    nigeriaShiftEnd.setUTCHours(10, 0, 0, 0);
  }
  
  return {
    start: new Date(nigeriaShiftStart.getTime() - NIGERIA_OFFSET),
    end: new Date(nigeriaShiftEnd.getTime() - NIGERIA_OFFSET),
    nigeriaStart: nigeriaShiftStart,
    nigeriaEnd: nigeriaShiftEnd,
  };
}

/**
 * Get current shift based on Nigeria timezone
 */
export function getCurrentNigeriaShift(date: Date = new Date()): {
  currentShift: 'morning' | 'night';
  boundaries: ShiftBoundaries;
} {
  const nigeriaTime = new Date(date.getTime() + NIGERIA_OFFSET);
  const nigeriaHour = nigeriaTime.getUTCHours();
  
  const isMorningShift = nigeriaHour >= 10 && nigeriaHour < 22;
  const currentShift = isMorningShift ? 'morning' : 'night';
  
  const today = date.toISOString().split('T')[0];
  const boundaries = getNigeriaShiftBoundaries(today, currentShift);
  
  return {
    currentShift,
    boundaries,
  };
}

/**
 * Check if a batch should be included in a shift
 */
export function shouldIncludeBatchInNigeriaShift(
  batchCreatedAt: string,
  batchShift: 'morning' | 'night',
  targetShift: 'morning' | 'night',
  date: string = new Date().toISOString().split('T')[0]
): boolean {
  if (batchShift !== targetShift) return false;
  
  const boundaries = getNigeriaShiftBoundaries(date, targetShift);
  const createdAt = new Date(batchCreatedAt);
  
  return createdAt >= boundaries.start && createdAt < boundaries.end;
}
