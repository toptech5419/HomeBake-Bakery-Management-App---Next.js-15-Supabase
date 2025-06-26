import { format } from 'date-fns';
import type { ShiftType } from '@/types';

export function formatDate(date: Date | string) {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'yyyy-MM-dd');
}

export function formatDateTime(date: Date | string) {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'yyyy-MM-dd HH:mm');
}

export function shiftToTimeRange(shift: ShiftType) {
  if (shift === 'morning') {
    return '06:00 - 18:00';
  }
  return '18:00 - 06:00';
} 