import { updateSession } from '@/lib/supabase/middleware'
import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  try {
    // Always try to update session first
    const response = await updateSession(request)

    // Check if this is a protected dashboard route
    if (request.nextUrl.pathname.startsWith('/dashboard') || request.nextUrl.pathname.startsWith('/owner-dashboard')) {
      // Create Supabase client for middleware
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            get(name: string) {
              return request.cookies.get(name)?.value
            },
            set(name: string, value: string, options) {
              // Set cookie in response
              response.cookies.set({ name, value, ...options })
            },
            remove(name: string, options) {
              // Remove cookie from response
              response.cookies.set({ name, value: '', ...options })
            },
          },
        }
      )

      // Check authentication
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error || !user) {
        // Not authenticated, redirect to login
        return NextResponse.redirect(new URL('/login', request.url))
      }

      // Simple route protection - let the dashboard page handle role-based redirects
      // This eliminates role checking conflicts and race conditions
      
      // Only enforce authentication, not role-based access
      // Role-based redirects are handled by individual dashboard pages
    }

    return response
  } catch (error) {
    // If middleware completely fails, redirect to login for safety
    if (request.nextUrl.pathname.startsWith('/dashboard') || request.nextUrl.pathname.startsWith('/owner-dashboard')) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    
    // For non-dashboard routes, continue with the request
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    /*
     * Match request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - icons (PWA icons)
     * - sw.js (service worker)
     * - manifest.json (PWA manifest)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|icons|sw.js|manifest.json).*)',
  ],
} 