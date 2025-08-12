'use server';

import { createServer } from '@/lib/supabase/server';
import type { User } from '@/types';

export async function updateUserRoleAction(
  user: User, 
  targetId: string, 
  newRole: 'owner' | 'manager' | 'sales_rep'
) {
  const supabase = await createServer();

  // Check if user has permission
  if (user.role !== 'owner') {
    return { success: false, error: 'Insufficient permissions' };
  }

  try {
    // Start a transaction by updating both tables
    const { error: usersError } = await supabase
      .from('users')
      .update({ role: newRole })
      .eq('id', targetId);

    if (usersError) {
      console.error('Error updating users table:', usersError);
      return { success: false, error: 'Failed to update user role in users table' };
    }

    // Update profiles table using service role to bypass RLS
    const { error: profilesError } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', targetId);

    if (profilesError) {
      console.error('Error updating profiles table:', profilesError);
      // Rollback users table change
      await supabase
        .from('users')
        .select('role')
        .eq('id', targetId)
        .single()
        .then(async ({ data: originalUser }) => {
          if (originalUser) {
            await supabase
              .from('users')
              .update({ role: originalUser.role })
              .eq('id', targetId);
          }
        });
      return { success: false, error: 'Failed to update user role in profiles table' };
    }

    // Update auth.users metadata for consistency
    const { error: authError } = await supabase.auth.admin.updateUserById(
      targetId,
      {
        user_metadata: { role: newRole }
      }
    );

    if (authError) {
      console.warn('Warning: Could not update auth metadata:', authError);
      // Don't fail the operation for this, just log warning
    }

    return { success: true };
  } catch (err) {
    console.error('Error in updateUserRoleAction:', err);
    return { success: false, error: 'Internal server error' };
  }
}

export async function deactivateUserAction(user: User, targetId: string) {
  const supabase = await createServer();

  // Check if user has permission
  if (user.role !== 'owner') {
    return { success: false, error: 'Insufficient permissions' };
  }

  try {
    // Update users table
    const { error: usersError } = await supabase
      .from('users')
      .update({ is_active: false })
      .eq('id', targetId);

    if (usersError) {
      console.error('Error deactivating user in users table:', usersError);
      return { success: false, error: 'Failed to deactivate user' };
    }

    // Update profiles table
    const { error: profilesError } = await supabase
      .from('profiles')
      .update({ is_active: false })
      .eq('id', targetId);

    if (profilesError) {
      console.error('Error deactivating user in profiles table:', profilesError);
      // Rollback users table change
      await supabase
        .from('users')
        .update({ is_active: true })
        .eq('id', targetId);
      return { success: false, error: 'Failed to deactivate user profile' };
    }

    return { success: true };
  } catch (err) {
    console.error('Error in deactivateUserAction:', err);
    return { success: false, error: 'Internal server error' };
  }
}

export async function reactivateUserAction(user: User, targetId: string) {
  const supabase = await createServer();

  // Check if user has permission
  if (user.role !== 'owner') {
    return { success: false, error: 'Insufficient permissions' };
  }

  try {
    // Update users table
    const { error: usersError } = await supabase
      .from('users')
      .update({ is_active: true })
      .eq('id', targetId);

    if (usersError) {
      console.error('Error reactivating user in users table:', usersError);
      return { success: false, error: 'Failed to reactivate user' };
    }

    // Update profiles table
    const { error: profilesError } = await supabase
      .from('profiles')
      .update({ is_active: true })
      .eq('id', targetId);

    if (profilesError) {
      console.error('Error reactivating user in profiles table:', profilesError);
      // Rollback users table change
      await supabase
        .from('users')
        .update({ is_active: false })
        .eq('id', targetId);
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
  const supabase = await createServer();

  // Check if user has permission
  if (user.role !== 'owner') {
    return { success: false, error: 'Insufficient permissions' };
  }

  try {
    // First check if user exists and get their details for rollback if needed
    const { data: userToDelete } = await supabase
      .from('users')
      .select('*')
      .eq('id', targetId)
      .single();

    if (!userToDelete) {
      return { success: false, error: 'User not found' };
    }

    // Delete from related tables first (foreign key dependencies)
    // Delete user activities
    await supabase
      .from('activities')
      .delete()
      .eq('user_id', targetId);

    // Delete user sessions
    await supabase
      .from('sessions')
      .delete()
      .eq('user_id', targetId);

    // Delete push notification preferences
    await supabase
      .from('push_notification_preferences')
      .delete()
      .eq('user_id', targetId);

    // Delete from profiles table
    const { error: profilesError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', targetId);

    if (profilesError) {
      console.error('Error deleting user profile:', profilesError);
      return { success: false, error: 'Failed to delete user profile' };
    }

    // Delete from users table
    const { error: usersError } = await supabase
      .from('users')
      .delete()
      .eq('id', targetId);

    if (usersError) {
      console.error('Error deleting user from users table:', usersError);
      return { success: false, error: 'Failed to delete user from users table' };
    }

    // Finally, delete from auth.users using admin API
    const { error: authError } = await supabase.auth.admin.deleteUser(targetId);

    if (authError) {
      console.warn('Warning: Could not delete auth user:', authError);
      // Don't fail the operation, just log warning since main tables are cleaned
    }

    return { success: true };
  } catch (err) {
    console.error('Error in deleteUserAction:', err);
    return { success: false, error: 'Internal server error' };
  }
}

export async function refetchUsersAction(user: User) {
  const supabase = await createServer();

  // Check if user has permission - only owners can view users
  if (user.role !== 'owner') {
    return { success: false, error: 'Insufficient permissions' };
  }

  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, name, role, is_active, created_at')
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