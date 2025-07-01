import { z } from 'zod';
import { PostgrestError } from '@supabase/supabase-js';

// Error types for different scenarios
export interface FormattedError {
  message: string;
  code?: string;
  field?: string;
  type: 'validation' | 'database' | 'network' | 'auth' | 'general';
  details?: Record<string, any>;
}

// Supabase error handler
export function handleSupabaseError(error: PostgrestError | any): FormattedError {
  if (!error) {
    return {
      message: 'An unknown database error occurred',
      type: 'database'
    };
  }

  // Check if it's a Supabase PostgrestError
  if (error.code && error.message) {
    const supabaseError = error as PostgrestError;
    
    // Map common Supabase error codes to user-friendly messages
    const errorMappings: Record<string, string> = {
      '23505': 'This record already exists. Please check for duplicates.',
      '23503': 'This action cannot be completed because related data exists.',
      '23502': 'Required information is missing.',
      '42501': 'You do not have permission to perform this action.',
      'PGRST116': 'No matching records found.',
      'PGRST301': 'Row level security violation.',
      '08006': 'Connection to the database failed.',
      '53300': 'Database is temporarily unavailable.',
    };

    let friendlyMessage = errorMappings[supabaseError.code] || supabaseError.message;

    // Specific handling for common scenarios
    if (supabaseError.code === '23505') {
      if (supabaseError.message.includes('email')) {
        friendlyMessage = 'An account with this email already exists.';
      } else if (supabaseError.message.includes('name')) {
        friendlyMessage = 'A record with this name already exists.';
      }
    }

    return {
      message: friendlyMessage,
      code: supabaseError.code,
      type: 'database',
      details: {
        originalMessage: supabaseError.message,
        hint: supabaseError.hint,
        details: supabaseError.details
      }
    };
  }

  // Handle auth errors
  if (error.message?.includes('Invalid login credentials')) {
    return {
      message: 'Invalid email or password. Please try again.',
      type: 'auth'
    };
  }

  if (error.message?.includes('Email not confirmed')) {
    return {
      message: 'Please check your email and click the confirmation link.',
      type: 'auth'
    };
  }

  if (error.message?.includes('User already registered')) {
    return {
      message: 'An account with this email already exists.',
      type: 'auth'
    };
  }

  // Handle network errors
  if (error.message?.includes('fetch') || error.code === 'NETWORK_ERROR') {
    return {
      message: 'Network error. Please check your connection and try again.',
      type: 'network'
    };
  }

  // Fallback for unknown errors
  return {
    message: error.message || 'An unexpected error occurred. Please try again.',
    type: 'general',
    details: { originalError: error }
  };
}

// Zod validation error handler
export function handleZodError(error: z.ZodError): FormattedError[] {
  return error.errors.map(zodError => {
    const field = zodError.path.join('.');
    let message = zodError.message;

    // Enhance messages for better UX
    if (zodError.code === 'invalid_type') {
      if (zodError.expected === 'number') {
        message = `${field} must be a valid number`;
      } else if (zodError.expected === 'string') {
        message = `${field} must be text`;
      }
    }

    return {
      message,
      field,
      type: 'validation' as const,
      code: zodError.code,
      details: {
        expected: 'expected' in zodError ? zodError.expected : undefined,
        received: 'received' in zodError ? zodError.received : undefined,
        path: zodError.path
      }
    };
  });
}

// Get user-friendly error message
export function getFriendlyErrorMessage(error: unknown): string {
  if (!error) {
    return 'An unknown error occurred';
  }

  // Handle Zod errors
  if (error instanceof z.ZodError) {
    const zodErrors = handleZodError(error);
    return zodErrors.map(e => e.message).join('. ');
  }

  // Handle Supabase errors
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const formattedError = handleSupabaseError(error);
    return formattedError.message;
  }

  // Handle standard Error objects
  if (error instanceof Error) {
    return error.message;
  }

  // Handle string errors
  if (typeof error === 'string') {
    return error;
  }

  // Fallback
  return 'An unexpected error occurred';
}

// Error logging utility
export function logError(
  error: unknown, 
  context?: { 
    component?: string; 
    action?: string; 
    userId?: string; 
    metadata?: Record<string, any>;
  }
) {
  const errorInfo = {
    timestamp: new Date().toISOString(),
    error: getFriendlyErrorMessage(error),
    context: context || {},
    stack: error instanceof Error ? error.stack : undefined,
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
    url: typeof window !== 'undefined' ? window.location.href : undefined
  };

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Error logged:', errorInfo);
  }

  // In production, you would send this to an error tracking service
  // Example: Sentry.captureException(error, { extra: errorInfo });
  
  return errorInfo;
}

// Toast error helper
export function showErrorToast(
  toast: { error: (message: string) => void }, 
  error: unknown, 
  fallbackMessage?: string
) {
  const message = getFriendlyErrorMessage(error) || fallbackMessage || 'Something went wrong';
  toast.error(message);
}

// Form validation helper
export function validateFormData<T>(
  schema: z.ZodSchema<T>, 
  data: unknown
): { success: true; data: T } | { success: false; errors: Record<string, string> } {
  try {
    const validatedData = schema.parse(data);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string> = {};
      error.errors.forEach(err => {
        const field = err.path.join('.');
        errors[field] = err.message;
      });
      return { success: false, errors };
    }
    throw error;
  }
}

// API error wrapper
export async function handleApiRequest<T>(
  request: () => Promise<T>,
  context?: { component?: string; action?: string }
): Promise<{ success: true; data: T } | { success: false; error: FormattedError }> {
  try {
    const data = await request();
    return { success: true, data };
  } catch (error) {
    // Log the error
    logError(error, context);

    // Format the error
    let formattedError: FormattedError;
    
    if (error instanceof z.ZodError) {
      const zodErrors = handleZodError(error);
      formattedError = {
        message: zodErrors.map(e => e.message).join('. '),
        type: 'validation',
        details: { validationErrors: zodErrors }
      };
    } else {
      formattedError = handleSupabaseError(error);
    }

    return { success: false, error: formattedError };
  }
}

// Retry mechanism for failed requests
export async function retryRequest<T>(
  request: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await request();
    } catch (error) {
      lastError = error;
      
      // Don't retry validation errors or auth errors
      if (error instanceof z.ZodError || 
          (typeof error === 'object' && error !== null && 'code' in error && 
           ['42501', 'PGRST301'].includes((error as any).code))) {
        throw error;
      }

      // Wait before retrying (exponential backoff)
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
      }
    }
  }

  throw lastError;
}

// Error boundary helpers
export function createErrorBoundaryHandler(componentName: string) {
  return (error: Error, errorInfo: any) => {
    logError(error, {
      component: componentName,
      action: 'render',
      metadata: errorInfo
    });
  };
}

// Network status checker
export function isNetworkError(error: unknown): boolean {
  if (typeof error === 'object' && error !== null) {
    const errorObj = error as any;
    return (
      errorObj.code === 'NETWORK_ERROR' ||
      errorObj.message?.includes('fetch') ||
      errorObj.message?.includes('network') ||
      errorObj.message?.includes('connection')
    );
  }
  return false;
}

// Generic error types for common scenarios
export const CommonErrors = {
  VALIDATION_ERROR: (field: string, message: string): FormattedError => ({
    message,
    field,
    type: 'validation'
  }),
  
  NETWORK_ERROR: (): FormattedError => ({
    message: 'Network error. Please check your connection and try again.',
    type: 'network'
  }),
  
  UNAUTHORIZED: (): FormattedError => ({
    message: 'You are not authorized to perform this action.',
    type: 'auth'
  }),
  
  NOT_FOUND: (resource: string = 'resource'): FormattedError => ({
    message: `The requested ${resource} was not found.`,
    type: 'general'
  }),
  
  SERVER_ERROR: (): FormattedError => ({
    message: 'A server error occurred. Please try again later.',
    type: 'general'
  })
};