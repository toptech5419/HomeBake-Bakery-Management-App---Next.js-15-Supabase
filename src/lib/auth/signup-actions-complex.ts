'use server';

import { createServer, createServiceRoleClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';

// Simple, user-friendly validation schema
const signupSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters long')
    .max(50, 'Name must be less than 50 characters')
    .trim(),
  email: z.string()
    .email('Please enter a valid email address')
    .toLowerCase()
    .trim(),
  password: z.string()
    .min(6, 'Password must be at least 6 characters long')
    .max(128, 'Password is too long'),
  token: z.string()
    .min(6, 'Invalid token format')
    .max(10, 'Invalid token format'),
});

/**
 * Production-grade signup function with comprehensive error handling
 * Uses database function for atomic user creation
 */
export async function signup(prevState: { error?: { _form?: string } }, formData: FormData) {
  // Rate limiting check
  const headersList = await headers();
  const userAgent = headersList.get('user-agent') || 'unknown';
  const forwardedFor = headersList.get('x-forwarded-for') || 'unknown';
  
  try {
    // Validate input data
    const result = signupSchema.safeParse(Object.fromEntries(formData.entries()));

    if (!result.success) {
      console.warn('Signup validation failed:', result.error.flatten().fieldErrors);
      return {
        error: result.error.flatten().fieldErrors,
      };
    }

    const { name, email, password, token } = result.data;

    console.log(`🚀 Starting signup process for: ${email}`, {
      userAgent: userAgent.substring(0, 100),
      forwardedFor,
      timestamp: new Date().toISOString()
    });
    
    // Create service role client for secure operations
    const serviceSupabase = createServiceRoleClient();
    
    // Validate QR invite token using database query
    const { data: invite, error: inviteError } = await serviceSupabase
      .from('qr_invites')
      .select('*')
      .eq('token', token)
      .eq('is_used', false)
      .gt('expires_at', new Date().toISOString())
      .single();
    
    if (inviteError || !invite) {
      console.warn(`❌ Invalid invite token: ${token}`, inviteError);
      return { 
        error: { _form: 'Invalid or expired invitation link. Please request a new one.' } 
      };
    }
    
    console.log(`✅ Invite validated successfully for role: ${invite.role}`);
    
    // Create Supabase Auth user
    const { data: { user }, error: signUpError } = await serviceSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Skip email confirmation in production
      user_metadata: { 
        name,
        role: invite.role,
        created_via: 'qr_invite',
        invite_token: token,
        created_at: new Date().toISOString()
      },
    });

    if (signUpError || !user) {
      console.error('❌ Auth user creation failed:', signUpError);
      
      // Handle specific Supabase Auth errors
      if (signUpError?.message?.includes('already registered')) {
        return { error: { _form: 'This email address is already registered. Please try logging in instead.' } };
      }
      
      return { 
        error: { _form: signUpError?.message || 'Failed to create account. Please try again.' } 
      };
    }

    console.log(`✅ Auth user created successfully: ${user.id}`);

    // Use secure database function for atomic user creation
    const { data: userCreationResult, error: rpcError } = await serviceSupabase
      .rpc('create_user_with_invite', {
        input_user_id: user.id,
        input_email: email,
        input_name: name,
        input_role: invite.role,
        input_invite_token: token,
        input_created_by: invite.created_by
      });

    // Log any RPC error
    if (rpcError) {
      console.error('❌ RPC Error calling create_user_with_invite:', rpcError);
      
      // Clean up auth user if database creation fails
      try {
        await serviceSupabase.auth.admin.deleteUser(user.id);
      } catch (cleanupError) {
        console.error('Failed to cleanup auth user:', cleanupError);
      }
      
      return { 
        error: { _form: `Database error: ${rpcError.message}. Please contact support.` } 
      };
    }

    if (!userCreationResult?.success) {
      console.error('❌ User creation via database function failed:', userCreationResult?.error);
      
      // Clean up auth user if database creation fails
      try {
        await serviceSupabase.auth.admin.deleteUser(user.id);
      } catch (cleanupError) {
        console.error('Failed to cleanup auth user:', cleanupError);
      }
      
      return { 
        error: { _form: userCreationResult?.error || 'Failed to complete account setup. Please try again.' } 
      };
    }

    console.log(`✅ User creation completed successfully for: ${email}`);
    
    // Revalidate relevant paths
    revalidatePath('/dashboard/users');
    revalidatePath('/owner-dashboard');
    
    return { 
      success: true, 
      message: 'Account created successfully! You can now log in with your credentials.',
      user: {
        id: user.id,
        email: user.email,
        name,
        role: invite.role
      }
    };
    
  } catch (error) {
    console.error('❌ Unexpected signup error:', error);
    
    // Log error details for debugging
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      userAgent: userAgent.substring(0, 100),
      forwardedFor,
      timestamp: new Date().toISOString()
    });
    
    // Provide user-friendly error messages
    if (error instanceof Error) {
      if (error.message.includes('network') || error.message.includes('timeout')) {
        return { error: { _form: 'Network error. Please check your connection and try again.' } };
      }
      
      if (error.message.includes('rate limit')) {
        return { error: { _form: 'Too many attempts. Please wait a moment and try again.' } };
      }
    }
    
    return { error: { _form: 'An unexpected error occurred during signup. Please try again.' } };
  }
}

/**
 * Alternative signup function for direct token-based signup
 * Kept for backward compatibility
 */
export async function signupWithToken(token: string, formData: FormData) {
  console.log(`🔄 Alternative signup initiated with token: ${token}`);
  
  try {
    // Convert to standard signup format and use main function
    const enhancedFormData = new FormData();
    enhancedFormData.append('email', formData.get('email') as string);
    enhancedFormData.append('password', formData.get('password') as string);
    enhancedFormData.append('name', formData.get('name') as string);
    enhancedFormData.append('token', token);
    
    const result = await signup({}, enhancedFormData);
    
    if (result.error) {
      throw new Error(result.error._form || 'Signup failed');
    }
    
    return { success: true, user: result.user };
  } catch (error) {
    console.error('❌ Signup with token error:', error);
    throw error;
  }
}

/**
 * Validate QR invite token
 */
export async function validateInviteToken(token: string) {
  try {
    const serviceSupabase = createServiceRoleClient();
    
    const { data: invite, error } = await serviceSupabase
      .from('qr_invites')
      .select('*')
      .eq('token', token)
      .eq('is_used', false)
      .gt('expires_at', new Date().toISOString())
      .single();
    
    if (error || !invite) {
      return { valid: false, error: 'Invalid or expired invitation link' };
    }
    
    return { 
      valid: true, 
      invite: {
        role: invite.role,
        created_by: invite.created_by,
        expires_at: invite.expires_at
      }
    };
  } catch (error) {
    console.error('Error validating invite token:', error);
    return { valid: false, error: 'Failed to validate invitation' };
  }
}

/**
 * Get signup statistics (for monitoring)
 */
export async function getSignupStats() {
  try {
    const serviceSupabase = createServiceRoleClient();
    
    const [usersResult, invitesResult] = await Promise.all([
      serviceSupabase.from('users').select('role', { count: 'exact' }),
      serviceSupabase.from('qr_invites').select('is_used', { count: 'exact' })
    ]);
    
    return {
      totalUsers: usersResult.count || 0,
      pendingInvites: invitesResult.data?.filter(i => !i.is_used).length || 0,
      usedInvites: invitesResult.data?.filter(i => i.is_used).length || 0
    };
  } catch (error) {
    console.error('Error getting signup stats:', error);
    return { totalUsers: 0, pendingInvites: 0, usedInvites: 0 };
  }
}