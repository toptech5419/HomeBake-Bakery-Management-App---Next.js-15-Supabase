"use client";
import React, { useState } from 'react';
import { UserTable } from '@/components/user-table';
import { useToast } from '@/components/ui/ToastProvider';
import { Button } from '@/components/ui/button';
import { RefreshCw, Users } from 'lucide-react';
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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const toast = useToast();

  const refetchUsers = async () => {
    try {
      setIsRefreshing(true);
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
    } catch {
      setUsers([]);
      toast.error('An unexpected error occurred while fetching users.');
    } finally {
      setLoadingId(null);
      setIsRefreshing(false);
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
        toast.success('Role updated successfully!');
        await refetchUsers();
      } else {
        toast.error(result.error || 'Failed to update user role.');
      }
    } catch {
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
        toast.success('User deactivated successfully!');
        await refetchUsers();
      } else {
        toast.error(result.error || 'Failed to deactivate user.');
      }
    } catch {
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
        toast.success('User reactivated successfully!');
        await refetchUsers();
      } else {
        toast.error(result.error || 'Failed to reactivate user.');
      }
    } catch {
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
      const result = await deleteUserAction(user, target.id);
      if (result.success) {
        toast.success('User deleted and access removed successfully!');
        await refetchUsers();
      } else {
        toast.error(result.error || 'Failed to delete user.');
      }
    } catch {
      toast.error('An unexpected error occurred while deleting the user.');
    } finally {
      setLoadingId(null);
      setLoadingAction(null);
    }
  };

  const activeUsers = users.filter(u => u.is_active !== false).length;
  const inactiveUsers = users.filter(u => u.is_active === false).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Users className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
            <p className="text-sm text-gray-600">
              {users.length} total users • {activeUsers} active • {inactiveUsers} inactive
            </p>
          </div>
        </div>
        
        <Button
          variant="outline"
          onClick={refetchUsers}
          disabled={isRefreshing}
          className="self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">{users.length}</p>
            </div>
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Users</p>
              <p className="text-2xl font-bold text-green-600">{activeUsers}</p>
            </div>
            <div className="p-2 bg-green-100 rounded-lg">
              <Users className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Inactive Users</p>
              <p className="text-2xl font-bold text-red-600">{inactiveUsers}</p>
            </div>
            <div className="p-2 bg-red-100 rounded-lg">
              <Users className="w-5 h-5 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* User Table */}
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