'use server'

import { createServer } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { canViewUsers, User } from './rbac'
import { UserRole } from '@/types'

export async function login(prevState: { error?: string }, formData: FormData) {
  const supabase = await createServer()
  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  // Validate input
  if (!data.email || !data.password) {
    return { error: 'Email and password are required.' }
  }

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword(data)

  if (authError) {
    return { error: authError.message }
  }

  if (!authData.user) {
    return { error: 'Authentication failed. Please try again.' }
  }

  // Fetch user profile from users table
  let userRole: UserRole = 'sales_rep'; // Default role
  let displayName = authData.user.email?.split('@')[0] || 'User';

  try {
    // First try to get from user metadata (faster)
    if (authData.user.user_metadata?.role) {
      userRole = authData.user.user_metadata.role as UserRole;
      displayName = authData.user.user_metadata.name || displayName;
    } else {
      // Fetch from users table
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('role, name')
        .eq('id', authData.user.id)
        .single();

      if (profileError) {
        // If no profile exists, check if this is the first user (owner)
        if (profileError.code === 'PGRST116') {
          const { count } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true });

          if (count === 0 || count === null) {
            // First user gets owner role - trigger will handle creation
            userRole = 'owner';
            displayName = authData.user.email?.split('@')[0] || 'Owner';
          } else {
            return { error: 'User profile not found. Please contact your bakery owner for access.' }
          }
        } else {
          return { error: 'Failed to verify user account. Please try again.' }
        }
      } else {
        userRole = profile?.role as UserRole || 'sales_rep';
        displayName = profile?.name || displayName;
      }
    }

    // Update user metadata to cache role for future requests
    await supabase.auth.updateUser({
      data: { 
        role: userRole,
        name: displayName
      }
    });

  } catch (error) {
    return { error: 'Failed to set up user account. Please contact support.' }
  }

  // Role-based redirect
  switch (userRole) {
    case 'owner':
      redirect('/dashboard/owner')
    case 'manager':
      redirect('/dashboard/manager')
    case 'sales_rep':
    default:
      redirect('/dashboard')
  }
}

export async function logout() {
  const supabase = await createServer()
  await supabase.auth.signOut()
  return redirect('/login')
}

export async function logoutWithoutRedirect() {
  const supabase = await createServer()
  const { error } = await supabase.auth.signOut()
  return { error }
}

// Get current user function
export async function getCurrentUser() {
  const supabase = await createServer()
  
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    return null
  }

  // Get user profile from users table
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profileError) {
    return null
  }

  return {
    ...user,
    profile
  }
}

// getUsers function moved to user-actions.ts to avoid duplication 