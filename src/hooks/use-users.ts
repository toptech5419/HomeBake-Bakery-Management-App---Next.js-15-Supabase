"use client";

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  refetchUsersAction, 
  updateUserRoleAction,
  deactivateUserAction, 
  reactivateUserAction,
  deleteUserAction 
} from '@/app/dashboard/users/actions';
import { QUERY_KEYS } from '@/lib/react-query/config';

interface User {
  id: string;
  email?: string;
  role: string;
  name?: string;
  is_active?: boolean;
  created_at: string;
}

interface AuthUser {
  id: string;
  email?: string;
  role: string;
  name?: string;
}

// Extended query keys for users
const USER_QUERY_KEYS = {
  ...QUERY_KEYS,
  users: {
    all: () => ['users', 'all'] as const,
    active: () => ['users', 'active'] as const,
    inactive: () => ['users', 'inactive'] as const,
  }
} as const;

/**
 * Primary users data hook - Single Source of Truth
 */
export function useUsers(currentUser: AuthUser) {
  return useQuery({
    queryKey: USER_QUERY_KEYS.users.all(),
    queryFn: async () => {
      console.log('🔄 Fetching fresh users data...');
      const result = await refetchUsersAction(currentUser);
      
      if (!result.success || !result.users) {
        throw new Error(result.error || 'Failed to fetch users');
      }
      
      // 🚀 PRODUCTION-GRADE: Filter out deleted users from main view
      const activeUsers = (result.users as User[]).filter(user => {
        // Hide users that were soft-deleted (marked with [DELETED] prefix)
        const isDeleted = user.name?.startsWith('[DELETED]');
        const isDeletedByEmail = user.email?.includes('deleted_') && user.email?.includes('@deleted.local');
        
        return !isDeleted && !isDeletedByEmail;
      });
      
      console.log(`✅ Users loaded: ${result.users.length} total, ${activeUsers.length} active (filtered)`);
      return activeUsers;
    },
    staleTime: 0, // Always consider stale - user management needs fresh data
    gcTime: 0, // Don't cache user data - sensitive information
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchOnMount: true,
    retry: (failureCount, error: any) => {
      // Don't retry on auth errors
      if (error?.message?.includes('Insufficient permissions')) {
        return false;
      }
      return failureCount < 2;
    },
    enabled: !!currentUser?.id, // Only run if we have a valid user
  });
}

/**
 * Optimistic user role update mutation
 */
export function useUpdateUserRole(currentUser: AuthUser) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: string }) => {
      return updateUserRoleAction(currentUser, userId, newRole as any);
    },
    
    onMutate: async ({ userId, newRole }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: USER_QUERY_KEYS.users.all() });
      
      // Snapshot previous value
      const previousUsers = queryClient.getQueryData<User[]>(USER_QUERY_KEYS.users.all());
      
      // Optimistically update
      queryClient.setQueryData<User[]>(USER_QUERY_KEYS.users.all(), (old = []) => 
        old.map(user => 
          user.id === userId ? { ...user, role: newRole } : user
        )
      );
      
      return { previousUsers };
    },
    
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousUsers) {
        queryClient.setQueryData(USER_QUERY_KEYS.users.all(), context.previousUsers);
      }
      console.error('Role update failed:', error);
    },
    
    onSettled: () => {
      // Always refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: USER_QUERY_KEYS.users.all() });
    },
  });
}

/**
 * Optimistic user deactivation mutation
 */
export function useDeactivateUser(currentUser: AuthUser) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (userId: string) => {
      return deactivateUserAction(currentUser, userId);
    },
    
    onMutate: async (userId) => {
      await queryClient.cancelQueries({ queryKey: USER_QUERY_KEYS.users.all() });
      
      const previousUsers = queryClient.getQueryData<User[]>(USER_QUERY_KEYS.users.all());
      
      // Optimistically deactivate user
      queryClient.setQueryData<User[]>(USER_QUERY_KEYS.users.all(), (old = []) => 
        old.map(user => 
          user.id === userId ? { ...user, is_active: false } : user
        )
      );
      
      return { previousUsers };
    },
    
    onError: (error, variables, context) => {
      if (context?.previousUsers) {
        queryClient.setQueryData(USER_QUERY_KEYS.users.all(), context.previousUsers);
      }
      console.error('User deactivation failed:', error);
    },
    
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: USER_QUERY_KEYS.users.all() });
    },
  });
}

/**
 * Optimistic user reactivation mutation
 */
export function useReactivateUser(currentUser: AuthUser) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (userId: string) => {
      return reactivateUserAction(currentUser, userId);
    },
    
    onMutate: async (userId) => {
      await queryClient.cancelQueries({ queryKey: USER_QUERY_KEYS.users.all() });
      
      const previousUsers = queryClient.getQueryData<User[]>(USER_QUERY_KEYS.users.all());
      
      // Optimistically reactivate user
      queryClient.setQueryData<User[]>(USER_QUERY_KEYS.users.all(), (old = []) => 
        old.map(user => 
          user.id === userId ? { ...user, is_active: true } : user
        )
      );
      
      return { previousUsers };
    },
    
    onError: (error, variables, context) => {
      if (context?.previousUsers) {
        queryClient.setQueryData(USER_QUERY_KEYS.users.all(), context.previousUsers);
      }
      console.error('User reactivation failed:', error);
    },
    
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: USER_QUERY_KEYS.users.all() });
    },
  });
}

/**
 * Optimistic user deletion mutation - THE CRITICAL FIX
 */
export function useDeleteUser(currentUser: AuthUser) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (userId: string) => {
      return deleteUserAction(currentUser, userId);
    },
    
    onMutate: async (userId) => {
      console.log('🔄 Starting optimistic user deletion:', userId);
      
      await queryClient.cancelQueries({ queryKey: USER_QUERY_KEYS.users.all() });
      
      const previousUsers = queryClient.getQueryData<User[]>(USER_QUERY_KEYS.users.all());
      
      // Find the user to determine deletion type
      const userToDelete = previousUsers?.find(user => user.id === userId);
      
      if (!userToDelete) {
        console.warn('User to delete not found in cache');
        return { previousUsers };
      }
      
      // 🚀 PRODUCTION-GRADE: Immediately remove user from view (better UX)
      // User disappears instantly, providing immediate feedback
      queryClient.setQueryData<User[]>(USER_QUERY_KEYS.users.all(), (old = []) => 
        old.filter(user => user.id !== userId)
      );
      
      console.log('✅ Optimistic deletion applied');
      return { previousUsers, userToDelete };
    },
    
    onSuccess: (result, userId, context) => {
      console.log('✅ User deletion successful:', result);
      // User already removed from view optimistically - no further action needed
      // Audit trail maintained in backend regardless of deletion type
    },
    
    onError: (error, userId, context) => {
      console.error('❌ User deletion failed:', error);
      
      // Rollback optimistic update
      if (context?.previousUsers) {
        queryClient.setQueryData(USER_QUERY_KEYS.users.all(), context.previousUsers);
      }
    },
    
    onSettled: (result, error, userId) => {
      console.log('🔄 Invalidating users cache after deletion');
      
      // Force fresh fetch to ensure 100% accuracy
      queryClient.invalidateQueries({ queryKey: USER_QUERY_KEYS.users.all() });
      
      // Also invalidate any related caches
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          return query.queryKey.some(key => 
            typeof key === 'string' && 
            (key.includes('user') || key.includes('activity') || key.includes('audit'))
          );
        }
      });
    },
  });
}

/**
 * Manual cache refresh for users
 */
export function useRefreshUsers(currentUser: AuthUser) {
  const queryClient = useQueryClient();
  
  const refreshUsers = async () => {
    console.log('🔄 Manual users refresh triggered');
    await queryClient.invalidateQueries({ queryKey: USER_QUERY_KEYS.users.all() });
    return queryClient.refetchQueries({ queryKey: USER_QUERY_KEYS.users.all() });
  };
  
  return { refreshUsers };
}

// Export query keys for external use
export { USER_QUERY_KEYS };