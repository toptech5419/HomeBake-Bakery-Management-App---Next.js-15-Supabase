'use server';

import { createServer } from '@/lib/supabase/server';
import { validateQRInvite, markQRInviteAsUsed } from './qr';
import { z } from 'zod';

const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters long.'),
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters long.'),
  token: z.string(),
});

export async function signup(prevState: { error?: { _form?: string } }, formData: FormData) {
  const result = signupSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!result.success) {
    return {
      error: result.error.flatten().fieldErrors,
    };
  }

  const { name, email, password, token } = result.data;

  try {
    console.log('Starting signup process for:', email);
    
    // Create Supabase client
    const supabase = await createServer();
    
    // Validate the QR invite token
    const invite = await validateQRInvite(token);
    
    console.log('Invite validated successfully for role:', invite.role);
    const role = invite.role as 'manager' | 'sales_rep';

    // Create the user account in Supabase Auth with minimal data
    const { data: { user, session }, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { 
            name,
            role,
          },
        },
    });

    if (signUpError || !user || !session) {
      console.error('Auth user creation failed:', signUpError);
      return { error: { _form: signUpError?.message || 'Failed to create account' } };
    }

    console.log('Auth user created successfully:', user.id);

    // Mark the QR invite as used
    await markQRInviteAsUsed(token);

    // Create user entry in users table
    console.log('Creating users table entry...');
    
    const { error: userInsertError } = await supabase
      .from('users')
      .insert({
        id: user.id,
        email: user.email,
        name,
        role,
        created_by: invite.created_by || null,
        is_active: true,
      });

    if (userInsertError) {
      console.error('Failed to insert user row:', userInsertError);
      // Don't fail the signup, just log the error
      console.warn('User table insert failed, but auth account was created');
    }

    console.log('User profile created successfully');
    
    // Return success state instead of redirecting
    return { success: true, message: 'Account created successfully!' };
  } catch (error) {
    console.error('Signup error:', error);
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('NEXT_PUBLIC_SUPABASE_URL') || error.message.includes('NEXT_PUBLIC_SUPABASE_ANON_KEY')) {
        return { error: { _form: 'Database connection not configured. Please contact support.' } };
      }
      if (error.message.includes('Invalid or expired QR invite')) {
        return { error: { _form: 'Invalid or expired invitation link. Please request a new one.' } };
      }
      if (error.message.includes('QR invite has expired')) {
        return { error: { _form: 'This invitation link has expired. Please request a new one.' } };
      }
    }
    
    return { error: { _form: 'An unexpected error occurred during signup. Please try again.' } };
  }
}

export async function signupWithToken(token: string, formData: FormData) {
  try {
    const supabase = await createServer();
    
    // Validate the QR invite token
    const invite = await validateQRInvite(token);
    
    // Extract form data
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const name = formData.get('name') as string;
    
    if (!email || !password || !name) {
      throw new Error('Missing required fields');
    }

    // Create the user account
    const { data: { user }, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          role: invite.role,
        },
      },
    });

    if (signUpError || !user) {
      throw new Error(signUpError?.message || 'Failed to create account');
    }

    // Mark the QR invite as used
    await markQRInviteAsUsed(token);

    // Create user entry in users table
    console.log('Creating users table entry...');
    
    const { error: userInsertError } = await supabase
      .from('users')
      .insert({
        id: user.id,
        email: user.email,
        name,
        role: invite.role,
        created_by: invite.created_by || null,
        is_active: true,
      });

    if (userInsertError) {
      console.warn('User table insert failed, but auth account was created');
    }

    return { success: true, user };
  } catch (error) {
    console.error('Signup with token error:', error);
    throw error;
  }
} 