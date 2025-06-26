import { supabase } from '@/lib/supabase/client';
import { canViewUsers, isOwner, User } from './rbac';

export async function getUsersClient(currentUser: User) {
  if (!canViewUsers(currentUser)) throw new Error('Unauthorized');
  const { data, error } = await supabase.from('users').select('*');
  if (error) throw error;
  return data;
}

export async function updateUserRoleClient(currentUser: User, targetId: string, newRole: string) {
  if (!isOwner(currentUser)) throw new Error('Unauthorized');
  const { error } = await supabase.from('users').update({ role: newRole }).eq('id', targetId);
  if (error) throw error;
  return true;
}

export async function deactivateUserClient(currentUser: User, targetId: string) {
  if (!isOwner(currentUser)) throw new Error('Unauthorized');
  const { error } = await supabase.from('users').update({ is_active: false }).eq('id', targetId);
  if (error) throw error;
  return true;
}

export async function deleteUserClient(currentUser: User, targetId: string) {
  if (!isOwner(currentUser)) throw new Error('Unauthorized');
  const { error } = await supabase.from('users').delete().eq('id', targetId);
  if (error) throw error;
  return true;
} 