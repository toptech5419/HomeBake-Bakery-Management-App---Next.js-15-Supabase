'use server';

import { createServer } from '@/lib/supabase/server';
import { deleteUserSession } from './session-management';
import { logLogoutActivity } from '@/lib/activities/server-activity-service';

/**
 * Professional logout function that handles sessions properly
 */
export async function logoutUser(): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServer();

  try {
    // Get current user before logout
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return { success: false, error: 'No user found' };
    }

    // Get user profile for logging
    const { data: profile } = await supabase
      .from('users')
      .select('role, name')
      .eq('id', user.id)
      .single();

    // Delete session from sessions table (for staff online tracking)
    if (profile && profile.role !== 'owner') {
      try {
        const sessionResult = await deleteUserSession(user.id);
        if (!sessionResult.success) {
          console.error('Failed to delete session:', sessionResult.error);
        }

        // Log logout activity
        await logLogoutActivity({
          user_id: user.id,
          user_name: profile.name || user.email?.split('@')[0] || 'User',
          user_role: profile.role as 'manager' | 'sales_rep'
        });
      } catch (error) {
        console.error('Error handling session/activity on logout:', error);
        // Continue with logout even if this fails
      }
    }

    // Perform Supabase auth logout
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      return { success: false, error: signOutError.message };
    }

    console.log(`✅ User ${user.id.slice(-4)} logged out successfully`);
    return { success: true };

  } catch (error) {
    console.error('Error in logoutUser:', error);
    return { success: false, error: 'Logout failed' };
  }
}