import { updateSession } from '@/lib/supabase/middleware'
import { type NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  const response = await updateSession(request)

  // Role-based access control for /dashboard/users
  if (request.nextUrl.pathname.startsWith('/dashboard/users')) {
    // Get user from Supabase session (assume JWT in cookie)
    const supabase = (global as any).createServerClient?.() || null;
    let userRole = null;
    if (supabase) {
      const { data } = await supabase.auth.getUser();
      userRole = data?.user?.user_metadata?.role;
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
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|api/).*)',
  ],
} 