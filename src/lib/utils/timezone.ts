/**
 * Timezone utilities for Nigeria-based operations (GMT+1)
 * Provides relative time formatting and Nigeria timezone handling
 */

/**
 * Formats a date string into relative time
 * @param dateString - ISO date string to format
 * @returns Relative time string (e.g., "2h ago", "30m ago", "Just now")
 */
export function getRelativeTime(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;
  
  const diffInWeeks = Math.floor(diffInDays / 7);
  return `${diffInWeeks}w ago`;
}

/**
 * Formats a date for Nigeria timezone display
 * @param dateString - ISO date string
 * @returns Formatted date string in Nigeria timezone
 */
export function formatNigeriaDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('en-NG', {
    timeZone: 'Africa/Lagos',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Get current Nigeria time
 * @returns Date object representing current time in Nigeria
 */
export function nigeriaTime(): Date {
  const now = new Date();
  return new Date(now.toLocaleString('en-US', { timeZone: 'Africa/Lagos' }));
}