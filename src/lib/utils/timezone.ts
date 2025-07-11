import { format, parseISO, addHours, startOfDay, endOfDay } from 'date-fns'
import { toZonedTime, fromZonedTime } from 'date-fns-tz'
import type { TimestampHelper } from '@/types/database'

const NIGERIA_TIMEZONE = 'Africa/Lagos' // GMT+1
const SHIFT_TRANSITION_HOUR = 14 // 2 PM - when morning shift ends and night shift begins

/**
 * Production-ready timezone utilities for Nigeria bakery operations
 * Handles all date/time conversions and shift calculations
 */
export const nigeriaTime: TimestampHelper = {
  /**
   * Convert UTC timestamp to Nigeria local time
   */
  toNigeriaTime: (utcTimestamp: string): string => {
    try {
      const utcDate = parseISO(utcTimestamp)
      const nigeriaDate = toZonedTime(utcDate, NIGERIA_TIMEZONE)
      return format(nigeriaDate, 'yyyy-MM-dd HH:mm:ss')
    } catch (error) {
      console.error('Error converting to Nigeria time:', error)
      return utcTimestamp
    }
  },

  /**
   * Convert Nigeria local time to UTC timestamp
   */
  fromNigeriaTime: (localTimestamp: string): string => {
    try {
      const localDate = parseISO(localTimestamp)
      const utcDate = fromZonedTime(localDate, NIGERIA_TIMEZONE)
      return utcDate.toISOString()
    } catch (error) {
      console.error('Error converting from Nigeria time:', error)
      return localTimestamp
    }
  },

  /**
   * Get current shift based on Nigeria time
   * Morning shift: 6 AM - 2 PM
   * Night shift: 2 PM - 6 AM (next day)
   */
  getCurrentShift: (): 'morning' | 'night' => {
    const now = new Date()
    const nigeriaTime = toZonedTime(now, NIGERIA_TIMEZONE)
    const hour = nigeriaTime.getHours()
    
    // Morning shift: 6 AM (06:00) to 2 PM (14:00)
    // Night shift: 2 PM (14:00) to 6 AM (06:00) next day
    return hour >= 6 && hour < 14 ? 'morning' : 'night'
  },

  /**
   * Get shift start time in Nigeria timezone
   */
  getShiftStart: (shift: 'morning' | 'night'): string => {
    const now = new Date()
    const nigeriaDate = toZonedTime(now, NIGERIA_TIMEZONE)
    const today = startOfDay(nigeriaDate)
    
    if (shift === 'morning') {
      // Morning shift starts at 6 AM
      const shiftStart = addHours(today, 6)
      return format(shiftStart, 'yyyy-MM-dd HH:mm:ss')
    } else {
      // Night shift starts at 2 PM (14:00)
      const shiftStart = addHours(today, 14)
      return format(shiftStart, 'yyyy-MM-dd HH:mm:ss')
    }
  },

  /**
   * Get shift end time in Nigeria timezone
   */
  getShiftEnd: (shift: 'morning' | 'night'): string => {
    const now = new Date()
    const nigeriaDate = toZonedTime(now, NIGERIA_TIMEZONE)
    const today = startOfDay(nigeriaDate)
    
    if (shift === 'morning') {
      // Morning shift ends at 2 PM (14:00)
      const shiftEnd = addHours(today, 14)
      return format(shiftEnd, 'yyyy-MM-dd HH:mm:ss')
    } else {
      // Night shift ends at 6 AM next day
      const tomorrow = addHours(today, 24)
      const shiftEnd = addHours(tomorrow, 6)
      return format(shiftEnd, 'yyyy-MM-dd HH:mm:ss')
    }
  }
}

/**
 * Format date for display in Nigeria timezone
 */
export const formatNigeriaDate = (
  timestamp: string,
  formatString: string = 'PPP p'
): string => {
  try {
    const utcDate = parseISO(timestamp)
    const nigeriaDate = toZonedTime(utcDate, NIGERIA_TIMEZONE)
    return format(nigeriaDate, formatString)
  } catch (error) {
    console.error('Error formatting Nigeria date:', error)
    return timestamp
  }
}

/**
 * Get relative time (e.g., "2 hours ago") in Nigeria timezone
 */
export const getRelativeTime = (timestamp: string | undefined | null): string => {
  try {
    if (!timestamp) {
      return 'Just now';
    }
    
    const utcDate = parseISO(timestamp)
    const nigeriaDate = toZonedTime(utcDate, NIGERIA_TIMEZONE)
    const now = toZonedTime(new Date(), NIGERIA_TIMEZONE)
    
    const diffInMs = now.getTime() - nigeriaDate.getTime()
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60))
    const diffInHours = Math.floor(diffInMinutes / 60)
    const diffInDays = Math.floor(diffInHours / 24)
    
    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`
    if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`
    
    return formatNigeriaDate(timestamp, 'MMM d, yyyy')
  } catch (error) {
    console.error('Error calculating relative time:', error)
    return 'Just now'
  }
}

/**
 * Check if a timestamp is from today (Nigeria timezone)
 */
export const isToday = (timestamp: string): boolean => {
  try {
    const utcDate = parseISO(timestamp)
    const nigeriaDate = toZonedTime(utcDate, NIGERIA_TIMEZONE)
    const now = toZonedTime(new Date(), NIGERIA_TIMEZONE)
    
    return format(nigeriaDate, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd')
  } catch (error) {
    console.error('Error checking if date is today:', error)
    return false
  }
}

/**
 * Get shift information for a given timestamp
 */
export const getShiftInfo = (timestamp: string) => {
  try {
    const utcDate = parseISO(timestamp)
    const nigeriaDate = toZonedTime(utcDate, NIGERIA_TIMEZONE)
    const hour = nigeriaDate.getHours()
    
    const shift = hour >= 6 && hour < 14 ? 'morning' : 'night'
    const shiftStart = nigeriaTime.getShiftStart(shift)
    const shiftEnd = nigeriaTime.getShiftEnd(shift)
    
    return {
      shift,
      shiftStart,
      shiftEnd,
      formattedTime: format(nigeriaDate, 'h:mm a'),
      isCurrentShift: shift === nigeriaTime.getCurrentShift()
    }
  } catch (error) {
    console.error('Error getting shift info:', error)
    return {
      shift: 'morning' as const,
      shiftStart: '',
      shiftEnd: '',
      formattedTime: '',
      isCurrentShift: false
    }
  }
}