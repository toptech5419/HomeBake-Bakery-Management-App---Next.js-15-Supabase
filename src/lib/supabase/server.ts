import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/supabase'

export async function createServer() {
  // Ensure this function is only called on the server side
  if (typeof window !== 'undefined') {
    throw new Error('createServer() can only be called on the server side')
  }

  // Check for required environment variables
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL environment variable is not set. Please check your .env.local file.')
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable is not set. Please check your .env.local file.')
  }

  try {
    // Await cookies() with error handling
    const cookieStore = await cookies();

    return createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
          flowType: 'pkce',
        },
        global: {
          headers: {
            'X-Client-Info': 'homebake-pwa@2.0.0',
          },
          fetch: (url, options = {}) => {
            // Increase timeout for better reliability
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
            
            return fetch(url, {
              ...options,
              signal: controller.signal,
            }).finally(() => {
              clearTimeout(timeoutId);
            });
          },
        },
        cookies: {
          get(name: string) {
            try {
              return cookieStore.get(name)?.value
            } catch (error) {
              console.warn('Error getting cookie:', error)
              return undefined
            }
          },
          set(name: string, value: string, options: CookieOptions) {
            try {
              cookieStore.set({ name, value, ...options })
            } catch (error) {
              // The `set` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
              console.warn('Error setting cookie:', error)
            }
          },
          remove(name: string, options: CookieOptions) {
            try {
              cookieStore.set({ name, value: '', ...options })
            } catch (error) {
              // The `delete` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
              console.warn('Error removing cookie:', error)
            }
          },
        },
      }
    )
  } catch (error) {
    console.error('Error creating server client:', error)
    throw new Error('Failed to initialize database connection')
  }
} 