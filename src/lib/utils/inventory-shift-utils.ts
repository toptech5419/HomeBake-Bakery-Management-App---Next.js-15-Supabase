/**
 * Production-ready inventory shift management utilities
 * 
 * SHIFT RULES (Different from manager dashboard):
 * - Morning Shift: 10:00 AM - 9:59 PM (automatic switching at 10:00 AM)
 * - Night Shift: 10:00 PM - 9:59 AM (automatic switching at 10:00 PM)
 * 
 * DATA FETCHING WINDOWS:
 * - Morning Shift (10:00 AM): Fetch current date 00:00 AM - 23:59 PM (24 hours)
 * - Night Shift (10:00 PM): Fetch current date 15:00 PM - next date 15:00 PM (24 hours)
 */

export type InventoryShiftType = 'morning' | 'night';

export interface InventoryShiftInfo {
  currentShift: InventoryShiftType;
  shiftStartTime: string;
  nextShiftTime: string;
  shiftStartDateTime: Date;
  shiftEndDateTime: Date;
  dataFetchRange: {
    startDate: string;
    endDate: string;
    startTime: string;
    endTime: string;
    description: string;
  };
}

// Shift constants for inventory (Nigeria timezone - UTC+1)
export const INVENTORY_SHIFT_CONSTANTS = {
  MORNING_SWITCH_HOUR: 10, // 10:00 AM - switch to morning shift
  NIGHT_SWITCH_HOUR: 22,   // 10:00 PM - switch to night shift
  NIGERIA_TIMEZONE: 'Africa/Lagos' as const,
  
  // Data fetch time ranges
  MORNING_DATA_START_HOUR: 0,  // 00:00 AM (start of day)
  MORNING_DATA_END_HOUR: 23,   // 23:59 PM (end of day)
  
  NIGHT_DATA_START_HOUR: 15,   // 15:00 PM (3:00 PM)
  NIGHT_DATA_END_HOUR: 15,     // 15:00 PM next day (3:00 PM)
} as const;

/**
 * Get current time in Nigeria timezone (UTC+1)
 */
function getNigeriaTime(): Date {
  const now = new Date();
  return new Date(now.toLocaleString("en-US", { timeZone: INVENTORY_SHIFT_CONSTANTS.NIGERIA_TIMEZONE }));
}

/**
 * Format date to YYYY-MM-DD
 */
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Add days to a date
 */
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Create datetime string from date and hour
 */
function createDateTime(date: Date, hour: number): string {
  const newDate = new Date(date);
  newDate.setHours(hour, 0, 0, 0);
  return newDate.toISOString();
}

/**
 * Get current inventory shift info with data fetching ranges
 */
export function getInventoryShiftInfo(): InventoryShiftInfo {
  const nigeriaTime = getNigeriaTime();
  const currentHour = nigeriaTime.getHours();
  
  console.log(`🕒 Nigeria time: ${nigeriaTime.toISOString()}, Hour: ${currentHour}`);
  
  // Determine current shift - Morning: 10 AM - 9:59 PM, Night: 10 PM - 9:59 AM
  const isMorningShift = currentHour >= INVENTORY_SHIFT_CONSTANTS.MORNING_SWITCH_HOUR && 
                        currentHour < INVENTORY_SHIFT_CONSTANTS.NIGHT_SWITCH_HOUR;
  
  const currentShift: InventoryShiftType = isMorningShift ? 'morning' : 'night';
  
  console.log(`📋 Inventory shift determined: ${currentShift} (based on hour ${currentHour})`);
  
  // Calculate shift boundaries
  let shiftStartDateTime: Date;
  let shiftEndDateTime: Date;
  let dataFetchRange: InventoryShiftInfo['dataFetchRange'];
  
  if (isMorningShift) {
    // Morning Shift: 10:00 AM today to 10:00 PM today
    shiftStartDateTime = new Date(nigeriaTime);
    shiftStartDateTime.setHours(INVENTORY_SHIFT_CONSTANTS.MORNING_SWITCH_HOUR, 0, 0, 0);
    
    shiftEndDateTime = new Date(nigeriaTime);
    shiftEndDateTime.setHours(INVENTORY_SHIFT_CONSTANTS.NIGHT_SWITCH_HOUR, 0, 0, 0);
    
    // Data Range: Current date 00:00 AM - 23:59 PM (24 hours)
    const currentDate = formatDate(nigeriaTime);
    dataFetchRange = {
      startDate: currentDate,
      endDate: currentDate,
      startTime: createDateTime(nigeriaTime, INVENTORY_SHIFT_CONSTANTS.MORNING_DATA_START_HOUR),
      endTime: createDateTime(nigeriaTime, 23), // 23:59 PM
      description: `Morning shift data: ${currentDate} 00:00 - ${currentDate} 23:59 (24 hours)`
    };
  } else {
    // Night Shift: 10:00 PM today/yesterday to 10:00 AM tomorrow/today
    if (currentHour >= INVENTORY_SHIFT_CONSTANTS.NIGHT_SWITCH_HOUR) {
      // After 10 PM today - shift runs until 10 AM tomorrow
      shiftStartDateTime = new Date(nigeriaTime);
      shiftStartDateTime.setHours(INVENTORY_SHIFT_CONSTANTS.NIGHT_SWITCH_HOUR, 0, 0, 0);
      
      shiftEndDateTime = addDays(nigeriaTime, 1);
      shiftEndDateTime.setHours(INVENTORY_SHIFT_CONSTANTS.MORNING_SWITCH_HOUR, 0, 0, 0);
    } else {
      // Before 10 AM today - shift started at 10 PM yesterday
      shiftStartDateTime = addDays(nigeriaTime, -1);
      shiftStartDateTime.setHours(INVENTORY_SHIFT_CONSTANTS.NIGHT_SWITCH_HOUR, 0, 0, 0);
      
      shiftEndDateTime = new Date(nigeriaTime);
      shiftEndDateTime.setHours(INVENTORY_SHIFT_CONSTANTS.MORNING_SWITCH_HOUR, 0, 0, 0);
    }
    
    // Data Range: Current date 15:00 PM - Next date 15:00 PM (24 hours)
    const currentDate = nigeriaTime;
    const nextDate = addDays(nigeriaTime, 1);
    
    dataFetchRange = {
      startDate: formatDate(currentDate),
      endDate: formatDate(nextDate),
      startTime: createDateTime(currentDate, INVENTORY_SHIFT_CONSTANTS.NIGHT_DATA_START_HOUR),
      endTime: createDateTime(nextDate, INVENTORY_SHIFT_CONSTANTS.NIGHT_DATA_END_HOUR),
      description: `Night shift data: ${formatDate(currentDate)} 15:00 - ${formatDate(nextDate)} 15:00 (24 hours)`
    };
  }
  
  const result: InventoryShiftInfo = {
    currentShift,
    shiftStartTime: shiftStartDateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    nextShiftTime: shiftEndDateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    shiftStartDateTime,
    shiftEndDateTime,
    dataFetchRange
  };
  
  console.log(`📊 Inventory shift info:`, {
    shift: result.currentShift,
    dataRange: result.dataFetchRange.description,
    shiftBoundary: `${result.shiftStartTime} - ${result.nextShiftTime}`
  });
  
  return result;
}

/**
 * Get time until next shift change
 */
export function getTimeUntilNextShift(): string {
  const shiftInfo = getInventoryShiftInfo();
  const now = getNigeriaTime();
  const timeLeft = shiftInfo.shiftEndDateTime.getTime() - now.getTime();
  
  if (timeLeft <= 0) {
    return 'Switching...';
  }
  
  const hours = Math.floor(timeLeft / (1000 * 60 * 60));
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
  
  return `${hours}h ${minutes}m`;
}

/**
 * Check if it's time to switch shifts
 */
export function shouldSwitchShift(lastCheckedShift: InventoryShiftType): boolean {
  const currentShiftInfo = getInventoryShiftInfo();
  return lastCheckedShift !== currentShiftInfo.currentShift;
}

/**
 * Production-ready shift validation
 */
export function validateShiftData(shift: InventoryShiftType, dateRange: any): boolean {
  try {
    const shiftInfo = getInventoryShiftInfo();
    
    // Validate shift matches current time
    if (shift !== shiftInfo.currentShift) {
      console.warn(`⚠️ Shift mismatch: requested ${shift}, current ${shiftInfo.currentShift}`);
      return false;
    }
    
    // Validate date range matches expected range
    if (dateRange) {
      const expectedRange = shiftInfo.dataFetchRange;
      if (dateRange.startTime !== expectedRange.startTime || 
          dateRange.endTime !== expectedRange.endTime) {
        console.warn(`⚠️ Date range mismatch for ${shift} shift`);
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error validating shift data:', error);
    return false;
  }
}