/**
 * Application-wide constants
 * Centralizes configuration values to avoid magic numbers throughout the codebase
 */

// Application metadata
export const APP_NAME = 'HomeBake';
export const APP_VERSION = '2.0.0';
export const APP_DESCRIPTION = 'Professional bakery management system';

// Authentication
export const AUTH = {
  SESSION_DURATION: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
  TOKEN_REFRESH_BUFFER: 5 * 60 * 1000, // 5 minutes before expiry
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 100,
} as const;

// API Configuration
export const API = {
  TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second
} as const;

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  PRODUCTION_LOGS_LIMIT: 50,
  SALES_LOGS_LIMIT: 50,
} as const;

// Shifts
export const SHIFTS = {
  MORNING: {
    NAME: 'morning' as const,
    START_HOUR: 6,
    END_HOUR: 18,
    DISPLAY: '🌅 Morning Shift',
    COLOR: 'orange',
  },
  NIGHT: {
    NAME: 'night' as const,
    START_HOUR: 18,
    END_HOUR: 6,
    DISPLAY: '🌙 Night Shift',
    COLOR: 'indigo',
  },
  CHECK_INTERVAL: 12 * 60 * 60 * 1000, // 12 hours
} as const;

// User Roles
export const ROLES = {
  OWNER: 'owner' as const,
  MANAGER: 'manager' as const,
  SALES_REP: 'sales_rep' as const,
} as const;

// QR Invites
export const QR_INVITES = {
  EXPIRY_MINUTES: 10,
  TOKEN_LENGTH: 36, // UUID length
} as const;

// Form Validation
export const VALIDATION = {
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 50,
  EMAIL_MAX_LENGTH: 255,
  FEEDBACK_MAX_LENGTH: 1000,
  DISCOUNT_MAX_PERCENTAGE: 100,
} as const;

// UI Configuration
export const UI = {
  TOAST_DURATION: 4000, // 4 seconds
  TOAST_DURATION_ERROR: 6000, // 6 seconds for errors
  TOAST_DURATION_CRITICAL: 10000, // 10 seconds for critical errors
  ANIMATION_DURATION: 300, // 300ms for most animations
  DEBOUNCE_DELAY: 500, // 500ms for search/filter inputs
  MOBILE_BREAKPOINT: 768, // pixels
} as const;

// Offline Sync
export const OFFLINE = {
  SYNC_INTERVAL: 30000, // 30 seconds
  SYNC_MAX_RETRIES: 3,
  SYNC_BATCH_SIZE: 10,
  CACHE_DURATION: 24 * 60 * 60 * 1000, // 24 hours
  QUEUE_CHECK_INTERVAL: 10000, // 10 seconds
} as const;

// Reports
export const REPORTS = {
  DATE_RANGE_MAX_DAYS: 365,
  EXPORT_FORMATS: ['pdf', 'csv'] as const,
  CHART_COLORS: {
    primary: '#f97316', // orange-500
    secondary: '#3b82f6', // blue-500
    success: '#10b981', // green-500
    warning: '#f59e0b', // amber-500
    danger: '#ef4444', // red-500
  },
} as const;

// File Uploads (for future use)
export const UPLOADS = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  IMAGE_QUALITY: 0.8,
} as const;

// Currency
export const CURRENCY = {
  CODE: 'NGN',
  SYMBOL: '₦',
  DECIMAL_PLACES: 2,
  THOUSAND_SEPARATOR: ',',
  DECIMAL_SEPARATOR: '.',
} as const;

// Time Zone
export const TIMEZONE = {
  DEFAULT: 'Africa/Lagos',
  OFFSET: '+01:00',
} as const;

// Environment checks
export const IS_PRODUCTION = process.env.NODE_ENV === 'production';
export const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';
export const IS_TEST = process.env.NODE_ENV === 'test';

// Feature flags (can be moved to environment variables later)
export const FEATURES = {
  ENABLE_PWA: true,
  ENABLE_OFFLINE_MODE: true,
  ENABLE_NOTIFICATIONS: false, // Not implemented yet
  ENABLE_ANALYTICS: false, // Not implemented yet
  ENABLE_EXPORT_PDF: true,
  ENABLE_EXPORT_CSV: true,
} as const;

// Export type for shift names
export type ShiftName = typeof SHIFTS.MORNING.NAME | typeof SHIFTS.NIGHT.NAME;

// Export type for role names
export type RoleName = typeof ROLES.OWNER | typeof ROLES.MANAGER | typeof ROLES.SALES_REP;