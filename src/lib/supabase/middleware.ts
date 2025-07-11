import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'

export async function updateSession(request: NextRequest) {
  // This response will be returned unmodified if the user is not authenticated.
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

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
    }
  )

  // This will refresh the session cookie if needed.
  await supabase.auth.getUser()

  return response
} 