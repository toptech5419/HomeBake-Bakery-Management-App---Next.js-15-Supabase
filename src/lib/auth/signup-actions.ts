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
 * Simple signup function without complex database functions
 * Direct table operations for reliability
 */
export async function signup(prevState: { error?: { _form?: string } }, formData: FormData) {
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

    console.log(`🚀 Starting simple signup process for: ${email}`);
    
    // Create service role client for secure operations
    const serviceSupabase = createServiceRoleClient();
    
    // Validate QR invite token
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
      email_confirm: true,
      user_metadata: { 
        name,
        role: invite.role,
        created_via: 'qr_invite',
        invite_token: token
      },
    });

    if (signUpError || !user) {
      console.error('❌ Auth user creation failed:', signUpError);
      
      if (signUpError?.message?.includes('already registered')) {
        return { error: { _form: 'This email address is already registered. Please try logging in instead.' } };
      }
      
      return { 
        error: { _form: signUpError?.message || 'Failed to create account. Please try again.' } 
      };
    }

    console.log(`✅ Auth user created successfully: ${user.id}`);

    // Create user record using atomic function
    const { data: createdUser, error: userInsertError } = await serviceSupabase
      .rpc('create_user_atomic', {
        input_user_id: user.id,
        input_email: user.email,
        input_name: name,
        input_role: invite.role,
        input_created_by: invite.created_by
      });

    if (userInsertError || !createdUser) {
      console.error('❌ User creation failed:', userInsertError);
      
      // Clean up auth user
      try {
        await serviceSupabase.auth.admin.deleteUser(user.id);
      } catch (cleanupError) {
        console.error('Failed to cleanup auth user:', cleanupError);
      }
      
      return { 
        error: { _form: `Failed to create user profile: ${userInsertError?.message || 'Unknown error'}` }
      };
    }

    console.log('✅ User and profile records created successfully');

    // Mark invite as used
    const { error: updateInviteError } = await serviceSupabase
      .from('qr_invites')
      .update({ is_used: true })
      .eq('token', token);

    if (updateInviteError) {
      console.warn('⚠️ Failed to mark invite as used:', updateInviteError);
      // Don't fail signup for this
    } else {
      console.log('✅ Marked invite token as used');
    }

    // Log activity
    try {
      await serviceSupabase
        .from('activities')
        .insert({
          user_id: user.id,
          user_name: name,
          user_role: invite.role === 'owner' ? 'manager' : invite.role, // Activities constraint
          activity_type: 'created',
          message: `Account created for ${name} with role ${invite.role}`,
          metadata: {
            invite_token: token,
            created_by: invite.created_by,
            signup_timestamp: new Date().toISOString()
          },
          created_at: new Date().toISOString()
        });
      console.log('✅ Activity logged successfully');
    } catch (activityError) {
      console.warn('⚠️ Failed to log activity (non-critical):', activityError);
    }

    console.log(`✅ Signup completed successfully for: ${email}`);
    
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
    
    return { 
      error: { _form: `Unexpected error: ${error instanceof Error ? error.message : 'Please try again.'}` }
    };
  }
}

/**
 * Alternative signup function for direct token-based signup
 */
export async function signupWithToken(token: string, formData: FormData) {
  console.log(`🔄 Alternative signup initiated with token: ${token}`);
  
  try {
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