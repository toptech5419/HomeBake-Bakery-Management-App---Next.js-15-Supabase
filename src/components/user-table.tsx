import React from 'react';
import { Button } from '@/components/ui/button';
import { HiPencil, HiTrash, HiCheckCircle } from 'react-icons/hi';

interface User {
  id: string;
  email?: string;
  role: string;
  name?: string;
  is_active?: boolean;
}

interface UserTableProps {
  users: User[];
  currentUser: User;
  onEdit: (user: User) => Promise<void>;
  onDeactivate: (user: User) => Promise<void>;
  onReactivate: (user: User) => Promise<void>;
  onDelete: (user: User) => Promise<void>;
  loadingId?: string | null;
  loadingAction?: string | null;
}

export function UserTable({ users, currentUser, onEdit, onDeactivate, onReactivate, onDelete, loadingId, loadingAction }: UserTableProps) {
  const handleAction = async (action: 'edit' | 'deactivate' | 'reactivate' | 'delete', user: User) => {
    if (action === 'edit') await onEdit(user);
    if (action === 'deactivate') await onDeactivate(user);
    if (action === 'reactivate') await onReactivate(user);
    if (action === 'delete') await onDelete(user);
  };

  return (
    <div className="overflow-x-auto rounded bg-white shadow">
    <table className="min-w-full border text-sm">
      <thead>
        <tr>
            <th className="px-2 py-2 sm:px-4">Name</th>
            <th className="px-2 py-2 sm:px-4">Email</th>
            <th className="px-2 py-2 sm:px-4">Role</th>
            <th className="px-2 py-2 sm:px-4">Status</th>
            <th className="px-2 py-2 sm:px-4">Actions</th>
        </tr>
      </thead>
      <tbody>
        {users.map((user) => (
          <tr key={user.id} className="border-t">
              <td className="px-2 py-2 sm:px-4">{user.name || '-'}</td>
              <td className="px-2 py-2 sm:px-4">{user.email}</td>
              <td className="px-2 py-2 sm:px-4 capitalize">{user.role}</td>
              <td className="px-2 py-2 sm:px-4">{user.is_active === false ? 'Inactive' : 'Active'}</td>
              <td className="px-2 py-2 sm:px-4 flex flex-col sm:flex-row gap-2 justify-center items-center">
              {currentUser.role === 'owner' && (
                <>
                    <button
                      aria-label="Edit User"
                      title="Edit user role"
                      onClick={() => handleAction('edit', user)}
                      disabled={!!loadingId}
                      className="w-full sm:w-auto px-4 py-2 rounded bg-blue-100 hover:bg-blue-200 text-blue-800 font-medium transition disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {loadingId === user.id && loadingAction === 'edit' ? (
                        <span className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin inline-block mr-2"></span>
                      ) : null}
                      Edit
                    </button>
                    {user.is_active !== false ? (
                      <button
                        aria-label="Deactivate User"
                        title="Deactivate user (soft delete)"
                        onClick={() => handleAction('deactivate', user)}
                        disabled={!!loadingId}
                        className="w-full sm:w-auto px-4 py-2 rounded bg-yellow-100 hover:bg-yellow-200 text-yellow-800 font-medium transition disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {loadingId === user.id && loadingAction === 'deactivate' ? (
                          <span className="w-4 h-4 border-2 border-yellow-600 border-t-transparent rounded-full animate-spin inline-block mr-2"></span>
                        ) : null}
                        Deactivate
                      </button>
                    ) : (
                      <button
                        aria-label="Reactivate User"
                        title="Reactivate user"
                        onClick={() => handleAction('reactivate', user)}
                        disabled={!!loadingId}
                        className="w-full sm:w-auto px-4 py-2 rounded bg-green-100 hover:bg-green-200 text-green-800 font-medium transition disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {loadingId === user.id && loadingAction === 'reactivate' ? (
                          <span className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin inline-block mr-2"></span>
                        ) : null}
                        Reactivate
                      </button>
                    )}
                    <button
                      aria-label="Delete User"
                      title="Delete user permanently"
                      onClick={() => handleAction('delete', user)}
                      disabled={!!loadingId}
                      className="w-full sm:w-auto px-4 py-2 rounded bg-red-100 hover:bg-red-200 text-red-800 font-medium transition disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {loadingId === user.id && loadingAction === 'delete' ? (
                        <span className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin inline-block mr-2"></span>
                      ) : null}
                      Delete
                    </button>
                </>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
    </div>
  );
} 