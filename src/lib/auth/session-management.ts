'use server';

import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * PROFESSIONAL SESSION MANAGEMENT FOR STAFF ONLINE TRACKING
 * Uses service role client to bypass RLS policies for cross-user session management
 */

export interface SessionResult {
  success: boolean;
  error?: string;
}

export interface StaffOnlineResult {
  online: number;
  total: number;
  activeUsers: Array<{
    user_id: string;
    user_name: string;
    user_role: string;
    login_time: string;
  }>;
}

/**
 * Create a session for a user when they login
 * Uses service role client to bypass RLS
 */
export async function createUserSession(userId: string): Promise<SessionResult> {
  const serviceClient = createServiceRoleClient();
  
  try {
    console.log(`🔐 [SESSION] Creating session for user ${userId.slice(-4)}...`);
    
    // Generate a unique token for the session
    const token = `session_${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Set session expiry to 24 hours from now
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);
    
    // First, clean up any existing sessions for this user
    const { error: deleteError } = await serviceClient
      .from('sessions')
      .delete()
      .eq('user_id', userId);
    
    if (deleteError) {
      console.warn(`⚠️ [SESSION] Failed to cleanup existing sessions for user ${userId.slice(-4)}:`, deleteError.message);
      // Continue anyway - not critical
    }
    
    // Create new session
    const { data, error } = await serviceClient
      .from('sessions')
      .insert({
        user_id: userId,
        token: token,
        expires_at: expiresAt.toISOString()
      })
      .select()
      .single();
    
    if (error) {
      console.error(`❌ [SESSION] Failed to create session for user ${userId.slice(-4)}:`, {
        error: error.message,
        code: error.code,
        details: error.details
      });
      return { success: false, error: error.message };
    }
    
    console.log(`✅ [SESSION] Session created successfully for user ${userId.slice(-4)}`, {
      sessionId: data.id,
      expiresAt: expiresAt.toISOString()
    });
    return { success: true };
    
  } catch (error) {
    console.error(`❌ [SESSION] Exception creating session for user ${userId.slice(-4)}:`, error);
    return { success: false, error: 'Failed to create session' };
  }
}

/**
 * Delete a user's session when they logout
 * Uses service role client to bypass RLS
 */
export async function deleteUserSession(userId: string): Promise<SessionResult> {
  const serviceClient = createServiceRoleClient();
  
  try {
    console.log(`🗑️ [SESSION] Deleting session for user ${userId.slice(-4)}...`);
    
    const { error } = await serviceClient
      .from('sessions')
      .delete()
      .eq('user_id', userId);
    
    if (error) {
      console.error(`❌ [SESSION] Failed to delete session for user ${userId.slice(-4)}:`, {
        error: error.message,
        code: error.code,
        details: error.details
      });
      return { success: false, error: error.message };
    }
    
    console.log(`✅ [SESSION] Session deleted successfully for user ${userId.slice(-4)}`);
    return { success: true };
    
  } catch (error) {
    console.error(`❌ [SESSION] Exception deleting session for user ${userId.slice(-4)}:`, error);
    return { success: false, error: 'Failed to delete session' };
  }
}

/**
 * Get staff online count by querying active sessions
 * Uses service role client to bypass RLS and see all sessions
 */
export async function getStaffOnlineCountFromSessions(): Promise<StaffOnlineResult> {
  const serviceClient = createServiceRoleClient();
  
  try {
    console.log('📊 [SESSION] Fetching staff online count from sessions...');
    
    // First cleanup expired sessions
    await cleanupExpiredSessions();
    
    // Get all active sessions (non-expired)
    const now = new Date().toISOString();
    const { data: activeSessions, error: sessionsError } = await serviceClient
      .from('sessions')
      .select(`
        user_id,
        expires_at,
        token
      `)
      .gt('expires_at', now);
    
    if (sessionsError) {
      console.error('❌ [SESSION] Failed to fetch active sessions:', {
        error: sessionsError.message,
        code: sessionsError.code,
        details: sessionsError.details
      });
      return { online: 0, total: 0, activeUsers: [] };
    }
    
    console.log(`📊 [SESSION] Found ${activeSessions?.length || 0} active sessions`);
    
    // Get user details for active sessions
    const activeUserIds = activeSessions?.map(s => s.user_id) || [];
    
    let activeUsersWithDetails: Array<{
      user_id: string;
      user_name: string;
      user_role: string;
      login_time: string;
    }> = [];
    
    if (activeUserIds.length > 0) {
      const { data: userDetails, error: usersError } = await serviceClient
        .from('users')
        .select('id, name, role')
        .in('id', activeUserIds)
        .neq('role', 'owner') // Exclude owners from staff count
        .eq('is_active', true);
      
      if (usersError) {
        console.warn('⚠️ [SESSION] Failed to fetch user details for active sessions:', usersError);
      } else if (userDetails) {
        // Combine session and user data
        activeUsersWithDetails = userDetails.map(user => {
          const session = activeSessions.find(s => s.user_id === user.id);
          return {
            user_id: user.id,
            user_name: user.name,
            user_role: user.role,
            login_time: session?.expires_at || new Date().toISOString()
          };
        });
        
        console.log(`📊 [SESSION] Active staff details:`, activeUsersWithDetails.map(u => ({
          name: u.user_name,
          role: u.user_role,
          id: u.user_id.slice(-4)
        })));
      }
    }
    
    // Get total staff count (all active managers and sales_reps)
    const { data: totalStaffData, error: totalError, count: totalStaffCount } = await serviceClient
      .from('users')
      .select('id, name, role', { count: 'exact' })
      .neq('role', 'owner')
      .eq('is_active', true);
    
    if (totalError) {
      console.warn('⚠️ [SESSION] Failed to fetch total staff count:', totalError);
    }
    
    const onlineCount = activeUsersWithDetails.length;
    const totalCount = totalStaffCount || totalStaffData?.length || 0;
    
    console.log(`📊 [SESSION] Staff count details:`, {
      totalStaffFromCount: totalStaffCount,
      totalStaffFromData: totalStaffData?.length || 0,
      finalTotalCount: totalCount,
      activeUsersCount: onlineCount
    });
    
    console.log(`📊 [SESSION] Final Result - Staff online: ${onlineCount}/${totalCount}`);
    
    return {
      online: onlineCount,
      total: totalCount,
      activeUsers: activeUsersWithDetails
    };
    
  } catch (error) {
    console.error('❌ [SESSION] Exception getting staff online count:', error);
    return { online: 0, total: 0, activeUsers: [] };
  }
}

/**
 * Clean up expired sessions (maintenance function)
 * Uses service role client to bypass RLS
 */
export async function cleanupExpiredSessions(): Promise<SessionResult> {
  const serviceClient = createServiceRoleClient();
  
  try {
    const now = new Date().toISOString();
    
    console.log('🧹 [SESSION] Cleaning up expired sessions...');
    
    const { data: expiredSessions, error: deleteError } = await serviceClient
      .from('sessions')
      .delete()
      .lt('expires_at', now)
      .select('user_id');
    
    if (deleteError) {
      console.error('❌ [SESSION] Failed to cleanup expired sessions:', deleteError);
      return { success: false, error: deleteError.message };
    }
    
    const cleanedCount = expiredSessions?.length || 0;
    if (cleanedCount > 0) {
      console.log(`✅ [SESSION] Cleaned up ${cleanedCount} expired sessions`);
    }
    
    return { success: true };
    
  } catch (error) {
    console.error('❌ [SESSION] Exception cleaning up expired sessions:', error);
    return { success: false, error: 'Failed to cleanup expired sessions' };
  }
}