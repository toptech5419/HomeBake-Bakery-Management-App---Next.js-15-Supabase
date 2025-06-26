'use server';
import { updateUserRole, deactivateUser, deleteUser, getUsers } from '@/lib/auth/user-actions';
import { revalidatePath } from 'next/cache';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function updateUserRoleAction(user, targetId, newRole) {
  try {
    await updateUserRole(user, targetId, newRole);
    revalidatePath('/dashboard/users');
    return { success: true };
  } catch (err) {
    return { success: false, error: 'Failed to update user role. Please check the role and try again.' };
  }
}

export async function deactivateUserAction(user, targetId) {
  try {
    await deactivateUser(user, targetId);
    revalidatePath('/dashboard/users');
    return { success: true };
  } catch (err) {
    return { success: false, error: 'Failed to deactivate user. Please try again.' };
  }
}

export async function reactivateUserAction(user, targetId) {
  try {
    await deactivateUser(user, targetId, true);
    revalidatePath('/dashboard/users');
    return { success: true };
  } catch (err) {
    return { success: false, error: 'Failed to reactivate user. Please try again.' };
  }
}

export async function deleteUserAction(user, targetId, targetEmail) {
  try {
    await deleteUser(user, targetId);
    // Also delete from Supabase Auth
    if (targetEmail) {
      const { data: userList, error: fetchError } = await supabaseAdmin.auth.admin.listUsers({ email: targetEmail });
      if (fetchError) throw fetchError;
      const authUser = userList.users.find(u => u.email === targetEmail);
      if (authUser) {
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(authUser.id);
        if (deleteError) throw deleteError;
      }
    }
    revalidatePath('/dashboard/users');
    return { success: true };
  } catch (err) {
    return { success: false, error: 'Failed to fully delete user. Please try again or contact support.' };
  }
}

export async function refetchUsersAction(user) {
  try {
    const users = await getUsers(user);
    return { success: true, users };
  } catch (err) {
    return { success: false, error: 'Failed to fetch users. Please refresh the page.' };
  }
} 