/**
 * Proper timezone-aware shift utilities for Pacific timezone
 */

export type ShiftType = 'morning' | 'night';

export interface ShiftInfo {
  currentShift: ShiftType;
  shiftStartDateTime: Date;
  shiftEndDateTime: Date;
  utcShiftStart: Date;
  utcShiftEnd: Date;
}

/**
 * Get current shift info with proper Pacific timezone handling
 * Pacific timezone is UTC-7 (PDT) or UTC-8 (PST)
 */
export function getPacificShiftInfo(date: Date = new Date()): ShiftInfo {
  // Pacific timezone offset (PDT = UTC-7, PST = UTC-8)
  const pacificOffsetHours = -7; // Adjust for daylight saving if needed
  
  // Convert UTC to Pacific time
  const pacificTime = new Date(date.getTime() + (pacificOffsetHours * 60 * 60 * 1000));
  
  const pacificHour = pacificTime.getUTCHours();
  const isMorningShift = pacificHour >= 10 && pacificHour < 22;
  const currentShift = isMorningShift ? 'morning' : 'night';
  
  // Calculate boundaries in Pacific time
  const pacificDate = new Date(pacificTime);
  pacificDate.setUTCHours(0, 0, 0, 0);
  
  const pacificShiftStart = new Date(pacificDate);
  const pacificShiftEnd = new Date(pacificDate);
  
  if (currentShift === 'morning') {
    pacificShiftStart.setUTCHours(10, 0, 0, 0);
    pacificShiftEnd.setUTCHours(22, 0, 0, 0);
  } else {
    if (pacificHour >= 22) {
      // Night shift starting today
      pacificShiftStart.setUTCHours(22, 0, 0, 0);
      pacificShiftEnd.setUTCDate(pacificShiftEnd.getUTCDate() + 1);
      pacificShiftEnd.setUTCHours(10, 0, 0, 0);
    } else {
      // Night shift started yesterday
      pacificShiftStart.setUTCDate(pacificShiftStart.getUTCDate() - 1);
      pacificShiftStart.setUTCHours(22, 0, 0, 0);
      pacificShiftEnd.setUTCHours(10, 0, 0, 0);
    }
  }
  
  // Convert Pacific times back to UTC for database queries
  const utcShiftStart = new Date(pacificShiftStart.getTime() - (pacificOffsetHours * 60 * 60 * 1000));
  const utcShiftEnd = new Date(pacificShiftEnd.getTime() - (pacificOffsetHours * 60 * 60 * 1000));
  
  return {
    currentShift,
    shiftStartDateTime: pacificShiftStart,
    shiftEndDateTime: pacificShiftEnd,
    utcShiftStart,
    utcShiftEnd,
  };
}

/**
 * Get shift boundaries for a specific date in Pacific timezone
 */
export function getPacificShiftBoundaries(date: string, shift: ShiftType) {
  const targetDate = new Date(date + 'T00:00:00');
  const shiftInfo = getPacificShiftInfo(targetDate);
  
  if (shift === 'morning') {
    return {
      start: shiftInfo.utcShiftStart,
      end: shiftInfo.utcShiftEnd,
    };
  } else {
    // For night shift, we need to adjust
    const pacificOffsetHours = -7;
    const pacificDate = new Date(targetDate.getTime() + (pacificOffsetHours * 60 * 60 * 1000));
    
    const pacificShiftStart = new Date(pacificDate);
    const pacificShiftEnd = new Date(pacificDate);
    
    pacificShiftStart.setUTCHours(22, 0, 0, 0);
    pacificShiftEnd.setUTCDate(pacificShiftEnd.getUTCDate() + 1);
    pacificShiftEnd.setUTCHours(10, 0, 0, 0);
    
    return {
      start: new Date(pacificShiftStart.getTime() - (pacificOffsetHours * 60 * 60 * 1000)),
      end: new Date(pacificShiftEnd.getTime() - (pacificOffsetHours * 60 * 60 * 1000)),
    };
  }
}

/**
 * Check if a batch should be included based on shift and creation time
 */
export function shouldIncludeBatchInShift(
  batchCreatedAt: string, 
  batchShift: ShiftType, 
  targetShift: ShiftType,
  date: string = new Date().toISOString().split('T')[0]
): boolean {
  if (batchShift !== targetShift) return false;
  
  const boundaries = getPacificShiftBoundaries(date, targetShift);
  const createdAt = new Date(batchCreatedAt);
  
  return createdAt >= boundaries.start && createdAt < boundaries.end;
}
