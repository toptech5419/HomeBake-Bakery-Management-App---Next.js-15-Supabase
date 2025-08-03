import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL')
}

if (!supabaseAnonKey) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

// Production-ready Supabase client with optimized settings
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
  global: {
    headers: {
      'X-Client-Info': 'homebake-pwa@2.0.0',
    },
    fetch: async (url, options = {}) => {
      // Retry logic for socket errors
      const maxRetries = 3;
      let lastError: Error;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
        
        try {
          // Clean up headers to avoid UND_ERR_INVALID_ARG
          const cleanHeaders: Record<string, string> = {};
          
          // Only add valid headers
          if (options.headers) {
            const headers = options.headers instanceof Headers 
              ? Object.fromEntries(options.headers.entries())
              : options.headers as Record<string, string>;
              
            for (const [key, value] of Object.entries(headers)) {
              if (key && value && typeof value === 'string') {
                cleanHeaders[key] = value;
              }
            }
          }

          // Add safe headers
          cleanHeaders['User-Agent'] = 'homebake-pwa/2.0.0';

          // Create clean options
          const cleanOptions: RequestInit = {
            method: options.method || 'GET',
            headers: cleanHeaders,
            signal: controller.signal
          };

          // Only add body for methods that support it
          if (options.body && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(cleanOptions.method!)) {
            cleanOptions.body = options.body;
          }

          // Only add credentials if explicitly set
          if (options.credentials) {
            cleanOptions.credentials = options.credentials;
          }

          const response = await fetch(url, cleanOptions);
          clearTimeout(timeoutId);
          return response;
        } catch (error) {
          clearTimeout(timeoutId);
          lastError = error as Error;
          
          // Check if it's a retryable network error
          const isRetryableError = error instanceof Error && (
            (error.name === 'TypeError' && error.message.includes('fetch failed')) ||
            error.message.includes('UND_ERR_') ||
            error.message.includes('ECONNRESET') ||
            error.message.includes('ENOTFOUND') ||
            error.message.includes('ETIMEDOUT') ||
            error.name === 'AbortError'
          );

          // Log detailed error for debugging
          console.warn(`Client fetch attempt ${attempt}/${maxRetries} failed:`, {
            url: url.toString(),
            error: error instanceof Error ? error.message : String(error),
            name: error instanceof Error ? error.name : 'Unknown',
            isRetryable: isRetryableError
          });

          // If it's the last attempt or not retryable, throw
          if (attempt === maxRetries || !isRetryableError) {
            if (error instanceof Error && error.name === 'AbortError') {
              throw new Error('Request timeout after 15 seconds');
            }
            throw error;
          }

          // Wait before retry with exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.min(1000 * Math.pow(2, attempt - 1), 5000)));
        }
      }
      
      throw lastError!;
    },
  },
})

// Connection health check with retry
export const checkConnection = async (): Promise<boolean> => {
  try {
    const result = await withRetry(
      async () => {
        const { error } = await supabase.from('bread_types').select('count').limit(1).maybeSingle()
        return { error }
      },
      3,
      1000
    )
    return !result.error
  } catch {
    return false
  }
}

// Retry wrapper for database operations
export const withRetry = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError: Error

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error as Error
      
      if (attempt === maxRetries) {
        break
      }
      
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt - 1)))
    }
  }
  
  throw lastError!
}

// Enhanced error handling for Supabase operations
export const handleSupabaseError = (error: any): string => {
  if (!error) return 'An unknown error occurred'
  
  // Handle specific Supabase error codes
  const errorCode = error.code || error.error_description || error.message
  
  switch (errorCode) {
    case 'PGRST116':
      return 'No data found for this request'
    case 'PGRST204':
      return 'Data was successfully updated'
    case '23505':
      return 'This record already exists'
    case '23503':
      return 'Cannot delete this record as it is being used elsewhere'
    case 'invalid_credentials':
      return 'Invalid email or password'
    case 'email_not_confirmed':
      return 'Please check your email and click the confirmation link'
    case 'signup_disabled':
      return 'Account creation is currently disabled'
    case 'invalid_request':
      return 'Invalid request. Please check your information and try again'
    case 'UND_ERR_CONNECT_TIMEOUT':
      return 'Connection timeout. Please check your internet connection and try again.'
    case 'fetch failed':
      return 'Network error. Please check your connection and try again.'
    default:
      return error.message || 'Something went wrong. Please try again.'
  }
}