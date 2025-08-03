import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'

export async function updateSession(request: NextRequest) {
  // This response will be returned unmodified if the user is not authenticated.
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set(name: string, value: string, options) {
            // If the cookie is set, update the request and response cookies.
            request.cookies.set({ name, value, ...options })
            response.cookies.set({ name, value, ...options })
          },
          remove(name: string, options) {
            // If the cookie is removed, update the request and response cookies.
            request.cookies.set({ name, value: '', ...options })
            response.cookies.delete(name, options)
          },
        },
        global: {
          fetch: (url, options = {}) => {
            // Shorter timeout for middleware to prevent blocking
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
            
            return fetch(url, {
              ...options,
              signal: controller.signal,
            }).finally(() => {
              clearTimeout(timeoutId);
            });
          },
        },
      }
    )

    // This will refresh the session cookie if needed with timeout protection
    const userPromise = supabase.auth.getUser()
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Auth timeout')), 8000)
    })
    
    await Promise.race([userPromise, timeoutPromise])
  } catch (error) {
    // If auth fails, just continue - let the page handle auth redirects
    console.warn('Middleware auth check failed:', error)
  }

  return response
} 