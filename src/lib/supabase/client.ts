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
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
  global: {
    headers: {
      'X-Client-Info': 'homebake-pwa@2.0.0',
    },
  },
})

// Connection health check
export const checkConnection = async (): Promise<boolean> => {
  try {
    const { error } = await supabase.from('bread_types').select('count').limit(1).maybeSingle()
    return !error
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
    default:
      return error.message || 'Something went wrong. Please try again.'
  }
} 