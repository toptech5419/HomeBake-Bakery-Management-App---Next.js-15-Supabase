'use server';

import { createServiceRoleClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { User } from '@/types';

// Production-grade user management with comprehensive error handling
interface UserManagementResult {
  success: boolean;
  error?: string;
  details?: {
    sessionsInvalidated?: boolean;
    dependenciesAffected?: Record<string, unknown>;
    auditLogged?: boolean;
    oldRole?: string;
    newRole?: string;
    sessionInvalidationRequired?: boolean;
    deletedUser?: {
      name: string;
      role: string;
      email?: string;
    };
    deactivatedUser?: {
      name: string;
      role: string;
      email?: string;
    };
    reactivatedUser?: {
      name: string;
      role: string;
      email?: string;
    };
  };
}

// Log audit trail for user management operations
async function logUserManagementAudit(
  operation: 'role_change' | 'user_delete' | 'user_deactivate',
  targetUser: Record<string, unknown>,
  performedBy: User,
  oldValues?: Record<string, unknown>,
  newValues?: Record<string, unknown>,
  dependenciesAffected?: Record<string, unknown>,
  success: boolean = true,
  errorMessage?: string
) {
  try {
    const supabaseAdmin = createServiceRoleClient();
    
    await supabaseAdmin.from('user_management_audit').insert({
      operation,
      target_user_id: targetUser.id,
      target_user_name: targetUser.name || targetUser.email || 'Unknown',
      target_user_role: targetUser.role,
      performed_by: performedBy.id,
      performed_by_name: performedBy.name || performedBy.email || 'Unknown',
      old_values: oldValues,
      new_values: newValues,
      dependencies_affected: dependenciesAffected,
      success,
      error_message: errorMessage
    });
  } catch (auditError) {
    console.warn('Failed to log audit trail:', auditError);
  }
}

// Force invalidate user sessions to prevent cached role issues
async function invalidateUserSessions(userId: string): Promise<boolean> {
  try {
    const supabaseAdmin = createServiceRoleClient();
    
    // Use the database function we created
    const { data, error } = await supabaseAdmin.rpc('invalidate_user_sessions', {
      target_user_id: userId
    });
    
    if (error) {
      console.error('Error invalidating sessions:', error);
      return false;
    }
    
    return data === true;
  } catch (error) {
    console.error('Error in invalidateUserSessions:', error);
    return false;
  }
}

// Get user dependencies count for safe deletion
async function getUserDependencies(userId: string): Promise<Record<string, unknown> | null> {
  try {
    const supabaseAdmin = createServiceRoleClient();
    
    const { data, error } = await supabaseAdmin.rpc('get_user_dependencies_count', {
      target_user_id: userId
    });
    
    if (error) {
      console.error('Error getting user dependencies:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Error in getUserDependencies:', error);
    return null;
  }
}

export async function updateUserRoleAction(
  user: User, 
  targetId: string, 
  newRole: 'owner' | 'manager' | 'sales_rep'
): Promise<UserManagementResult> {
  // Check if user has permission
  if (user.role !== 'owner') {
    return { success: false, error: 'Insufficient permissions' };
  }

  // Validate role
  if (!['owner', 'manager', 'sales_rep'].includes(newRole)) {
    return { success: false, error: 'Invalid role specified' };
  }

  let targetUser: Record<string, unknown> | null = null;
  const details: Record<string, unknown> = {};

  try {
    const supabaseAdmin = createServiceRoleClient();

    // Get current user data for audit logging
    const { data: currentUser, error: getUserError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', targetId)
      .single();

    if (getUserError || !currentUser) {
      return { success: false, error: 'Target user not found' };
    }

    targetUser = currentUser;
    const oldRole = currentUser.role;

    // Prevent changing owner role
    if (currentUser.role === 'owner') {
      return { success: false, error: 'Cannot change owner role' };
    }

    // Prevent creating multiple owners
    if (newRole === 'owner') {
      return { success: false, error: 'Cannot assign owner role to other users' };
    }

    // Skip if role is already the same
    if (oldRole === newRole) {
      return { success: false, error: 'User already has this role' };
    }

    console.log(`🔄 Changing user role: ${currentUser.name} (${oldRole} → ${newRole})`);

    // Start transaction-like operations
    const updatePromises = [];

    // Update users table
    updatePromises.push(
      supabaseAdmin
        .from('users')
        .update({ role: newRole, updated_at: new Date().toISOString() })
        .eq('id', targetId)
    );

    // Update profiles table
    updatePromises.push(
      supabaseAdmin
        .from('profiles')
        .update({ role: newRole, updated_at: new Date().toISOString() })
        .eq('id', targetId)
    );

    // Execute updates
    const [usersUpdate, profilesUpdate] = await Promise.all(updatePromises);

    if (usersUpdate.error) {
      throw new Error(`Failed to update users table: ${usersUpdate.error.message}`);
    }

    if (profilesUpdate.error) {
      console.warn('Warning: Failed to update profiles table:', profilesUpdate.error);
    }

    // Update auth.users metadata for consistency
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      targetId,
      {
        user_metadata: { 
          role: newRole,
          name: currentUser.name,
          updated_at: new Date().toISOString()
        }
      }
    );

    if (authError) {
      console.warn('Warning: Could not update auth metadata:', authError);
    }

    // CRITICAL: Invalidate user sessions to prevent cached role conflicts
    const sessionsInvalidated = await invalidateUserSessions(targetId);
    details.sessionsInvalidated = sessionsInvalidated;

    if (!sessionsInvalidated) {
      console.warn('Warning: Could not invalidate user sessions - user may need to re-login');
    }

    // Log audit trail
    await logUserManagementAudit(
      'role_change',
      targetUser,
      user,
      { role: oldRole },
      { role: newRole },
      null,
      true
    );
    details.auditLogged = true;

    // Revalidate pages to clear cache
    revalidatePath('/dashboard/users');
    revalidatePath('/dashboard');

    console.log(`✅ Successfully changed user role: ${currentUser.name} (${oldRole} → ${newRole})`);

    return { 
      success: true, 
      details: {
        ...details,
        oldRole,
        newRole,
        sessionInvalidationRequired: !sessionsInvalidated
      }
    };

  } catch (err) {
    console.error('❌ Error in updateUserRoleAction:', err);
    
    // Log failed audit
    if (targetUser) {
      await logUserManagementAudit(
        'role_change',
        targetUser,
        user,
        { role: targetUser.role },
        { role: newRole },
        null,
        false,
        err instanceof Error ? err.message : 'Internal server error'
      );
    }

    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Internal server error',
      details
    };
  }
}

export async function deactivateUserAction(
  user: User, 
  targetId: string
): Promise<UserManagementResult> {
  // Check if user has permission
  if (user.role !== 'owner') {
    return { success: false, error: 'Insufficient permissions' };
  }

  let targetUser: Record<string, unknown> | null = null;
  const details: Record<string, unknown> = {};

  try {
    const supabaseAdmin = createServiceRoleClient();

    // Get current user data
    const { data: currentUser, error: getUserError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', targetId)
      .single();

    if (getUserError || !currentUser) {
      return { success: false, error: 'Target user not found' };
    }

    targetUser = currentUser;

    // Prevent deactivating owner
    if (currentUser.role === 'owner') {
      return { success: false, error: 'Cannot deactivate owner account' };
    }

    // Prevent self-deactivation
    if (targetId === user.id) {
      return { success: false, error: 'Cannot deactivate your own account' };
    }

    // Skip if already deactivated
    if (currentUser.is_active === false) {
      return { success: false, error: 'User is already deactivated' };
    }

    console.log(`🚫 Deactivating user: ${currentUser.name} (${currentUser.role})`);

    // Update both tables
    const updatePromises = [
      supabaseAdmin
        .from('users')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', targetId),
      supabaseAdmin
        .from('profiles')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', targetId)
    ];

    const [usersUpdate, profilesUpdate] = await Promise.all(updatePromises);

    if (usersUpdate.error) {
      throw new Error(`Failed to deactivate user: ${usersUpdate.error.message}`);
    }

    if (profilesUpdate.error) {
      console.warn('Warning: Failed to update profiles table:', profilesUpdate.error);
    }

    // Invalidate user sessions to force logout
    const sessionsInvalidated = await invalidateUserSessions(targetId);
    details.sessionsInvalidated = sessionsInvalidated;

    // Log audit trail
    await logUserManagementAudit(
      'user_deactivate',
      targetUser,
      user,
      { is_active: true },
      { is_active: false },
      null,
      true
    );
    details.auditLogged = true;

    // Revalidate pages
    revalidatePath('/dashboard/users');
    revalidatePath('/dashboard');

    console.log(`✅ Successfully deactivated user: ${currentUser.name}`);

    return { 
      success: true, 
      details: {
        ...details,
        deactivatedUser: {
          name: currentUser.name,
          role: currentUser.role,
          email: currentUser.email
        }
      }
    };

  } catch (err) {
    console.error('❌ Error in deactivateUserAction:', err);
    
    // Log failed audit
    if (targetUser) {
      await logUserManagementAudit(
        'user_deactivate',
        targetUser,
        user,
        { is_active: true },
        { is_active: false },
        null,
        false,
        err instanceof Error ? err.message : 'Internal server error'
      );
    }

    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Internal server error',
      details
    };
  }
}

export async function reactivateUserAction(
  user: User, 
  targetId: string
): Promise<UserManagementResult> {
  // Check if user has permission
  if (user.role !== 'owner') {
    return { success: false, error: 'Insufficient permissions' };
  }

  let targetUser: Record<string, unknown> | null = null;
  const details: Record<string, unknown> = {};

  try {
    const supabaseAdmin = createServiceRoleClient();

    // Get current user data
    const { data: currentUser, error: getUserError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', targetId)
      .single();

    if (getUserError || !currentUser) {
      return { success: false, error: 'Target user not found' };
    }

    targetUser = currentUser;

    // Skip if already active
    if (currentUser.is_active === true) {
      return { success: false, error: 'User is already active' };
    }

    console.log(`✅ Reactivating user: ${currentUser.name} (${currentUser.role})`);

    // Update both tables
    const updatePromises = [
      supabaseAdmin
        .from('users')
        .update({ is_active: true, updated_at: new Date().toISOString() })
        .eq('id', targetId),
      supabaseAdmin
        .from('profiles')
        .update({ is_active: true, updated_at: new Date().toISOString() })
        .eq('id', targetId)
    ];

    const [usersUpdate, profilesUpdate] = await Promise.all(updatePromises);

    if (usersUpdate.error) {
      throw new Error(`Failed to reactivate user: ${usersUpdate.error.message}`);
    }

    if (profilesUpdate.error) {
      console.warn('Warning: Failed to update profiles table:', profilesUpdate.error);
    }

    // Clear any existing sessions (user will need to login fresh)
    const sessionsInvalidated = await invalidateUserSessions(targetId);
    details.sessionsInvalidated = sessionsInvalidated;

    // Log audit trail
    await logUserManagementAudit(
      'user_deactivate', // We can reuse this with proper old/new values
      targetUser,
      user,
      { is_active: false },
      { is_active: true },
      null,
      true
    );
    details.auditLogged = true;

    // Revalidate pages
    revalidatePath('/dashboard/users');
    revalidatePath('/dashboard');

    console.log(`✅ Successfully reactivated user: ${currentUser.name}`);

    return { 
      success: true, 
      details: {
        ...details,
        reactivatedUser: {
          name: currentUser.name,
          role: currentUser.role,
          email: currentUser.email
        }
      }
    };

  } catch (err) {
    console.error('❌ Error in reactivateUserAction:', err);
    
    // Log failed audit
    if (targetUser) {
      await logUserManagementAudit(
        'user_deactivate',
        targetUser,
        user,
        { is_active: false },
        { is_active: true },
        null,
        false,
        err instanceof Error ? err.message : 'Internal server error'
      );
    }

    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Internal server error',
      details
    };
  }
}

export async function deleteUserAction(
  user: User, 
  targetId: string
): Promise<UserManagementResult> {
  // Check if user has permission
  if (user.role !== 'owner') {
    return { success: false, error: 'Insufficient permissions' };
  }

  let userToDelete: Record<string, unknown> | null = null;
  const details: Record<string, unknown> = {};
  let dependenciesInfo = null;

  try {
    const supabaseAdmin = createServiceRoleClient();

    // First check if user exists and get their data
    const { data: targetUser, error: getUserError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', targetId)
      .single();

    if (getUserError || !targetUser) {
      return { success: false, error: 'User not found' };
    }

    userToDelete = targetUser;

    // Prevent deleting owner
    if (targetUser.role === 'owner') {
      return { success: false, error: 'Cannot delete owner account' };
    }

    // Prevent self-deletion
    if (targetId === user.id) {
      return { success: false, error: 'Cannot delete your own account' };
    }

    console.log(`🗑️ Starting deletion of user: ${targetUser.name} (${targetUser.role})`);

    // Get dependencies count for audit
    dependenciesInfo = await getUserDependencies(targetId);
    details.dependenciesAffected = dependenciesInfo;

    console.log('📊 User dependencies:', dependenciesInfo);

    // With our new CASCADE policies, we can safely delete the user
    // The database will handle most foreign key references automatically
    
    // Step 1: Delete from profiles table first (has auth.users FK)
    console.log(`🗑️ Deleting user ${targetUser.name} from profiles table...`);
    const { error: profilesError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', targetId);

    if (profilesError) {
      console.error('❌ Profiles table deletion error:', profilesError);
      throw new Error(`Failed to delete user profile: ${profilesError.message}`);
    }
    
    console.log(`✅ Successfully deleted user ${targetUser.name} from profiles table`);

    // Step 2: Delete from users table (this will CASCADE or SET NULL for most dependencies)
    console.log(`🗑️ Deleting user ${targetUser.name} from users table...`);
    const { error: usersError } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', targetId);

    if (usersError) {
      console.error('❌ Users table deletion error:', usersError);
      console.error('❌ Error details:', {
        message: usersError.message,
        details: usersError.details,
        hint: usersError.hint,
        code: usersError.code
      });
      
      // Enhanced error message with specific guidance
      let errorMessage = `Failed to delete user from users table: ${usersError.message}`;
      
      if (usersError.code === '23503') {
        errorMessage += '\n\n🔧 SOLUTION: Run the database fix script "fix-user-deletion-URGENT.sql" to update foreign key constraints.';
      }
      
      throw new Error(errorMessage);
    }
    
    console.log(`✅ Successfully deleted user ${targetUser.name} from users table`);

    // Step 3: Delete from auth.users (this will CASCADE delete push notifications)
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(targetId);

    if (authError) {
      console.warn('⚠️ Warning: Could not delete auth user:', authError);
      // Don't fail the operation since main data is already cleaned
      // This might happen if user was created outside normal flow
    }

    // Log successful audit
    await logUserManagementAudit(
      'user_delete',
      userToDelete,
      user,
      { 
        name: targetUser.name,
        role: targetUser.role,
        email: targetUser.email,
        is_active: targetUser.is_active
      },
      null,
      dependenciesInfo,
      true
    );
    details.auditLogged = true;

    // Revalidate pages to clear cache
    revalidatePath('/dashboard/users');
    revalidatePath('/dashboard');

    console.log(`✅ Successfully deleted user: ${targetUser.name}`);
    console.log('📊 Dependencies handled:', dependenciesInfo);

    return { 
      success: true, 
      details: {
        ...details,
        deletedUser: {
          name: targetUser.name,
          role: targetUser.role,
          email: targetUser.email
        }
      }
    };

  } catch (err) {
    console.error('❌ Error in deleteUserAction:', err);
    
    // Log failed audit
    if (userToDelete) {
      await logUserManagementAudit(
        'user_delete',
        userToDelete,
        user,
        { 
          name: userToDelete.name,
          role: userToDelete.role,
          email: userToDelete.email,
          is_active: userToDelete.is_active
        },
        null,
        dependenciesInfo,
        false,
        err instanceof Error ? err.message : 'Internal server error'
      );
    }

    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Internal server error',
      details
    };
  }
}

export async function refetchUsersAction(user: User) {
  // Check if user has permission - only owners can view users
  if (user.role !== 'owner') {
    return { success: false, error: 'Insufficient permissions' };
  }

  try {
    // Use service role client to ensure we can read all users
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