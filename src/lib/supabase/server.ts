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
            // Retry logic for network failures
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
                
                // Create clean options without problematic properties
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
                
                // Check if it's a network error that should be retried
                const isRetryableError = error instanceof Error && (
                  (error.name === 'TypeError' && error.message.includes('fetch failed')) ||
                  error.message.includes('UND_ERR_') ||
                  error.message.includes('ECONNRESET') ||
                  error.message.includes('ENOTFOUND') ||
                  error.message.includes('ETIMEDOUT') ||
                  error.name === 'AbortError'
                );

                // Log detailed error for debugging
                console.warn(`Fetch attempt ${attempt}/${maxRetries} failed:`, {
                  url: url.toString(),
                  error: error instanceof Error ? error.message : String(error),
                  name: error instanceof Error ? error.name : 'Unknown',
                  isRetryable: isRetryableError
                });

                // If it's the last attempt or not a retryable error, throw
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