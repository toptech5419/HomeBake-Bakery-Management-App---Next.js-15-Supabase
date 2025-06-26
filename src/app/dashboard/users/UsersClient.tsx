"use client";
import React, { useState } from 'react';
import { UserTable } from '@/components/user-table';
import { useToast } from '@/components/ui/ToastProvider';
import { updateUserRoleAction, deactivateUserAction, reactivateUserAction, deleteUserAction, refetchUsersAction } from './actions';

interface User {
  id: string;
  email?: string;
  role: string;
  name?: string;
  is_active?: boolean;
}

export default function UsersClient({ users: initialUsers, user }: { users: User[]; user: User }) {
  const [users, setUsers] = useState(initialUsers);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const toast = useToast();

  const refetchUsers = async () => {
    try {
      setLoadingId('refetch');
      const result = await refetchUsersAction(user);
      if (result.success && Array.isArray(result.users)) {
        setUsers(result.users);
      } else if (result.success && result.users) {
        setUsers(Array.isArray(result.users) ? result.users : []);
      } else {
        setUsers([]);
        toast.error(result.error || 'Failed to fetch users. Please refresh the page.');
      }
    } catch (err) {
      setUsers([]);
      toast.error('An unexpected error occurred while fetching users.');
    } finally {
      setLoadingId(null);
    }
  };

  const handleEdit = async (target: User) => {
    setLoadingId(target.id);
    setLoadingAction('edit');
    const newRole = prompt('Enter new role (owner, manager, sales_rep):', target.role);
    if (!newRole) {
      setLoadingId(null);
      setLoadingAction(null);
      return;
    }
    try {
      const result = await updateUserRoleAction(user, target.id, newRole);
      if (result.success) {
        toast.success('Role updated!');
        await refetchUsers();
      } else {
        toast.error(result.error || 'Failed to update user role.');
      }
    } catch (err: unknown) {
      toast.error('An unexpected error occurred while updating the role.');
    } finally {
      setLoadingId(null);
      setLoadingAction(null);
    }
  };
  const handleDeactivate = async (target: User) => {
    setLoadingId(target.id);
    setLoadingAction('deactivate');
    try {
      const result = await deactivateUserAction(user, target.id);
      if (result.success) {
        toast.success('User deactivated!');
        await refetchUsers();
      } else {
        toast.error(result.error || 'Failed to deactivate user.');
      }
    } catch (err: unknown) {
      toast.error('An unexpected error occurred while deactivating the user.');
    } finally {
      setLoadingId(null);
      setLoadingAction(null);
    }
  };
  const handleReactivate = async (target: User) => {
    setLoadingId(target.id);
    setLoadingAction('reactivate');
    try {
      const result = await reactivateUserAction(user, target.id);
      if (result.success) {
        toast.success('User reactivated!');
        await refetchUsers();
      } else {
        toast.error(result.error || 'Failed to reactivate user.');
      }
    } catch (err: unknown) {
      toast.error('An unexpected error occurred while reactivating the user.');
    } finally {
      setLoadingId(null);
      setLoadingAction(null);
    }
  };
  const handleDelete = async (target: User) => {
    if (!window.confirm('Delete this user? This will permanently remove their access.')) return;
    setLoadingId(target.id);
    setLoadingAction('delete');
    try {
      const result = await deleteUserAction(user, target.id, target.email);
      if (result.success) {
        toast.success('User deleted and access removed!');
        await refetchUsers();
      } else {
        toast.error(result.error || 'Failed to delete user.');
      }
    } catch (err: unknown) {
      toast.error('An unexpected error occurred while deleting the user.');
    } finally {
      setLoadingId(null);
      setLoadingAction(null);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">User Management</h1>
      <UserTable
        users={users}
        currentUser={user}
        onEdit={handleEdit}
        onDeactivate={handleDeactivate}
        onReactivate={handleReactivate}
        onDelete={handleDelete}
        loadingId={loadingId}
        loadingAction={loadingAction}
      />
    </div>
  );
} 