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
    const { error } = await supabase
      .from('users')
      .update({ role: newRole })
      .eq('id', targetId);

    if (error) {
      console.error('Error updating user role:', error);
      return { success: false, error: 'Failed to update user role' };
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
    const { error } = await supabase
      .from('users')
      .update({ is_active: false })
      .eq('id', targetId);

    if (error) {
      console.error('Error deactivating user:', error);
      return { success: false, error: 'Failed to deactivate user' };
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
    const { error } = await supabase
      .from('users')
      .update({ is_active: true })
      .eq('id', targetId);

    if (error) {
      console.error('Error reactivating user:', error);
      return { success: false, error: 'Failed to reactivate user' };
    }

    return { success: true };
  } catch (err) {
    console.error('Error in reactivateUserAction:', err);
    return { success: false, error: 'Internal server error' };
  }
}

export async function deleteUserAction(
  user: User, 
  targetId: string, 
  targetEmail: string
) {
  const supabase = await createServer();

  // Check if user has permission
  if (user.role !== 'owner') {
    return { success: false, error: 'Insufficient permissions' };
  }

  try {
    // Delete from users table
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', targetId);

    if (error) {
      console.error('Error deleting user:', error);
      return { success: false, error: 'Failed to delete user' };
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