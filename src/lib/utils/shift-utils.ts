import { supabase } from '@/lib/supabase/client';

export type ShiftType = 'morning' | 'night';

export interface ShiftInfo {
  currentShift: ShiftType;
  shiftStartTime: string;
  nextShiftTime: string;
  shiftStartDateTime: Date;
  shiftEndDateTime: Date;
}

// Shift constants for inventory page (Nigeria timezone specific)
export const SHIFT_CONSTANTS = {
  MORNING_START_HOUR: 10, // 10:00 AM
  MORNING_END_HOUR: 22,   // 10:00 PM (22:00)
  NIGHT_START_HOUR: 22,   // 10:00 PM (22:00)
  NIGHT_END_HOUR: 10,     // 10:00 AM (next day)
  NIGERIA_TIMEZONE: 'Africa/Lagos' as const, // UTC+1
} as const;

/**
 * Get current time in Nigeria timezone (Africa/Lagos - UTC+1)
 */
function getNigeriaTime(): Date {
  const now = new Date();
  // Convert to Nigeria time (UTC+1)
  const nigeriaTime = new Date(now.toLocaleString("en-US", {timeZone: SHIFT_CONSTANTS.NIGERIA_TIMEZONE}));
  return nigeriaTime;
}

/**
 * Get current shift based on Nigeria time (10am/10pm boundaries)
 * Morning: 10:00 AM - 9:59 PM
 * Night: 10:00 PM - 9:59 AM
 */
export function getCurrentShiftInfo(): ShiftInfo {
  const nigeriaTime = getNigeriaTime();
  const hours = nigeriaTime.getHours();
  const minutes = nigeriaTime.getMinutes();
  
  // Determine current shift using constants
  const isMorningShift = hours >= SHIFT_CONSTANTS.MORNING_START_HOUR && hours < SHIFT_CONSTANTS.MORNING_END_HOUR;
  const currentShift = isMorningShift ? 'morning' : 'night';
  
  // Calculate shift start and end times in Nigeria timezone
  const shiftStart = new Date(nigeriaTime);
  const shiftEnd = new Date(nigeriaTime);
  
  if (isMorningShift) {
    // Morning shift: 10:00 AM today to 10:00 PM today
    shiftStart.setHours(SHIFT_CONSTANTS.MORNING_START_HOUR, 0, 0, 0);
    shiftEnd.setHours(SHIFT_CONSTANTS.MORNING_END_HOUR, 0, 0, 0);
  } else {
    if (hours >= SHIFT_CONSTANTS.NIGHT_START_HOUR) {
      // Night shift: 10:00 PM today to 10:00 AM tomorrow
      shiftStart.setHours(SHIFT_CONSTANTS.NIGHT_START_HOUR, 0, 0, 0);
      shiftEnd.setDate(shiftEnd.getDate() + 1);
      shiftEnd.setHours(SHIFT_CONSTANTS.NIGHT_END_HOUR, 0, 0, 0);
    } else {
      // Night shift: 10:00 PM yesterday to 10:00 AM today
      shiftStart.setDate(shiftStart.getDate() - 1);
      shiftStart.setHours(SHIFT_CONSTANTS.NIGHT_START_HOUR, 0, 0, 0);
      shiftEnd.setHours(SHIFT_CONSTANTS.NIGHT_END_HOUR, 0, 0, 0);
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
  // Convert input date to Nigeria timezone
  const nigeriaDate = new Date(date.toLocaleString("en-US", {timeZone: SHIFT_CONSTANTS.NIGERIA_TIMEZONE}));
  
  const morningStart = new Date(nigeriaDate);
  morningStart.setHours(SHIFT_CONSTANTS.MORNING_START_HOUR, 0, 0, 0);
  
  const morningEnd = new Date(nigeriaDate);
  morningEnd.setHours(SHIFT_CONSTANTS.MORNING_END_HOUR, 0, 0, 0);
  
  const nightStart = new Date(nigeriaDate);
  nightStart.setHours(SHIFT_CONSTANTS.NIGHT_START_HOUR, 0, 0, 0);
  
  const nightEnd = new Date(nigeriaDate);
  nightEnd.setDate(nightEnd.getDate() + 1);
  nightEnd.setHours(SHIFT_CONSTANTS.NIGHT_END_HOUR, 0, 0, 0);
  
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
