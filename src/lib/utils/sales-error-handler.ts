/**
 * Production-grade error handling for sales operations
 * Provides consistent error handling, logging, and user feedback
 */

import { toast } from 'sonner';

export type SalesErrorType = 
  | 'NETWORK_ERROR'
  | 'VALIDATION_ERROR'
  | 'AUTHORIZATION_ERROR'
  | 'SERVER_ERROR'
  | 'UNKNOWN_ERROR';

export interface SalesError {
  type: SalesErrorType;
  message: string;
  originalError?: Error | unknown;
  context?: Record<string, unknown>;
  userMessage: string;
  shouldRetry: boolean;
}

/**
 * Classify and handle different types of sales-related errors
 */
export function handleSalesError(
  error: unknown,
  context: string = 'Sales Operation',
  additionalContext?: Record<string, unknown>
): SalesError {
  let salesError: SalesError;

  if (error instanceof Error) {
    // Network/Connection errors
    if (error.message.includes('fetch') || 
        error.message.includes('network') ||
        error.message.includes('ECONNREFUSED') ||
        error.message.includes('Failed to fetch')) {
      salesError = {
        type: 'NETWORK_ERROR',
        message: `Network error in ${context}`,
        originalError: error,
        context: additionalContext,
        userMessage: 'Connection issue. Please check your internet and try again.',
        shouldRetry: true
      };
    }
    // Validation errors
    else if (error.message.includes('validation') || 
             error.message.includes('invalid') ||
             error.message.includes('required')) {
      salesError = {
        type: 'VALIDATION_ERROR',
        message: `Validation error in ${context}`,
        originalError: error,
        context: additionalContext,
        userMessage: error.message,
        shouldRetry: false
      };
    }
    // Authorization errors
    else if (error.message.includes('unauthorized') || 
             error.message.includes('auth') ||
             error.message.includes('permission')) {
      salesError = {
        type: 'AUTHORIZATION_ERROR',
        message: `Authorization error in ${context}`,
        originalError: error,
        context: additionalContext,
        userMessage: 'You don\'t have permission for this action. Please contact your manager.',
        shouldRetry: false
      };
    }
    // Server errors
    else if (error.message.includes('50') || 
             error.message.includes('server') ||
             error.message.includes('timeout')) {
      salesError = {
        type: 'SERVER_ERROR',
        message: `Server error in ${context}`,
        originalError: error,
        context: additionalContext,
        userMessage: 'Server issue. Please try again in a moment.',
        shouldRetry: true
      };
    }
    // Unknown errors
    else {
      salesError = {
        type: 'UNKNOWN_ERROR',
        message: `Unknown error in ${context}: ${error.message}`,
        originalError: error,
        context: additionalContext,
        userMessage: 'Something went wrong. Please try again.',
        shouldRetry: true
      };
    }
  } else {
    // Non-Error objects
    salesError = {
      type: 'UNKNOWN_ERROR',
      message: `Unknown error in ${context}`,
      originalError: error,
      context: additionalContext,
      userMessage: 'Something went wrong. Please try again.',
      shouldRetry: true
    };
  }

  // Log the error for monitoring
  console.error('🚨 Sales Error:', {
    ...salesError,
    timestamp: new Date().toISOString(),
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server'
  });

  return salesError;
}

/**
 * Display user-friendly error messages with consistent styling
 */
export function showSalesError(salesError: SalesError): void {
  const toastOptions = {
    duration: salesError.shouldRetry ? 5000 : 4000,
    position: 'top-center' as const,
  };

  switch (salesError.type) {
    case 'NETWORK_ERROR':
      toast.error(salesError.userMessage, {
        ...toastOptions,
        description: 'Check your connection and try again',
      });
      break;
    
    case 'VALIDATION_ERROR':
      toast.error(salesError.userMessage, {
        ...toastOptions,
        description: 'Please fix the highlighted fields',
      });
      break;
    
    case 'AUTHORIZATION_ERROR':
      toast.error(salesError.userMessage, {
        ...toastOptions,
        description: 'Contact your manager if this continues',
      });
      break;
    
    case 'SERVER_ERROR':
      toast.error(salesError.userMessage, {
        ...toastOptions,
        description: 'We\'re working to fix this issue',
      });
      break;
    
    default:
      toast.error(salesError.userMessage, toastOptions);
  }
}

/**
 * Combined error handling and user notification
 */
export function handleAndShowSalesError(
  error: unknown,
  context: string = 'Sales Operation',
  additionalContext?: Record<string, unknown>
): SalesError {
  const salesError = handleSalesError(error, context, additionalContext);
  showSalesError(salesError);
  return salesError;
}

/**
 * Production error boundary for sales components
 */
export class SalesErrorBoundary extends Error {
  public readonly type: SalesErrorType;
  public readonly shouldRetry: boolean;
  public readonly userMessage: string;

  constructor(message: string, type: SalesErrorType = 'UNKNOWN_ERROR', shouldRetry: boolean = true) {
    super(message);
    this.name = 'SalesErrorBoundary';
    this.type = type;
    this.shouldRetry = shouldRetry;
    this.userMessage = this.getUserMessage(type);
  }

  private getUserMessage(type: SalesErrorType): string {
    switch (type) {
      case 'NETWORK_ERROR':
        return 'Connection issue. Please check your internet.';
      case 'VALIDATION_ERROR':
        return 'Please check your input and try again.';
      case 'AUTHORIZATION_ERROR':
        return 'You don\'t have permission for this action.';
      case 'SERVER_ERROR':
        return 'Server issue. Please try again shortly.';
      default:
        return 'Something went wrong. Please try again.';
    }
  }
}

/**
 * Retry configuration for React Query
 */
export const salesRetryConfig = {
  retry: (failureCount: number, error: any): boolean => {
    // Don't retry validation or auth errors
    if (error?.type === 'VALIDATION_ERROR' || error?.type === 'AUTHORIZATION_ERROR') {
      return false;
    }
    
    // Retry up to 3 times for other errors
    return failureCount < 3;
  },
  
  retryDelay: (attemptIndex: number): number => {
    // Exponential backoff: 1s, 2s, 4s
    return Math.min(1000 * Math.pow(2, attemptIndex), 30000);
  }
};

/**
 * Standard React Query error handler
 */
export const defaultQueryOptions = {
  ...salesRetryConfig,
  staleTime: 30000, // 30 seconds
  gcTime: 300000,   // 5 minutes
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
  networkMode: 'offlineFirst' as const,
};