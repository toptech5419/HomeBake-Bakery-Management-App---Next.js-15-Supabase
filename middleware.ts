import { updateSession } from '@/lib/supabase/middleware'
import { type NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  try {
    // Always try to update session, but don't fail if it doesn't work
    const response = await updateSession(request)

    // Only apply access control to specific protected routes
    if (request.nextUrl.pathname.startsWith('/dashboard/users')) {
      // Get user from Supabase session (assume JWT in cookie)
      const supabase = (global as any).createServerClient?.() || null;
      let userRole = null;
      
      if (supabase) {
        try {
          const { data } = await supabase.auth.getUser();
          userRole = data?.user?.user_metadata?.role;
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            console.log('Auth check failed:', error);
          }
        }
      }
      
      // Fallback: check cookie (if you store role in a cookie)
      if (!userRole) {
        const roleCookie = request.cookies.get('role')?.value;
        if (roleCookie) userRole = roleCookie;
      }
      
      if (userRole !== 'owner') {
        return NextResponse.redirect(new URL('/login', request.url));
      }
    }
    
    return response
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.log('Middleware error:', error);
    }
    // If middleware fails, just continue with the request
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