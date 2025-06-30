import { createServer } from '@/lib/supabase/server';
import { canViewUsers, isOwner, User } from './rbac';

export async function getUsers(currentUser: User) {
  if (!canViewUsers(currentUser)) throw new Error('Unauthorized');
  
  const supabase = await createServer();
  
  // Fetch from users table
  const { data, error } = await supabase
    .from('users')
    .select('id, name, role, is_active, created_at, email')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
  
  return data || [];
}

export async function updateUserRole(currentUser: User, targetId: string, newRole: 'owner' | 'manager' | 'sales_rep') {
  if (!isOwner(currentUser)) throw new Error('Unauthorized');
  
  const supabase = await createServer();
  
  // Update users table
  const { error } = await supabase
    .from('users')
    .update({ role: newRole })
    .eq('id', targetId);
  
  if (error) {
    console.error('Error updating user role:', error);
    throw error;
  }
  
  return true;
}

export async function deactivateUser(currentUser: User, targetId: string, reactivate = false) {
  if (!isOwner(currentUser)) throw new Error('Unauthorized');
  
  const supabase = await createServer();
  
  const { error } = await supabase
    .from('users')
    .update({ is_active: reactivate ? true : false })
    .eq('id', targetId);
  
  if (error) {
    console.error('Error updating user status:', error);
    throw error;
  }
  
  return true;
}

export async function deleteUser(currentUser: User, targetId: string) {
  if (!isOwner(currentUser)) throw new Error('Unauthorized');
  
  const supabase = await createServer();
  
  // Delete from users table (cascades should handle other tables)
  const { error } = await supabase
    .from('users')
    .delete()
    .eq('id', targetId);
  
  if (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
  
  return true;
} 