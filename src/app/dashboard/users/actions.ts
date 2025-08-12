'use server';

import { createServer, createServiceRoleClient } from '@/lib/supabase/server';
import type { User } from '@/types';

export async function updateUserRoleAction(
  user: User, 
  targetId: string, 
  newRole: 'owner' | 'manager' | 'sales_rep'
) {
  // Check if user has permission
  if (user.role !== 'owner') {
    return { success: false, error: 'Insufficient permissions' };
  }

  try {
    // Use service role client to bypass RLS policies
    const supabaseAdmin = createServiceRoleClient();
    const supabase = await createServer();

    // Update users table
    const { error: usersError } = await supabaseAdmin
      .from('users')
      .update({ role: newRole })
      .eq('id', targetId);

    if (usersError) {
      console.error('Error updating users table:', usersError);
      return { success: false, error: 'Failed to update user role in users table' };
    }

    // Update profiles table
    const { error: profilesError } = await supabaseAdmin
      .from('profiles')
      .update({ role: newRole })
      .eq('id', targetId);

    if (profilesError) {
      console.error('Error updating profiles table:', profilesError);
      return { success: false, error: 'Failed to update user role in profiles table' };
    }

    // Update auth.users metadata for consistency
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      targetId,
      {
        user_metadata: { role: newRole }
      }
    );

    if (authError) {
      console.warn('Warning: Could not update auth metadata:', authError);
    }

    return { success: true };
  } catch (err) {
    console.error('Error in updateUserRoleAction:', err);
    return { success: false, error: 'Internal server error' };
  }
}

export async function deactivateUserAction(user: User, targetId: string) {
  // Check if user has permission
  if (user.role !== 'owner') {
    return { success: false, error: 'Insufficient permissions' };
  }

  try {
    // Use service role client to bypass RLS policies
    const supabaseAdmin = createServiceRoleClient();

    // Update users table
    const { error: usersError } = await supabaseAdmin
      .from('users')
      .update({ is_active: false })
      .eq('id', targetId);

    if (usersError) {
      console.error('Error deactivating user in users table:', usersError);
      return { success: false, error: 'Failed to deactivate user' };
    }

    // Update profiles table
    const { error: profilesError } = await supabaseAdmin
      .from('profiles')
      .update({ is_active: false })
      .eq('id', targetId);

    if (profilesError) {
      console.error('Error deactivating user in profiles table:', profilesError);
      return { success: false, error: 'Failed to deactivate user profile' };
    }

    return { success: true };
  } catch (err) {
    console.error('Error in deactivateUserAction:', err);
    return { success: false, error: 'Internal server error' };
  }
}

export async function reactivateUserAction(user: User, targetId: string) {
  // Check if user has permission
  if (user.role !== 'owner') {
    return { success: false, error: 'Insufficient permissions' };
  }

  try {
    // Use service role client to bypass RLS policies
    const supabaseAdmin = createServiceRoleClient();

    // Update users table
    const { error: usersError } = await supabaseAdmin
      .from('users')
      .update({ is_active: true })
      .eq('id', targetId);

    if (usersError) {
      console.error('Error reactivating user in users table:', usersError);
      return { success: false, error: 'Failed to reactivate user' };
    }

    // Update profiles table
    const { error: profilesError } = await supabaseAdmin
      .from('profiles')
      .update({ is_active: true })
      .eq('id', targetId);

    if (profilesError) {
      console.error('Error reactivating user in profiles table:', profilesError);
      return { success: false, error: 'Failed to reactivate user profile' };
    }

    return { success: true };
  } catch (err) {
    console.error('Error in reactivateUserAction:', err);
    return { success: false, error: 'Internal server error' };
  }
}

export async function deleteUserAction(
  user: User, 
  targetId: string
) {
  // Check if user has permission
  if (user.role !== 'owner') {
    return { success: false, error: 'Insufficient permissions' };
  }

  try {
    // Use service role client to bypass RLS policies
    const supabaseAdmin = createServiceRoleClient();

    // First check if user exists
    const { data: userToDelete } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', targetId)
      .single();

    if (!userToDelete) {
      return { success: false, error: 'User not found' };
    }

    console.log('Deleting user:', userToDelete.name, 'with ID:', targetId);

    // Delete from related tables first (foreign key dependencies)
    // Delete user activities
    const { error: activitiesError } = await supabaseAdmin
      .from('activities')
      .delete()
      .eq('user_id', targetId);

    if (activitiesError) {
      console.warn('Warning: Could not delete user activities:', activitiesError);
    }

    // Delete user sessions
    const { error: sessionsError } = await supabaseAdmin
      .from('sessions')
      .delete()
      .eq('user_id', targetId);

    if (sessionsError) {
      console.warn('Warning: Could not delete user sessions:', sessionsError);
    }

    // Delete push notification preferences
    const { error: notifError } = await supabaseAdmin
      .from('push_notification_preferences')
      .delete()
      .eq('user_id', targetId);

    if (notifError) {
      console.warn('Warning: Could not delete notification preferences:', notifError);
    }

    // Delete QR invites created by this user
    const { error: qrError } = await supabaseAdmin
      .from('qr_invites')
      .delete()
      .eq('created_by', targetId);

    if (qrError) {
      console.warn('Warning: Could not delete QR invites:', qrError);
    }

    // Delete from profiles table
    const { error: profilesError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', targetId);

    if (profilesError) {
      console.error('Error deleting user profile:', profilesError);
      return { success: false, error: 'Failed to delete user profile' };
    }

    // Delete from users table
    const { error: usersError } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', targetId);

    if (usersError) {
      console.error('Error deleting user from users table:', usersError);
      return { success: false, error: 'Failed to delete user from users table' };
    }

    // Finally, delete from auth.users using admin API
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(targetId);

    if (authError) {
      console.warn('Warning: Could not delete auth user:', authError);
      // Don't fail the operation, just log warning since main tables are cleaned
    }

    console.log('Successfully deleted user:', userToDelete.name);
    return { success: true };
  } catch (err) {
    console.error('Error in deleteUserAction:', err);
    return { success: false, error: 'Internal server error' };
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