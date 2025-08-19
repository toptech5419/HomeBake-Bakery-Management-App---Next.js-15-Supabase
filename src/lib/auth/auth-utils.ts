'use server';

import { createServer, createServiceRoleClient } from '@/lib/supabase/server';
import { cache } from 'react';
import type { UserRole } from '@/types';

export interface AuthUser {
  id: string;
  email: string | null;
  name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

/**
 * Get authenticated user with role - cached for performance
 * This is the SINGLE SOURCE OF TRUTH for user authentication
 */
export const getAuthenticatedUser = cache(async (): Promise<AuthUser | null> => {
  try {
    const supabase = await createServer();
    
    // Get authenticated user from session
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !authUser) {
      return null;
    }
    
    // Get user profile from database (authoritative source)
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('id, email, name, role, is_active, created_at')
      .eq('id', authUser.id)
      .eq('is_active', true)
      .single();
    
    if (profileError || !userProfile) {
      // Fallback to auth metadata if database profile doesn't exist
      const metadata = authUser.user_metadata;
      
      if (!metadata?.role || !metadata?.name) {
        console.warn(`User ${authUser.id} has no profile in database and insufficient metadata`);
        return null;
      }
      
      return {
        id: authUser.id,
        email: authUser.email,
        name: metadata.name,
        role: metadata.role as UserRole,
        is_active: true,
        created_at: authUser.created_at
      };
    }
    
    return {
      id: userProfile.id,
      email: userProfile.email,
      name: userProfile.name,
      role: userProfile.role as UserRole,
      is_active: userProfile.is_active,
      created_at: userProfile.created_at
    };
    
  } catch (error) {
    console.error('Error getting authenticated user:', error);
    return null;
  }
});

/**
 * Check if user has specific role
 */
export async function hasRole(requiredRole: UserRole | UserRole[]): Promise<boolean> {
  const user = await getAuthenticatedUser();
  
  if (!user || !user.is_active) {
    return false;
  }
  
  if (Array.isArray(requiredRole)) {
    return requiredRole.includes(user.role);
  }
  
  return user.role === requiredRole;
}

/**
 * Check if user is owner
 */
export async function isOwner(): Promise<boolean> {
  return hasRole('owner');
}

/**
 * Check if user is manager or above
 */
export async function isManagerOrAbove(): Promise<boolean> {
  return hasRole(['owner', 'manager']);
}

/**
 * Get user role only (lightweight)
 */
export const getUserRole = cache(async (): Promise<UserRole | null> => {
  const user = await getAuthenticatedUser();
  return user?.role || null;
});

/**
 * Ensure user is authenticated and has required role
 * Throws error if not authorized
 */
export async function requireAuth(requiredRole?: UserRole | UserRole[]): Promise<AuthUser> {
  const user = await getAuthenticatedUser();
  
  if (!user) {
    throw new Error('Authentication required');
  }
  
  if (!user.is_active) {
    throw new Error('Account is inactive');
  }
  
  if (requiredRole) {
    const authorized = Array.isArray(requiredRole) 
      ? requiredRole.includes(user.role)
      : user.role === requiredRole;
      
    if (!authorized) {
      throw new Error(`Access denied. Required role: ${Array.isArray(requiredRole) ? requiredRole.join(' or ') : requiredRole}`);
    }
  }
  
  return user;
}

/**
 * Get user by ID (admin function)
 */
export async function getUserById(userId: string): Promise<AuthUser | null> {
  try {
    // Ensure caller is authorized
    await requireAuth(['owner', 'manager']);
    
    const serviceSupabase = createServiceRoleClient();
    
    const { data: user, error } = await serviceSupabase
      .from('users')
      .select('id, email, name, role, is_active, created_at')
      .eq('id', userId)
      .single();
    
    if (error || !user) {
      return null;
    }
    
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as UserRole,
      is_active: user.is_active,
      created_at: user.created_at
    };
    
  } catch (error) {
    console.error('Error getting user by ID:', error);
    return null;
  }
}

/**
 * Update user role (owner only)
 */
export async function updateUserRole(userId: string, newRole: UserRole): Promise<{ success: boolean; error?: string }> {
  try {
    // Ensure caller is owner
    await requireAuth('owner');
    
    const serviceSupabase = createServiceRoleClient();
    
    // Update in both tables for consistency
    const [usersUpdate, profilesUpdate] = await Promise.all([
      serviceSupabase
        .from('users')
        .update({ role: newRole, updated_at: new Date().toISOString() })
        .eq('id', userId),
      serviceSupabase
        .from('profiles')
        .update({ role: newRole, updated_at: new Date().toISOString() })
        .eq('id', userId)
    ]);
    
    if (usersUpdate.error) {
      throw new Error(`Failed to update users table: ${usersUpdate.error.message}`);
    }
    
    if (profilesUpdate.error) {
      console.warn('Failed to update profiles table:', profilesUpdate.error);
    }
    
    return { success: true };
    
  } catch (error) {
    console.error('Error updating user role:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to update role' 
    };
  }
}

/**
 * Deactivate user (soft delete)
 */
export async function deactivateUser(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Ensure caller is owner
    await requireAuth('owner');
    
    const serviceSupabase = createServiceRoleClient();
    
    // Update both tables
    const [usersUpdate, profilesUpdate] = await Promise.all([
      serviceSupabase
        .from('users')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', userId),
      serviceSupabase
        .from('profiles')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', userId)
    ]);
    
    if (usersUpdate.error) {
      throw new Error(`Failed to deactivate user: ${usersUpdate.error.message}`);
    }
    
    return { success: true };
    
  } catch (error) {
    console.error('Error deactivating user:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to deactivate user' 
    };
  }
}

/**
 * Get all users (admin function)
 */
export async function getAllUsers(): Promise<AuthUser[]> {
  try {
    // Ensure caller is authorized
    await requireAuth(['owner', 'manager']);
    
    const serviceSupabase = createServiceRoleClient();
    
    const { data: users, error } = await serviceSupabase
      .from('users')
      .select('id, email, name, role, is_active, created_at')
      .order('created_at', { ascending: false });
    
    if (error) {
      throw new Error(`Failed to fetch users: ${error.message}`);
    }
    
    return users.map(user => ({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as UserRole,
      is_active: user.is_active,
      created_at: user.created_at
    }));
    
  } catch (error) {
    console.error('Error getting all users:', error);
    return [];
  }
}