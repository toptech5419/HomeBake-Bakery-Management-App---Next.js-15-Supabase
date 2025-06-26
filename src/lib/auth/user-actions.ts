import { createServer } from '@/lib/supabase/server';
import { canViewUsers, isOwner, User } from './rbac';

export async function getUsers(currentUser: User) {
  if (!canViewUsers(currentUser)) throw new Error('Unauthorized');
  const supabase = await createServer();
  const { data, error } = await supabase.from('users').select('*');
  if (error) throw error;
  return data;
}

export async function updateUserRole(currentUser: User, targetId: string, newRole: string) {
  if (!isOwner(currentUser)) throw new Error('Unauthorized');
  const supabase = await createServer();
  const { error } = await supabase.from('users').update({ role: newRole }).eq('id', targetId);
  if (error) throw error;
  return true;
}

export async function deactivateUser(currentUser: User, targetId: string, reactivate = false) {
  if (!isOwner(currentUser)) throw new Error('Unauthorized');
  const supabase = await createServer();
  const { error } = await supabase.from('users').update({ is_active: reactivate ? true : false }).eq('id', targetId);
  if (error) throw error;
  return true;
}

export async function deleteUser(currentUser: User, targetId: string) {
  if (!isOwner(currentUser)) throw new Error('Unauthorized');
  const supabase = await createServer();
  const { error } = await supabase.from('users').delete().eq('id', targetId);
  if (error) throw error;
  return true;
} 