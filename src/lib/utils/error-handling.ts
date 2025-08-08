/**
 * Production-ready error handling and user message utilities
 * Provides clear, actionable messages for users with proper network error handling
 */

export interface UserFeedbackMessage {
  title: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  actionable?: boolean;
  retryable?: boolean;
}

export class AppError extends Error {
  public readonly userMessage: UserFeedbackMessage;
  public readonly originalError?: Error;
  public readonly context?: Record<string, unknown>;

  constructor(
    userMessage: UserFeedbackMessage,
    originalError?: Error,
    context?: Record<string, unknown>
  ) {
    super(userMessage.message);
    this.name = 'AppError';
    this.userMessage = userMessage;
    this.originalError = originalError;
    this.context = context;
  }
}

/**
 * Network error patterns and their user-friendly messages
 */
const NETWORK_ERROR_PATTERNS = {
  CONNECTION_FAILED: /fetch.*failed|network.*error|connection.*refused/i,
  TIMEOUT: /timeout|timed.*out/i,
  DNS_ERROR: /getaddrinfo.*notfound|dns.*error/i,
  CORS_ERROR: /cors|cross.*origin/i,
  RATE_LIMITED: /rate.*limit|too.*many.*requests/i,
  SERVER_ERROR: /5\d\d|internal.*server.*error/i,
  UNAUTHORIZED: /401|unauthorized|authentication/i,
  FORBIDDEN: /403|forbidden|access.*denied/i,
  NOT_FOUND: /404|not.*found/i,
  VALIDATION_ERROR: /400|bad.*request|validation/i,
} as const;

/**
 * Determines if an error is network-related
 */
export function isNetworkError(error: unknown): boolean {
  const errorMessage = String(error).toLowerCase();
  return Object.values(NETWORK_ERROR_PATTERNS).some(pattern => 
    pattern.test(errorMessage)
  );
}

/**
 * Determines if an error should allow retry
 */
export function isRetryableError(error: unknown): boolean {
  const errorMessage = String(error).toLowerCase();
  return (
    NETWORK_ERROR_PATTERNS.CONNECTION_FAILED.test(errorMessage) ||
    NETWORK_ERROR_PATTERNS.TIMEOUT.test(errorMessage) ||
    NETWORK_ERROR_PATTERNS.SERVER_ERROR.test(errorMessage)
  );
}

/**
 * Creates user-friendly messages for different operations
 */
export const createUserMessages = {
  // Bread Types Operations
  breadTypes: {
    createSuccess: (name: string): UserFeedbackMessage => ({
      title: 'Bread Type Created',
      message: `"${name}" has been successfully added to your menu. It's now available for production and sales.`,
      type: 'success',
      duration: 5000,
      actionable: false
    }),

    createError: (name: string, error?: unknown): UserFeedbackMessage => ({
      title: 'Failed to Create Bread Type',
      message: isNetworkError(error) 
        ? `Unable to create "${name}" due to a connection issue. Please check your internet connection and try again.`
        : `Could not create "${name}". Please verify the details and try again.`,
      type: 'error',
      duration: 6000,
      retryable: isRetryableError(error)
    }),

    updateSuccess: (name: string): UserFeedbackMessage => ({
      title: 'Bread Type Updated',
      message: `"${name}" has been successfully updated. Changes are now active across your system.`,
      type: 'success',
      duration: 5000
    }),

    updateError: (name: string, error?: unknown): UserFeedbackMessage => ({
      title: 'Update Failed',
      message: isNetworkError(error)
        ? `Unable to update "${name}" due to a connection issue. Your changes weren't saved. Please try again.`
        : `Could not update "${name}". Please check your changes and try again.`,
      type: 'error',
      duration: 6000,
      retryable: isRetryableError(error)
    }),

    deleteSuccess: (name: string): UserFeedbackMessage => ({
      title: 'Bread Type Removed',
      message: `"${name}" has been permanently deleted from your system.`,
      type: 'success',
      duration: 4000
    }),

    deleteError: (name: string, error?: unknown): UserFeedbackMessage => {
      const errorMsg = String(error).toLowerCase();
      
      if (errorMsg.includes('batch') || errorMsg.includes('production')) {
        return {
          title: 'Cannot Delete Bread Type',
          message: `"${name}" cannot be deleted because it has production history. Historical data is preserved for reporting and compliance.`,
          type: 'warning',
          duration: 8000,
          actionable: true
        };
      }
      
      if (errorMsg.includes('sales') || errorMsg.includes('financial')) {
        return {
          title: 'Cannot Delete Bread Type',
          message: `"${name}" cannot be deleted because it has sales records. Financial data must be preserved for accounting and tax purposes.`,
          type: 'warning',
          duration: 8000,
          actionable: true
        };
      }
      
      if (errorMsg.includes('inventory') || errorMsg.includes('stock')) {
        return {
          title: 'Clear Inventory First',
          message: `"${name}" cannot be deleted because it still has inventory records. Please clear all stock first, then try again.`,
          type: 'warning',
          duration: 8000,
          actionable: true
        };
      }
      
      return {
        title: 'Deletion Failed',
        message: isNetworkError(error)
          ? `Unable to delete "${name}" due to a connection issue. Please check your internet connection and try again.`
          : `Could not delete "${name}". The bread type may be in use by other records in your system.`,
        type: 'error',
        duration: 6000,
        retryable: isRetryableError(error)
      };
    },

    refreshError: (error?: unknown): UserFeedbackMessage => ({
      title: 'Refresh Failed',
      message: isNetworkError(error)
        ? 'Unable to refresh bread types due to connection issues. Using cached data. Please check your internet connection.'
        : 'Could not refresh the bread types list. Please try again.',
      type: 'error',
      duration: 5000,
      retryable: true
    })
  },

  // Network and General Operations
  network: {
    connectionLost: (): UserFeedbackMessage => ({
      title: 'Connection Lost',
      message: 'Your internet connection appears to be offline. Some features may not work until connection is restored.',
      type: 'warning',
      duration: 0, // Persistent until connection restored
      retryable: true
    }),

    connectionRestored: (): UserFeedbackMessage => ({
      title: 'Connection Restored',
      message: 'Your internet connection is back online. All features are now available.',
      type: 'success',
      duration: 4000
    }),

    slowConnection: (): UserFeedbackMessage => ({
      title: 'Slow Connection',
      message: 'Your connection seems slow. Operations may take longer than usual.',
      type: 'info',
      duration: 5000
    }),

    serverError: (): UserFeedbackMessage => ({
      title: 'Server Issue',
      message: 'Our servers are experiencing issues. Please try again in a few moments.',
      type: 'error',
      duration: 6000,
      retryable: true
    }),

    maintenanceMode: (): UserFeedbackMessage => ({
      title: 'Maintenance in Progress',
      message: 'The system is undergoing maintenance. Some features may be temporarily unavailable.',
      type: 'info',
      duration: 8000
    })
  },

  // Dashboard Operations
  dashboard: {
    loadError: (error?: unknown): UserFeedbackMessage => ({
      title: 'Dashboard Load Failed',
      message: isNetworkError(error)
        ? 'Unable to load dashboard data due to connection issues. Please check your internet connection and refresh.'
        : 'Could not load dashboard information. Please refresh the page.',
      type: 'error',
      duration: 6000,
      retryable: true
    }),

    dataRefreshSuccess: (): UserFeedbackMessage => ({
      title: 'Data Refreshed',
      message: 'Dashboard information has been updated with the latest data.',
      type: 'success',
      duration: 3000
    }),

    dataRefreshError: (error?: unknown): UserFeedbackMessage => ({
      title: 'Refresh Failed',
      message: isNetworkError(error)
        ? 'Unable to refresh data due to connection issues. Showing cached information.'
        : 'Could not refresh dashboard data. Please try again.',
      type: 'error',
      duration: 5000,
      retryable: true
    })
  }
};

/**
 * Retry mechanism for failed operations
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxAttempts: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry non-retryable errors
      if (!isRetryableError(error)) {
        throw error;
      }

      // Don't wait after the last attempt
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
      }
    }
  }

  throw lastError!;
}

/**
 * Enhanced error handler that provides rich user feedback
 */
export function handleError(
  error: unknown,
  operation: string,
  context?: Record<string, unknown>
): UserFeedbackMessage {
  console.error(`Error in ${operation}:`, error, context);

  // If it's already an AppError, return its user message
  if (error instanceof AppError) {
    return error.userMessage;
  }

  // Handle network errors
  if (isNetworkError(error)) {
    return {
      title: 'Connection Problem',
      message: 'Unable to complete the operation due to a network issue. Please check your internet connection and try again.',
      type: 'error',
      duration: 6000,
      retryable: true
    };
  }

  // Handle specific error types
  const errorMessage = String(error).toLowerCase();
  
  if (errorMessage.includes('unauthorized') || errorMessage.includes('401')) {
    return {
      title: 'Session Expired',
      message: 'Your session has expired. Please refresh the page and log in again.',
      type: 'warning',
      duration: 8000,
      actionable: true
    };
  }

  if (errorMessage.includes('forbidden') || errorMessage.includes('403')) {
    return {
      title: 'Access Denied',
      message: 'You don\'t have permission to perform this action. Please contact your administrator.',
      type: 'error',
      duration: 6000
    };
  }

  // Default fallback message
  return {
    title: 'Operation Failed',
    message: 'Something went wrong. Please try again, or contact support if the problem persists.',
    type: 'error',
    duration: 5000,
    retryable: true
  };
}