import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, CheckCircle, XCircle, Loader2 } from 'lucide-react';

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

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'manager':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'sales_rep':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive 
      ? 'bg-green-100 text-green-800 border-green-200' 
      : 'bg-red-100 text-red-800 border-red-200';
  };

  const isLoading = (userId: string, action: string) => {
    return loadingId === userId && loadingAction === action;
  };

  // Mobile Card Layout
  const MobileCard = ({ user }: { user: User }) => (
    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 truncate">
            {user.name || 'No name'}
          </h3>
          <p className="text-sm text-gray-500 truncate mt-1">
            {user.email}
          </p>
        </div>
        <div className="flex items-center gap-2 ml-2">
          <Badge className={`text-xs ${getRoleColor(user.role)}`}>
            {user.role.replace('_', ' ')}
          </Badge>
          <Badge className={`text-xs ${getStatusColor(user.is_active !== false)}`}>
            {user.is_active === false ? (
              <>
                <XCircle className="w-3 h-3 mr-1" />
                Inactive
              </>
            ) : (
              <>
                <CheckCircle className="w-3 h-3 mr-1" />
                Active
              </>
            )}
          </Badge>
        </div>
      </div>
      
      {currentUser.role === 'owner' && (
        <div className="flex flex-wrap gap-2 mt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleAction('edit', user)}
            disabled={!!loadingId}
            className="flex-1 min-w-0"
          >
            {isLoading(user.id, 'edit') ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Edit className="w-4 h-4 mr-2" />
            )}
            Edit
          </Button>
          
          {user.is_active !== false ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAction('deactivate', user)}
              disabled={!!loadingId}
              className="flex-1 min-w-0 hover:bg-yellow-50 hover:border-yellow-300"
            >
              {isLoading(user.id, 'deactivate') ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <XCircle className="w-4 h-4 mr-2" />
              )}
              Deactivate
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAction('reactivate', user)}
              disabled={!!loadingId}
              className="flex-1 min-w-0 hover:bg-green-50 hover:border-green-300"
            >
              {isLoading(user.id, 'reactivate') ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              Reactivate
            </Button>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleAction('delete', user)}
            disabled={!!loadingId}
            className="flex-1 min-w-0 hover:bg-red-50 hover:border-red-300"
          >
            {isLoading(user.id, 'delete') ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4 mr-2" />
            )}
            Delete
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Mobile Cards - visible on small screens */}
      <div className="block md:hidden space-y-4">
        {users.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No users found.</p>
          </div>
        ) : (
          users.map((user) => (
            <MobileCard key={user.id} user={user} />
          ))
        )}
      </div>

      {/* Desktop Table - visible on medium screens and up */}
      <div className="hidden md:block">
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                {currentUser.role === 'owner' && (
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-r from-orange-400 to-orange-600 flex items-center justify-center">
                            <span className="text-sm font-medium text-white">
                              {(user.name || user.email)?.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {user.name || 'No name'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge className={`${getRoleColor(user.role)}`}>
                        {user.role.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge className={`${getStatusColor(user.is_active !== false)}`}>
                        {user.is_active === false ? (
                          <>
                            <XCircle className="w-4 h-4 mr-1" />
                            Inactive
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Active
                          </>
                        )}
                      </Badge>
                    </td>
                    {currentUser.role === 'owner' && (
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAction('edit', user)}
                            disabled={!!loadingId}
                            className="hover:bg-blue-50 hover:border-blue-300"
                          >
                            {isLoading(user.id, 'edit') ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Edit className="w-4 h-4" />
                            )}
                          </Button>
                          
                          {user.is_active !== false ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleAction('deactivate', user)}
                              disabled={!!loadingId}
                              className="hover:bg-yellow-50 hover:border-yellow-300"
                            >
                              {isLoading(user.id, 'deactivate') ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <XCircle className="w-4 h-4" />
                              )}
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleAction('reactivate', user)}
                              disabled={!!loadingId}
                              className="hover:bg-green-50 hover:border-green-300"
                            >
                              {isLoading(user.id, 'reactivate') ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <CheckCircle className="w-4 h-4" />
                              )}
                            </Button>
                          )}
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAction('delete', user)}
                            disabled={!!loadingId}
                            className="hover:bg-red-50 hover:border-red-300"
                          >
                            {isLoading(user.id, 'delete') ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
} 