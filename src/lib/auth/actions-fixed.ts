'use server'

import { createServer } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { UserRole } from '@/types'
import { logLoginActivity } from '@/lib/activities/server-activity-service'

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

  let authData;
  try {
    const authResult = await supabase.auth.signInWithPassword(data);
    
    if (authResult.error) {
      console.error('Auth error:', authResult.error);
      
      // Provide specific error messages based on error type
      switch (authResult.error.message) {
        case 'Invalid login credentials':
          return { error: 'Invalid email or password. Please check your credentials and try again.' };
        case 'Email not confirmed':
          return { error: 'Please check your email and click the confirmation link before logging in.' };
        case 'Too many requests':
          return { error: 'Too many login attempts. Please wait a few minutes and try again.' };
        default:
          return { error: authResult.error.message || 'Authentication failed. Please try again.' };
      }
    }

    if (!authResult.data?.user) {
      return { error: 'Authentication failed. Please try again.' };
    }

    authData = authResult.data;
  } catch (error) {
    console.error('Login error:', error);
    
    // Handle specific network errors
    if (error instanceof Error) {
      if (error.message.includes('fetch failed') || error.message.includes('UND_ERR_')) {
        return { error: 'Network connection failed. Please check your internet connection and try again.' };
      }
      if (error.message.includes('timeout')) {
        return { error: 'Connection timeout. Please try again.' };
      }
      if (error.name === 'AbortError') {
        return { error: 'Request was cancelled. Please try again.' };
      }
    }
    
    return { error: 'Connection failed. Please check your internet connection and try again.' };
  }

  // Get user role from database - SEPARATE from redirect logic to avoid NEXT_REDIRECT errors
  let userRole: UserRole = 'sales_rep';
  let displayName = authData.user.email?.split('@')[0] || 'User';

  try {
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
          // First user gets owner role
          userRole = 'owner';
          displayName = authData.user.email?.split('@')[0] || 'Owner';
          
          // Create owner profile
          await supabase
            .from('users')
            .insert({
              id: authData.user.id,
              email: authData.user.email!,
              name: displayName,
              role: 'owner',
              is_active: true
            });
        } else {
          return { error: 'User profile not found. Please contact your bakery owner for access.' }
        }
      } else {
        console.error('Profile fetch error:', profileError);
        return { error: 'Failed to verify user account. Please try again.' }
      }
    } else if (profile) {
      userRole = profile.role as UserRole;
      displayName = profile.name || displayName;
    }

    // Log login activity for non-owners
    if (userRole !== 'owner') {
      try {
        await logLoginActivity({
          user_id: authData.user.id,
          user_name: displayName,
          user_role: userRole as 'manager' | 'sales_rep'
        });
      } catch (activityError) {
        // Don't fail login if activity logging fails
        console.error('Failed to log login activity:', activityError);
      }
    }

  } catch (error: unknown) {
    console.error('Setup error:', error);
    return { error: 'Failed to set up user account. Please contact support.' }
  }

  // IMPORTANT: Role-based redirect OUTSIDE of try-catch to avoid NEXT_REDIRECT errors
  // This allows Next.js redirect errors to bubble up properly
  switch (userRole) {
    case 'owner':
      redirect('/owner-dashboard')
    case 'manager':
      redirect('/dashboard/manager')
    case 'sales_rep':
    default:
      redirect('/dashboard/sales')
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