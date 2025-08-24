import { NextRequest, NextResponse } from 'next/server';
import { createServer } from '@/lib/supabase/server';

/**
 * Production-grade API route for staff online count
 * Used by React Query for reliable polling and caching
 */

interface StaffOnlineResponse {
  online: number;
  total: number;
  success: boolean;
  timestamp: string;
}

/**
 * GET /api/dashboard/staff-online
 * Returns current staff online count with proper error handling
 */
export async function GET(request: NextRequest): Promise<NextResponse<StaffOnlineResponse>> {
  try {
    const supabase = await createServer();
    
    // Authenticate the request
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({
        online: 0,
        total: 0,
        success: false,
        timestamp: new Date().toISOString()
      }, { status: 401 });
    }

    // Get user profile to check if they have permission to view staff data
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    // Only owners and managers can view staff online data
    if (!profile || (profile.role !== 'owner' && profile.role !== 'manager')) {
      return NextResponse.json({
        online: 0,
        total: 0,
        success: false,
        timestamp: new Date().toISOString()
      }, { status: 403 });
    }

    // Import the session management function
    const { getStaffOnlineCountFromSessions } = await import('@/lib/auth/session-management');
    
    // Get staff online count using production-grade session tracking
    const result = await getStaffOnlineCountFromSessions();
    
    return NextResponse.json({
      online: result.online,
      total: result.total,
      success: true,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('❌ Staff online count API error:', error);
    
    // Return safe fallback data instead of throwing
    return NextResponse.json({
      online: 0,
      total: 0,
      success: false,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

/**
 * OPTIONS handler for CORS if needed in the future
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}