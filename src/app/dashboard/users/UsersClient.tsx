"use client";
import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/ToastProvider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Users, MoreVertical, Edit, CheckCircle, XCircle, Trash2, Loader2, UserCheck, UserX, UserPlus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { updateUserRoleAction, deactivateUserAction, reactivateUserAction, deleteUserAction, refetchUsersAction } from './actions';
import { useRouter } from 'next/navigation';

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
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const toast = useToast();
  const router = useRouter();

  // Clear browser cache and force refresh
  const clearCacheAndRefresh = () => {
    // Clear localStorage cache if any
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user-cache');
      localStorage.removeItem('dashboard-cache');
      // Force router refresh
      router.refresh();
    }
  };

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
    
    // Enhanced role selection with validation
    const validRoles = ['manager', 'sales_rep'];
    const roleOptions = validRoles.map(role => `${role} (${role.replace('_', ' ').toUpperCase()})`).join('\n');
    
    const newRole = prompt(
      `Change role for ${target.name || target.email}:\n\nCurrent role: ${target.role.replace('_', ' ').toUpperCase()}\n\nEnter new role:\n${roleOptions}\n\nType exactly: manager OR sales_rep`,
      target.role === 'manager' ? 'sales_rep' : 'manager'
    );
    
    if (!newRole) {
      setLoadingId(null);
      setLoadingAction(null);
      return;
    }

    // Validate role input
    if (!validRoles.includes(newRole.trim())) {
      toast.error('Invalid role. Please enter exactly: manager or sales_rep');
      setLoadingId(null);
      setLoadingAction(null);
      return;
    }

    // Confirm role change
    const confirmChange = window.confirm(
      `⚠️ IMPORTANT: Changing role will immediately log out the user!\n\n` +
      `User: ${target.name || target.email}\n` +
      `Current role: ${target.role.replace('_', ' ').toUpperCase()}\n` +
      `New role: ${newRole.trim().replace('_', ' ').toUpperCase()}\n\n` +
      `The user will need to log in again with their new permissions.\n\n` +
      `Continue with role change?`
    );

    if (!confirmChange) {
      setLoadingId(null);
      setLoadingAction(null);
      return;
    }

    try {
      const result = await updateUserRoleAction(user, target.id, newRole.trim() as 'owner' | 'manager' | 'sales_rep');
      
      if (result.success) {
        const details = result.details;
        
        // Simple success message
        let successMessage = `✅ Role updated to ${newRole.replace('_', ' ').toUpperCase()}`;
        
        if (details && 'sessionsInvalidated' in details && details.sessionsInvalidated) {
          successMessage += ` - User logged out`;
        }
        
        toast.success(successMessage, 'Success', 4000);
        
        // Clear cache and refresh
        clearCacheAndRefresh();
        await refetchUsers();
      } else {
        toast.error(result.error || 'Failed to update role', 'Update Failed', 4000);
      }
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('❌ Failed to update role', 'Error', 4000);
    } finally {
      setLoadingId(null);
      setLoadingAction(null);
    }
  };

  const handleDeactivate = async (target: User) => {
    const confirmDeactivate = window.confirm(
      `Deactivate user account?\n\n` +
      `User: ${target.name || target.email}\n` +
      `Role: ${target.role.replace('_', ' ').toUpperCase()}\n\n` +
      `This will:\n` +
      `🔒 Log them out immediately\n` +
      `❌ Prevent them from logging in\n` +
      `📊 Preserve all their data\n\n` +
      `You can reactivate them later.`
    );

    if (!confirmDeactivate) return;

    setLoadingId(target.id);
    setLoadingAction('deactivate');
    
    try {
      const result = await deactivateUserAction(user, target.id);
      
      if (result.success) {
        const details = result.details;
        
        const deactivatedUser = details && 'deactivatedUser' in details ? details.deactivatedUser as { name: string; role: string; email?: string } : null;
        const successMessage = `✅ ${deactivatedUser?.name || target.name} deactivated`;
        
        toast.success(successMessage, 'User Deactivated', 4000);
        
        // Clear cache and refresh
        clearCacheAndRefresh();
        await refetchUsers();
      } else {
        toast.error(result.error || 'Failed to deactivate', 'Deactivation Failed', 4000);
      }
    } catch (error) {
      console.error('Error deactivating user:', error);
      toast.error('❌ Failed to deactivate user', 'Error', 4000);
    } finally {
      setLoadingId(null);
      setLoadingAction(null);
    }
  };

  const handleReactivate = async (target: User) => {
    const confirmReactivate = window.confirm(
      `Reactivate user account?\n\n` +
      `User: ${target.name || target.email}\n` +
      `Role: ${target.role.replace('_', ' ').toUpperCase()}\n\n` +
      `This will allow them to log in again with their original permissions.`
    );

    if (!confirmReactivate) return;

    setLoadingId(target.id);
    setLoadingAction('reactivate');
    
    try {
      const result = await reactivateUserAction(user, target.id);
      
      if (result.success) {
        const details = result.details;
        
        const reactivatedUser = details && 'reactivatedUser' in details ? details.reactivatedUser as { name: string; role: string; email?: string } : null;
        const successMessage = `✅ ${reactivatedUser?.name || target.name} reactivated`;
        
        toast.success(successMessage, 'User Reactivated', 4000);
        
        // Clear cache and refresh
        clearCacheAndRefresh();
        await refetchUsers();
      } else {
        toast.error(result.error || 'Failed to reactivate', 'Reactivation Failed', 4000);
      }
    } catch (error) {
      console.error('Error reactivating user:', error);
      toast.error('❌ Failed to reactivate user', 'Error', 4000);
    } finally {
      setLoadingId(null);
      setLoadingAction(null);
    }
  };

  const handleDelete = async (target: User) => {
    // Enhanced deletion confirmation with dependency info
    const confirmDelete = window.confirm(
      `⚠️ PERMANENT DELETION WARNING ⚠️\n\n` +
      `This will permanently delete:\n` +
      `👤 User: ${target.name || target.email}\n` +
      `🏷️ Role: ${target.role.replace('_', ' ').toUpperCase()}\n\n` +
      `📊 This user's data in batches, sales, reports, and activities ` +
      `will be preserved but their user reference will be removed.\n\n` +
      `🔒 Their authentication and access will be completely removed.\n\n` +
      `❌ This action CANNOT be undone!\n\n` +
      `Type 'DELETE' and press OK to continue.`
    );

    if (!confirmDelete) return;

    // Double confirmation for safety
    const finalConfirm = prompt(
      `Final confirmation required.\n\n` +
      `To permanently delete ${target.name || target.email}, type: DELETE`
    );

    if (finalConfirm !== 'DELETE') {
      toast.error('Deletion cancelled - confirmation text did not match.');
      return;
    }

    setLoadingId(target.id);
    setLoadingAction('delete');
    
    try {
      const result = await deleteUserAction(user, target.id);
      
      if (result.success) {
        const details = result.details;
        
        const deletedUser = details && 'deletedUser' in details ? details.deletedUser as { name: string; role: string; email?: string } : null;
        const successMessage = `✅ ${deletedUser?.name || target.name} deleted successfully`;
        
        toast.success(successMessage, 'User Deleted', 4000);
        
        // Clear cache and refresh
        clearCacheAndRefresh();
        await refetchUsers();
      } else {
        // Simple, clear error message for mobile
        let errorMessage = result.error || 'Failed to delete user.';
        
        if (errorMessage.includes('foreign key') || errorMessage.includes('23503')) {
          errorMessage = '❌ Database error. Run fix script first.';
        }
        
        toast.error(errorMessage, 'Deletion Failed', 6000);
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      
      // Simple error message
      toast.error('❌ Deletion failed. Check console for details.', 'Error', 5000);
    } finally {
      setLoadingId(null);
      setLoadingAction(null);
    }
  };

  const activeUsers = users.filter(u => u.is_active !== false).length;
  const inactiveUsers = users.filter(u => u.is_active === false).length;

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-gradient-to-r from-purple-500 to-purple-600 text-white border-purple-200';
      case 'manager':
        return 'bg-gradient-to-r from-blue-500 to-blue-600 text-white border-blue-200';
      case 'sales_rep':
        return 'bg-gradient-to-r from-green-500 to-green-600 text-white border-green-200';
      default:
        return 'bg-gradient-to-r from-gray-500 to-gray-600 text-white border-gray-200';
    }
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive 
      ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white border-green-200' 
      : 'bg-gradient-to-r from-red-500 to-red-600 text-white border-red-200';
  };

  const isLoading = (userId: string, action: string) => {
    return loadingId === userId && loadingAction === action;
  };

  const getDropdownItems = (user: User) => {
    const items = [
      {
        label: 'Edit Role',
        icon: <Edit className="w-4 h-4" />,
        onClick: () => {
          handleEdit(user);
          setActiveDropdownId(null);
        },
        disabled: isLoading(user.id, 'edit')
      }
    ];

    if (user.is_active !== false) {
      items.push({
        label: 'Deactivate',
        icon: <UserX className="w-4 h-4" />,
        onClick: () => {
          handleDeactivate(user);
          setActiveDropdownId(null);
        },
        variant: 'warning' as const,
        disabled: isLoading(user.id, 'deactivate')
      });
    } else {
      items.push({
        label: 'Reactivate',
        icon: <UserCheck className="w-4 h-4" />,
        onClick: () => {
          handleReactivate(user);
          setActiveDropdownId(null);
        },
        variant: 'success' as const,
        disabled: isLoading(user.id, 'reactivate')
      });
    }

    items.push({
      label: 'Delete User',
      icon: <Trash2 className="w-4 h-4" />,
      onClick: () => {
        handleDelete(user);
        setActiveDropdownId(null);
      },
      variant: 'danger' as const,
      disabled: isLoading(user.id, 'delete')
    });

    return items;
  };

  // Custom dropdown component that manages parent z-index
  const UserDropdown = ({ user }: { user: User }) => {
    const dropdownRef = React.useRef<HTMLDivElement>(null);
    const isOpen = activeDropdownId === user.id;

    const handleToggle = () => {
      if (isOpen) {
        setActiveDropdownId(null);
      } else {
        setActiveDropdownId(user.id);
      }
    };

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
          setActiveDropdownId(null);
        }
      };

      if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside);
      }

      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, [isOpen]);

    return (
      <div className="relative" ref={dropdownRef}>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleToggle}
          disabled={!!loadingId}
          className="p-2 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation"
        >
          {loadingId === user.id ? (
            <Loader2 className="w-5 h-5 sm:w-5 sm:h-5 animate-spin text-gray-500" />
          ) : (
            <MoreVertical className="w-5 h-5 sm:w-5 sm:h-5 text-gray-600 hover:text-gray-900" />
          )}
        </motion.button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="absolute right-0 mt-2 w-48 sm:w-56 rounded-xl bg-white shadow-lg ring-1 ring-black ring-opacity-5 backdrop-blur-xl"
              style={{
                zIndex: 10000,
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(0, 0, 0, 0.05)'
              }}
            >
              <div className="py-2">
                {getDropdownItems(user).map((item, index) => (
                  <motion.button
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => {
                      item.onClick();
                      setActiveDropdownId(null);
                    }}
                    disabled={item.disabled}
                    className={`group flex w-full items-center px-3 sm:px-4 py-3 text-sm transition-all duration-200 min-h-[44px] touch-manipulation ${
                      item.disabled 
                        ? 'opacity-50 cursor-not-allowed' 
                        : item.variant === 'danger'
                          ? 'text-red-600 hover:bg-red-50 hover:text-red-700'
                          : item.variant === 'warning'
                            ? 'text-amber-600 hover:bg-amber-50 hover:text-amber-700'
                            : item.variant === 'success'
                              ? 'text-green-600 hover:bg-green-50 hover:text-green-700'
                              : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <div className="mr-3 flex-shrink-0">
                      {item.icon}
                    </div>
                    <span className="truncate">{item.label}</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 px-3 sm:px-4 md:px-6 py-4 sm:py-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="max-w-7xl mx-auto space-y-4 sm:space-y-6"
      >
        {/* Modern Header - Mobile Optimized */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="bg-white/80 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl border border-white/20"
          style={{
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.2)'
          }}
        >
          <div className="flex flex-col gap-4">
            {/* Header Section */}
            <div className="flex items-start sm:items-center gap-3 sm:gap-4">
              <motion.div 
                whileHover={{ scale: 1.1, rotate: 5 }}
                whileTap={{ scale: 0.95 }}
                className="p-3 sm:p-4 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl sm:rounded-2xl shadow-lg flex-shrink-0"
              >
                <Users className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </motion.div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent leading-tight">
                  User Management
                </h1>
                {/* Mobile-friendly badges */}
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-2 sm:mt-3">
                  <Badge className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-2 py-1 text-xs">
                    <UserPlus className="w-3 h-3 mr-1" />
                    {users.length} Total
                  </Badge>
                  <Badge className="bg-gradient-to-r from-green-500 to-green-600 text-white px-2 py-1 text-xs">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    {activeUsers} Active
                  </Badge>
                  <Badge className="bg-gradient-to-r from-red-500 to-red-600 text-white px-2 py-1 text-xs">
                    <XCircle className="w-3 h-3 mr-1" />
                    {inactiveUsers} Inactive
                  </Badge>
                </div>
              </div>
            </div>
            
            {/* Refresh Button - Full Width on Mobile */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="sm:self-end"
            >
              <Button
                variant="outline"
                onClick={refetchUsers}
                disabled={isRefreshing}
                className="w-full sm:w-auto bg-white/50 backdrop-blur border-white/30 hover:bg-white/70 transition-all duration-300 shadow-lg min-h-[44px] px-4 py-2 text-sm font-medium"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span className="truncate">{isRefreshing ? 'Refreshing...' : 'Refresh Users'}</span>
              </Button>
            </motion.div>
          </div>
        </motion.div>

        {/* Modern User Cards - Mobile Optimized */}
        <AnimatePresence>
          <motion.div 
            className="space-y-2 sm:space-y-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            {users.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white/80 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-8 sm:p-12 text-center shadow-2xl border border-white/20"
              >
                <div className="p-4 sm:p-6 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 flex items-center justify-center">
                  <Users className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-700 mb-2">No Users Found</h3>
                <p className="text-sm sm:text-base text-gray-500">There are currently no users in the system.</p>
              </motion.div>
            ) : (
              users.map((user, index) => (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * index, duration: 0.3 }}
                  whileHover={{ y: -1 }}
                  className={`bg-white/90 backdrop-blur-sm rounded-lg sm:rounded-xl p-3 sm:p-4 shadow-md hover:shadow-lg border border-white/30 transition-all duration-200 ${
                    activeDropdownId === user.id ? 'z-50 relative' : ''
                  }`}
                  style={{
                    zIndex: activeDropdownId === user.id ? 1000 : 'auto'
                  }}
                >
                  {/* Compact Horizontal Flex Layout */}
                  <div className="flex items-center gap-3">
                    {/* Compact Avatar */}
                    <motion.div 
                      whileHover={{ scale: 1.05 }}
                      className="flex-shrink-0"
                    >
                      <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-sm">
                        <span className="text-sm sm:text-base font-bold text-white">
                          {(user.name || user.email)?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    </motion.div>

                    {/* User Info - Flexible */}
                    <div className="flex-1 min-w-0">
                      {/* Name and Email Stacked */}
                      <div className="mb-1.5">
                        <h3 className="text-sm sm:text-base font-semibold text-gray-900 truncate leading-none">
                          {user.name || 'No name'}
                        </h3>
                        <p className="text-xs text-gray-500 truncate leading-none mt-0.5">
                          {user.email}
                        </p>
                      </div>
                      
                      {/* Inline Badges */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge className={`text-xs px-1.5 py-0.5 ${getRoleColor(user.role)} shadow-sm`}>
                          {user.role.replace('_', ' ').toUpperCase()}
                        </Badge>
                        <Badge className={`text-xs px-1.5 py-0.5 ${getStatusColor(user.is_active !== false)} shadow-sm flex items-center gap-1`}>
                          {user.is_active === false ? (
                            <>
                              <XCircle className="w-2.5 h-2.5" />
                              <span className="hidden sm:inline">INACTIVE</span>
                              <span className="sm:hidden">OFF</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-2.5 h-2.5" />
                              <span className="hidden sm:inline">ACTIVE</span>
                              <span className="sm:hidden">ON</span>
                            </>
                          )}
                        </Badge>
                      </div>
                    </div>

                    {/* Actions - Right Aligned */}
                    {user.role !== 'owner' && (
                      <div className="flex-shrink-0">
                        <UserDropdown user={user} />
                      </div>
                    )}
                  </div>
                </motion.div>
              ))
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
} 