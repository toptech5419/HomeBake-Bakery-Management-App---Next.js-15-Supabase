'use server';

import { createServer, createServiceRoleClient } from '@/lib/supabase/server';
import type { User } from '@/types';

// Enhanced role change with complete data consistency
export async function updateUserRoleAction(
  user: User, 
  targetId: string, 
  newRole: 'owner' | 'manager' | 'sales_rep'
) {
  if (user.role !== 'owner') {
    return { success: false, error: 'Insufficient permissions' };
  }

  const supabaseAdmin = createServiceRoleClient();
  
  try {
    // Get current user data for audit trail
    const { data: currentUser, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('name, role, email')
      .eq('id', targetId)
      .single();

    if (fetchError || !currentUser) {
      return { success: false, error: 'User not found' };
    }

    // Start transaction-like operation
    const updatePromises = [
      // 1. Update users table
      supabaseAdmin
        .from('users')
        .update({ role: newRole })
        .eq('id', targetId),

      // 2. Update profiles table  
      supabaseAdmin
        .from('profiles')
        .update({ role: newRole })
        .eq('id', targetId)
    ];

    // Execute updates
    const results = await Promise.allSettled(updatePromises);
    
    // Check if any update failed
    const failures = results.filter(result => 
      result.status === 'rejected' || 
      (result.status === 'fulfilled' && result.value.error)
    );

    if (failures.length > 0) {
      throw new Error('Failed to update user role in database tables');
    }

    // 3. Update auth metadata (non-critical, continue if fails)
    try {
      await supabaseAdmin.auth.admin.updateUserById(targetId, {
        user_metadata: { role: newRole }
      });
    } catch (authError) {
      console.warn('Auth metadata update failed:', authError);
    }

    // 4. Log the change in audit table
    await supabaseAdmin
      .from('user_management_audit')
      .insert({
        operation: 'role_change',
        target_user_id: targetId,
        target_user_name: currentUser.name || '',
        target_user_role: newRole,
        performed_by: user.id,
        performed_by_name: user.name || '',
        old_values: { role: currentUser.role },
        new_values: { role: newRole },
        success: true
      });

    return { success: true };

  } catch (error) {
    console.error('Error in updateUserRoleAction:', error);
    
    // Log failed attempt
    try {
      await supabaseAdmin
        .from('user_management_audit')
        .insert({
          operation: 'role_change',
          target_user_id: targetId,
          target_user_name: '',
          target_user_role: newRole,
          performed_by: user.id,
          performed_by_name: user.name || '',
          success: false,
          error_message: error instanceof Error ? error.message : 'Unknown error'
        });
    } catch (auditError) {
      console.error('Failed to log audit:', auditError);
    }
    
    return { success: false, error: 'Failed to update user role' };
  }
}

// Complete deactivation with session termination
export async function deactivateUserAction(user: User, targetId: string) {
  if (user.role !== 'owner') {
    return { success: false, error: 'Insufficient permissions' };
  }

  const supabaseAdmin = createServiceRoleClient();
  
  try {
    // Get user details
    const { data: targetUser, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('name, role, email')
      .eq('id', targetId)
      .single();

    if (fetchError || !targetUser) {
      return { success: false, error: 'User not found' };
    }

    // Batch deactivation operations
    const deactivationPromises = [
      // 1. Deactivate in users table
      supabaseAdmin
        .from('users')
        .update({ is_active: false })
        .eq('id', targetId),

      // 2. Deactivate in profiles table
      supabaseAdmin
        .from('profiles')
        .update({ is_active: false })
        .eq('id', targetId),

      // 3. Terminate all active sessions
      supabaseAdmin
        .from('sessions')
        .delete()
        .eq('user_id', targetId),

      // 4. Disable push notifications
      supabaseAdmin
        .from('push_notification_preferences')
        .update({ enabled: false })
        .eq('user_id', targetId),

      // 5. Invalidate QR invites created by this user
      supabaseAdmin
        .from('qr_invites')
        .update({ is_used: true })
        .eq('created_by', targetId)
        .eq('is_used', false)
    ];

    // Execute all operations
    const results = await Promise.allSettled(deactivationPromises);
    
    // Check for critical failures (users/profiles table updates)
    const criticalFailures = results.slice(0, 2).filter(result => 
      result.status === 'rejected' || 
      (result.status === 'fulfilled' && result.value.error)
    );

    if (criticalFailures.length > 0) {
      throw new Error('Failed to deactivate user in core tables');
    }

    // 6. Sign out user from Supabase Auth (revoke refresh tokens)
    try {
      await supabaseAdmin.auth.admin.signOut(targetId);
    } catch (signOutError) {
      console.warn('Sign out failed:', signOutError);
    }

    // 7. Audit trail
    await supabaseAdmin
      .from('user_management_audit')
      .insert({
        operation: 'user_deactivate',
        target_user_id: targetId,
        target_user_name: targetUser.name || '',
        target_user_role: targetUser.role,
        performed_by: user.id,
        performed_by_name: user.name || '',
        old_values: { is_active: true },
        new_values: { is_active: false },
        dependencies_affected: {
          sessions_terminated: true,
          push_notifications_disabled: true,
          qr_invites_invalidated: true,
          auth_signout_attempted: true
        },
        success: true
      });

    return { success: true };

  } catch (error) {
    console.error('Error in deactivateUserAction:', error);
    
    // Log failed attempt
    try {
      await supabaseAdmin
        .from('user_management_audit')
        .insert({
          operation: 'user_deactivate',
          target_user_id: targetId,
          target_user_name: '',
          target_user_role: '',
          performed_by: user.id,
          performed_by_name: user.name || '',
          success: false,
          error_message: error instanceof Error ? error.message : 'Unknown error'
        });
    } catch (auditError) {
      console.error('Failed to log audit:', auditError);
    }

    return { success: false, error: 'Failed to deactivate user' };
  }
}

// Reactivation function
export async function reactivateUserAction(user: User, targetId: string) {
  if (user.role !== 'owner') {
    return { success: false, error: 'Insufficient permissions' };
  }

  const supabaseAdmin = createServiceRoleClient();
  
  try {
    // Get user details
    const { data: targetUser } = await supabaseAdmin
      .from('users')
      .select('name, role')
      .eq('id', targetId)
      .single();

    // Batch reactivation operations
    const reactivationPromises = [
      supabaseAdmin
        .from('users')
        .update({ is_active: true })
        .eq('id', targetId),
      
      supabaseAdmin
        .from('profiles')
        .update({ is_active: true })
        .eq('id', targetId)
    ];

    const results = await Promise.allSettled(reactivationPromises);
    const failures = results.filter(result => 
      result.status === 'rejected' || 
      (result.status === 'fulfilled' && result.value.error)
    );

    if (failures.length > 0) {
      throw new Error('Failed to reactivate user');
    }

    // Audit trail
    await supabaseAdmin
      .from('user_management_audit')
      .insert({
        operation: 'user_reactivate',
        target_user_id: targetId,
        target_user_name: targetUser?.name || '',
        target_user_role: targetUser?.role || '',
        performed_by: user.id,
        performed_by_name: user.name || '',
        old_values: { is_active: false },
        new_values: { is_active: true },
        success: true
      });

    return { success: true };

  } catch (error) {
    console.error('Error in reactivateUserAction:', error);
    return { success: false, error: 'Failed to reactivate user' };
  }
}

// Safe deletion using database function
export async function deleteUserAction(user: User, targetId: string) {
  if (user.role !== 'owner') {
    return { success: false, error: 'Insufficient permissions' };
  }

  const supabaseAdmin = createServiceRoleClient();
  
  try {
    // Use the safe deletion database function
    const { data, error } = await supabaseAdmin
      .rpc('safe_delete_user', {
        target_user_id: targetId,
        performing_user_id: user.id,
        performing_user_name: user.name || ''
      });

    if (error) {
      throw error;
    }

    const result = data[0];
    
    if (!result.success) {
      return { success: false, error: result.message };
    }

    // If successful, also delete from auth (for hard deletes)
    if (result.deletion_type === 'hard_delete') {
      try {
        await supabaseAdmin.auth.admin.deleteUser(targetId);
      } catch (authError) {
        console.warn('Auth deletion failed:', authError);
      }
    } else if (result.deletion_type === 'soft_delete') {
      try {
        await supabaseAdmin.auth.admin.deleteUser(targetId);
      } catch (authError) {
        console.warn('Auth deletion failed for soft delete:', authError);
      }
    }

    return { 
      success: true, 
      message: result.message,
      deletionType: result.deletion_type,
      dependenciesFound: result.dependencies_found
    };

  } catch (error) {
    console.error('Error in deleteUserAction:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to delete user safely' 
    };
  }
}

// Enhanced user fetching with proper error handling
export async function refetchUsersAction(user: User) {
  if (user.role !== 'owner') {
    return { success: false, error: 'Insufficient permissions' };
  }

  try {
    const supabaseAdmin = createServiceRoleClient();
    
    const { data: users, error } = await supabaseAdmin
      .from('users')
      .select('id, name, role, is_active, created_at, email')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching users:', error);
      return { success: false, error: 'Failed to fetch users' };
    }

    return { success: true, users: users || [] };
  } catch (err) {
    console.error('Error in refetchUsersAction:', err);
    return { success: false, error: 'Internal server error' };
  }
}