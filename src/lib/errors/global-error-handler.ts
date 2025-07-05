import { toast } from 'sonner';

export type ErrorLevel = 'info' | 'warning' | 'error' | 'critical';

interface ErrorContext {
  action?: string;
  userId?: string;
  metadata?: Record<string, any>;
}

class GlobalErrorHandler {
  private static instance: GlobalErrorHandler;

  private constructor() {}

  static getInstance(): GlobalErrorHandler {
    if (!GlobalErrorHandler.instance) {
      GlobalErrorHandler.instance = new GlobalErrorHandler();
    }
    return GlobalErrorHandler.instance;
  }

  /**
   * Handle errors consistently across the application
   */
  handle(error: unknown, context?: ErrorContext): void {
    const errorInfo = this.parseError(error);
    const level = this.determineErrorLevel(errorInfo);

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('[HomeBake Error]', {
        ...errorInfo,
        context,
        timestamp: new Date().toISOString(),
      });
    }

    // Show user-friendly message
    this.showUserNotification(errorInfo, level);

    // Log to external service in production
    if (process.env.NODE_ENV === 'production') {
      this.logToService(errorInfo, context, level);
    }
  }

  /**
   * Parse various error types into a consistent format
   */
  private parseError(error: unknown): {
    message: string;
    code?: string;
    details?: any;
  } {
    if (error instanceof Error) {
      return {
        message: error.message,
        code: (error as any).code,
        details: (error as any).details,
      };
    }

    if (typeof error === 'string') {
      return { message: error };
    }

    if (error && typeof error === 'object') {
      return {
        message: (error as any).message || 'An error occurred',
        code: (error as any).code,
        details: error,
      };
    }

    return { message: 'An unknown error occurred' };
  }

  /**
   * Determine error severity based on error type and code
   */
  private determineErrorLevel(errorInfo: { code?: string; message: string }): ErrorLevel {
    // Database errors
    if (errorInfo.code?.startsWith('42') || errorInfo.code?.startsWith('23')) {
      return 'critical';
    }

    // Network errors
    if (errorInfo.message.toLowerCase().includes('network') || 
        errorInfo.message.toLowerCase().includes('fetch')) {
      return 'warning';
    }

    // Permission errors
    if (errorInfo.code === '403' || errorInfo.message.toLowerCase().includes('permission')) {
      return 'error';
    }

    // Validation errors
    if (errorInfo.message.toLowerCase().includes('validation') ||
        errorInfo.message.toLowerCase().includes('invalid')) {
      return 'info';
    }

    return 'error';
  }

  /**
   * Show appropriate notification to user
   */
  private showUserNotification(
    errorInfo: { message: string; code?: string },
    level: ErrorLevel
  ): void {
    const userMessage = this.getUserFriendlyMessage(errorInfo);

    switch (level) {
      case 'info':
        toast.info(userMessage);
        break;
      case 'warning':
        toast.warning(userMessage);
        break;
      case 'error':
        toast.error(userMessage);
        break;
      case 'critical':
        toast.error(userMessage, {
          duration: 10000, // Show critical errors longer
        });
        break;
    }
  }

  /**
   * Convert technical errors to user-friendly messages
   */
  private getUserFriendlyMessage(errorInfo: { message: string; code?: string }): string {
    // Network errors
    if (errorInfo.message.toLowerCase().includes('network')) {
      return 'Connection error. Please check your internet and try again.';
    }

    // Permission errors
    if (errorInfo.code === '403' || errorInfo.message.toLowerCase().includes('permission')) {
      return 'You don\'t have permission to perform this action.';
    }

    // Not found errors
    if (errorInfo.code === '404') {
      return 'The requested resource was not found.';
    }

    // Database constraint errors
    if (errorInfo.code?.startsWith('23')) {
      if (errorInfo.code === '23505') {
        return 'This item already exists. Please use a different value.';
      }
      if (errorInfo.code === '23503') {
        return 'Cannot complete action due to related data dependencies.';
      }
      return 'Database constraint error. Please check your data.';
    }

    // Validation errors
    if (errorInfo.message.toLowerCase().includes('validation')) {
      return errorInfo.message; // These are usually already user-friendly
    }

    // Auth errors
    if (errorInfo.message.toLowerCase().includes('auth') || 
        errorInfo.message.toLowerCase().includes('login')) {
      return 'Authentication error. Please log in again.';
    }

    // Default fallback
    return 'Something went wrong. Please try again or contact support if the issue persists.';
  }

  /**
   * Log errors to external service (placeholder for actual implementation)
   */
  private logToService(
    errorInfo: any,
    context?: ErrorContext,
    level?: ErrorLevel
  ): void {
    // In a real app, this would send to Sentry, LogRocket, etc.
    // For now, just console log in a structured format
    console.error('[Production Error]', {
      level,
      errorInfo,
      context,
      timestamp: new Date().toISOString(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
      url: typeof window !== 'undefined' ? window.location.href : 'server',
    });
  }
}

// Export singleton instance
export const errorHandler = GlobalErrorHandler.getInstance();

// Export convenience function
export function handleError(error: unknown, context?: ErrorContext): void {
  errorHandler.handle(error, context);
}

// React Error Boundary handler
export function handleErrorBoundary(error: Error, errorInfo: { componentStack: string }): void {
  errorHandler.handle(error, {
    action: 'React Error Boundary',
    metadata: { componentStack: errorInfo.componentStack },
  });
}