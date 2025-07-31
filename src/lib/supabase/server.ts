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
          flowType: 'pkce'
        },
        global: {
          headers: {
            'X-Client-Info': 'homebake-pwa@2.0.0',
            'x-application-name': 'homebake'
          },
          fetch: async (url: RequestInfo | URL, options: RequestInit = {}): Promise<Response> => {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

            try {
              const response = await fetch(url, {
                ...options,
                signal: controller.signal,
                ...((!options.method || options.method === 'GET') && { 
                  keepalive: true,
                  cache: 'no-cache'
                }),
                ...(options.method === 'POST' && {
                  keepalive: true
                })
              });

              if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
              }

              return response;
            } catch (error) {
              if (error instanceof Error) {
                if (error.name === 'AbortError') {
                  throw new Error('Request timeout after 30 seconds');
                }
                console.error('Fetch error:', error.message);
                throw new Error(`Connection failed: ${error.message}`);
              }
              throw new Error('An unknown error occurred');
            } finally {
              clearTimeout(timeoutId);
            }
          }
        },
        realtime: {
          params: {
            eventsPerSecond: 10
          }
        },
        db: {
          schema: 'public'
        },
        cookies: {
          get(key: string) {
            try {
              return cookieStore.get(key)?.value
            } catch {
              return undefined
            }
          },
          set(key: string, value: string, options: CookieOptions) {
            try {
              if (typeof window === 'undefined') {
                cookieStore.set({ name: key, value, ...options })
              }
            } catch (error) {
              console.warn('Cookie set failed:', error)
            }
          },
          remove(key: string, options: CookieOptions) {
            try {
              if (typeof window === 'undefined') {
                cookieStore.set({ name: key, value: '', ...options })
              }
            } catch (error) {
              console.warn('Cookie remove failed:', error)
            }
          }
        }
      }
    )
  } catch (error) {
    console.error('Error creating server client:', error)
    throw new Error('Failed to initialize database connection')
  }
} 