import { supabase } from '@/lib/supabase/client';

export type ShiftType = 'morning' | 'night';

export interface ShiftInfo {
  currentShift: ShiftType;
  shiftStartTime: string;
  nextShiftTime: string;
  shiftStartDateTime: Date;
  shiftEndDateTime: Date;
}

/**
 * Get current shift based on local time (10am/10pm boundaries)
 * Morning: 10:00 AM - 9:59 PM
 * Night: 10:00 PM - 9:59 AM
 */
export function getCurrentShiftInfo(): ShiftInfo {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  
  // Determine current shift
  const isMorningShift = hours >= 10 && hours < 22;
  const currentShift = isMorningShift ? 'morning' : 'night';
  
  // Calculate shift start and end times
  const shiftStart = new Date(now);
  const shiftEnd = new Date(now);
  
  if (isMorningShift) {
    // Morning shift: 10:00 AM today to 10:00 PM today
    shiftStart.setHours(10, 0, 0, 0);
    shiftEnd.setHours(22, 0, 0, 0);
  } else {
    if (hours >= 22) {
      // Night shift: 10:00 PM today to 10:00 AM tomorrow
      shiftStart.setHours(22, 0, 0, 0);
      shiftEnd.setDate(shiftEnd.getDate() + 1);
      shiftEnd.setHours(10, 0, 0, 0);
    } else {
      // Night shift: 10:00 PM yesterday to 10:00 AM today
      shiftStart.setDate(shiftStart.getDate() - 1);
      shiftStart.setHours(22, 0, 0, 0);
      shiftEnd.setHours(10, 0, 0, 0);
    }
  }
  
  return {
    currentShift,
    shiftStartTime: shiftStart.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    }),
    nextShiftTime: shiftEnd.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    }),
    shiftStartDateTime: shiftStart,
    shiftEndDateTime: shiftEnd,
  };
}

/**
 * Get shift boundaries for a given date
 */
export function getShiftBoundaries(date: Date): {
  morningStart: Date;
  morningEnd: Date;
  nightStart: Date;
  nightEnd: Date;
} {
  const morningStart = new Date(date);
  morningStart.setHours(10, 0, 0, 0);
  
  const morningEnd = new Date(date);
  morningEnd.setHours(22, 0, 0, 0);
  
  const nightStart = new Date(date);
  nightStart.setHours(22, 0, 0, 0);
  
  const nightEnd = new Date(date);
  nightEnd.setDate(nightEnd.getDate() + 1);
  nightEnd.setHours(10, 0, 0, 0);
  
  return {
    morningStart,
    morningEnd,
    nightStart,
    nightEnd,
  };
}

/**
 * Check if a given timestamp falls within the current shift
 */
export function isInCurrentShift(timestamp: string, shift: ShiftType): boolean {
  const recordTime = new Date(timestamp);
  const shiftInfo = getCurrentShiftInfo();
  
  if (shift !== shiftInfo.currentShift) return false;
  
  return recordTime >= shiftInfo.shiftStartDateTime && 
         recordTime < shiftInfo.shiftEndDateTime;
}

/**
 * Get date range for shift filtering in Supabase queries
 */
export function getShiftDateRange(shift: ShiftType, date: Date = new Date()) {
  const boundaries = getShiftBoundaries(date);
  
  let startTime: Date;
  let endTime: Date;
  
  if (shift === 'morning') {
    startTime = boundaries.morningStart;
    endTime = boundaries.morningEnd;
  } else {
    startTime = boundaries.nightStart;
    endTime = boundaries.nightEnd;
  }
  
  return {
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
  };
}

/**
 * Format date for display
 */
export function formatShiftDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
